BEGIN;

-- 1. Create Account Deletion State Machine
CREATE TYPE public.deletion_status AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.deletion_status NOT NULL DEFAULT 'REQUESTED',
    error_details TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deletion request" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion request" ON public.account_deletion_requests 
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (implicitly bypasses RLS)

-- 2. Update process_account_deletion to also set is_banned = true
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
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
REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID) TO service_role;

COMMIT;
