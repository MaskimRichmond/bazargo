-- ==========================================
-- STAGE 4 (SECURITY P0): ORDER RESERVATION EXPIRATION
-- ==========================================

-- 1. Add EXPIRED to order_status enum
-- Safe to do in modern Postgres inside transaction
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'EXPIRED';

-- 2. Add expires_at to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Backfill existing PENDING orders with a 24h TTL from their creation date
UPDATE public.orders 
SET expires_at = created_at + INTERVAL '24 hours' 
WHERE status = 'PENDING' AND expires_at IS NULL;

-- 3. Create DB-Level Protection Trigger
-- Prevent arbitrary status manipulation directly from the client API.
-- Only official RPCs (which run as SECURITY DEFINER owned by postgres/supabase_admin) 
-- or service_role can change order status or financial data.
CREATE OR REPLACE FUNCTION public.protect_order_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_service_role BOOLEAN := FALSE;
BEGIN
    -- Check if running as service_role OR inside a SECURITY DEFINER function owned by superuser
    IF current_setting('role', true) = 'service_role' 
       OR current_user = 'postgres' 
       OR current_user = 'supabase_admin' THEN
        v_is_service_role := TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        -- Block status manipulation
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Order status can only be changed via official actions';
        END IF;

        -- Block financial/participant manipulation
        IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
            RAISE EXCEPTION 'Cannot modify total amount of an order';
        END IF;

        IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
            RAISE EXCEPTION 'Cannot modify order participants';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_order_integrity ON public.orders;
CREATE TRIGGER tr_protect_order_integrity
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE PROCEDURE public.protect_order_integrity();

-- 4. Create the Server-Side Atomic Expiration RPC
CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_expired_count INTEGER := 0;
    v_order RECORD;
BEGIN
    -- We select all PENDING orders that have exceeded their TTL.
    -- FOR UPDATE SKIP LOCKED ensures that concurrent executions of this cron/RPC 
    -- don't block each other and don't double-expire rows (exactly-once semantics).
    FOR v_order IN 
        SELECT id FROM public.orders 
        WHERE status = 'PENDING' 
        AND expires_at IS NOT NULL 
        AND expires_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Transition to EXPIRED.
        -- Because the soft-reservation view `create_orders_from_cart()` strictly checks 
        -- `status IN ('PENDING', 'CONFIRMED')`, changing status to EXPIRED
        -- atomically drops the inventory reservation without manually manipulating listing quantities.
        UPDATE public.orders 
        SET status = 'EXPIRED', 
            updated_at = NOW()
        WHERE id = v_order.id;
        
        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$;

-- Secure the RPC (only callable by server/cron, not anonymous or authenticated users)
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM authenticated;

-- Allow service_role to execute it
-- NOTE: In Supabase, you can grant to service_role safely.
-- However, if pg_cron calls it, it usually runs as postgres. 
-- The function is owned by postgres and executable by it since they own it.
GRANT EXECUTE ON FUNCTION public.expire_pending_orders() TO service_role;

-- 5. Enable pg_cron and Schedule (if supported in the environment)
DO $$
BEGIN
    -- Attempt to create extension if possible
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Schedule to run every 15 minutes
    PERFORM cron.schedule('expire_pending_orders_job', '*/15 * * * *', 'SELECT public.expire_pending_orders();');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available or schedule failed. Expiration must be triggered via Vercel Cron calling the RPC as service_role.';
END;
$$;
