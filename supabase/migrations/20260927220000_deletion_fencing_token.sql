BEGIN;

-- 1. Add fencing token to state machine
ALTER TABLE public.account_deletion_requests ADD COLUMN IF NOT EXISTS fencing_token UUID;

-- 2. Update acquire_deletion_lock to generate and return fencing token
CREATE OR REPLACE FUNCTION public.acquire_deletion_lock(p_user_id UUID)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req public.account_deletion_requests;
    v_timeout_threshold TIMESTAMPTZ := now() - interval '5 minutes';
    v_new_token UUID := gen_random_uuid();
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

        -- Update to PROCESSING with new fencing token
        UPDATE public.account_deletion_requests
        SET status = 'PROCESSING',
            started_at = now(),
            error_details = NULL,
            fencing_token = v_new_token
        WHERE user_id = p_user_id
        RETURNING * INTO v_req;
    ELSE
        -- Insert new request with fencing token
        INSERT INTO public.account_deletion_requests (user_id, status, started_at, fencing_token)
        VALUES (p_user_id, 'PROCESSING', now(), v_new_token)
        RETURNING * INTO v_req;
    END IF;

    RETURN v_req;
END;
$$;

-- 3. Update process_account_deletion to require fencing token
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID, p_fencing_token UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
    v_current_token UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
    END IF;
    
    -- Fencing Token Check
    SELECT fencing_token INTO v_current_token 
    FROM public.account_deletion_requests 
    WHERE user_id = p_user_id;

    IF v_current_token IS DISTINCT FROM p_fencing_token THEN
        RAISE EXCEPTION 'Fencing token mismatch or lock lost';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'process_account_deletion: user not found';
    END IF;
    
    v_anon_name := 'Deleted User ' || substring(p_user_id::text from 1 for 5);
    
    -- Anonymize and ban profile
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'::public.user_role,
        is_banned = true,
        ban_reason = 'Account deleted by user',
        banned_at = now()
    WHERE id = p_user_id;
    
    UPDATE public.listings SET status = 'DEACTIVATED'::public.listing_status WHERE seller_id = p_user_id AND status != 'DEACTIVATED'::public.listing_status;
    
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;

-- 4. Apply enforce_banned_user_block to remaining mutable tables
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_chats ON public.chats;
CREATE TRIGGER tr_enforce_banned_user_block_chats
    BEFORE INSERT OR UPDATE OR DELETE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_reports ON public.reports;
CREATE TRIGGER tr_enforce_banned_user_block_reports
    BEFORE INSERT OR UPDATE OR DELETE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_requests ON public.requests;
CREATE TRIGGER tr_enforce_banned_user_block_requests
    BEFORE INSERT OR UPDATE OR DELETE ON public.requests
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_request_offers ON public.request_offers;
CREATE TRIGGER tr_enforce_banned_user_block_request_offers
    BEFORE INSERT OR UPDATE OR DELETE ON public.request_offers
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_favorites ON public.favorites;
CREATE TRIGGER tr_enforce_banned_user_block_favorites
    BEFORE INSERT OR UPDATE OR DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_follows ON public.follows;
CREATE TRIGGER tr_enforce_banned_user_block_follows
    BEFORE INSERT OR UPDATE OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();
    
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_cart_items ON public.cart_items;
CREATE TRIGGER tr_enforce_banned_user_block_cart_items
    BEFORE INSERT OR UPDATE OR DELETE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

COMMIT;
