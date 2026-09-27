BEGIN;

-- 1. Atomic State Machine Lock RPC
CREATE OR REPLACE FUNCTION public.acquire_deletion_lock(p_user_id UUID)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req public.account_deletion_requests;
    v_timeout_threshold TIMESTAMPTZ := now() - interval '5 minutes';
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'acquire_deletion_lock: only callable via service_role';
    END IF;

    -- Lock the row if it exists
    SELECT * INTO v_req 
    FROM public.account_deletion_requests 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF FOUND THEN
        IF v_req.status = 'COMPLETED' THEN
            RAISE EXCEPTION 'Account deletion already completed';
        END IF;

        IF v_req.status = 'PROCESSING' AND v_req.started_at >= v_timeout_threshold THEN
            RAISE EXCEPTION 'Account deletion is already in progress';
        END IF;

        -- Update to PROCESSING
        UPDATE public.account_deletion_requests
        SET status = 'PROCESSING',
            started_at = now(),
            error_details = NULL
        WHERE user_id = p_user_id
        RETURNING * INTO v_req;
    ELSE
        -- Insert new request
        INSERT INTO public.account_deletion_requests (user_id, status, started_at)
        VALUES (p_user_id, 'PROCESSING', now())
        RETURNING * INTO v_req;
    END IF;

    RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_deletion_lock(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_deletion_lock(UUID) TO service_role;

-- 2. Global Banned User Block Trigger (Mitigates 1-hour JWT window)
CREATE OR REPLACE FUNCTION public.enforce_banned_user_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
    v_is_banned BOOLEAN;
BEGIN
    -- We only block actions initiated by actual authenticated users via REST API
    v_uid := auth.uid();
    
    IF v_uid IS NOT NULL AND current_setting('role', true) = 'authenticated' THEN
        SELECT is_banned INTO v_is_banned FROM public.profiles WHERE id = v_uid;
        IF v_is_banned THEN
            RAISE EXCEPTION 'Action not allowed for banned or deleted users.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply to critical tables where deleted/banned users should not be able to mutate data
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_listings ON public.listings;
CREATE TRIGGER tr_enforce_banned_user_block_listings
    BEFORE INSERT OR UPDATE OR DELETE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_messages ON public.messages;
CREATE TRIGGER tr_enforce_banned_user_block_messages
    BEFORE INSERT OR UPDATE OR DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_orders ON public.orders;
CREATE TRIGGER tr_enforce_banned_user_block_orders
    BEFORE INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_stores ON public.stores;
CREATE TRIGGER tr_enforce_banned_user_block_stores
    BEFORE INSERT OR UPDATE OR DELETE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

COMMIT;
