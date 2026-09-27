BEGIN;

-- ===========================================
-- ADMIN SECURITY REMEDIATION MIGRATION
-- ===========================================

-- 1. Fix cleanup_user_storage: proper auth, no error suppression, correct grants
CREATE OR REPLACE FUNCTION public.cleanup_user_storage(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := current_setting('role', true);
    
    -- Only service_role (called from trusted Server Action) can invoke this
    IF v_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'cleanup_user_storage: only callable via service_role';
    END IF;
    
    -- Delete all storage objects owned by this user
    DELETE FROM storage.objects WHERE owner = uid;
END;
$$;

-- Revoke from ALL roles first, then grant only to service_role
REVOKE ALL ON FUNCTION public.cleanup_user_storage(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_user_storage(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_user_storage(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) TO service_role;


-- 2. Atomic admin mutation RPCs
-- Each RPC: validates caller role, performs mutation + audit in one transaction

-- 2a. admin_block_user
CREATE OR REPLACE FUNCTION public.admin_block_user(
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_target_role TEXT;
    v_audit_id UUID;
BEGIN
    -- Must be called via service_role from trusted server action
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_block_user: only callable via service_role';
    END IF;
    
    -- actor_id is passed via Supabase RPC headers (not from client param)
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: no authenticated actor';
    END IF;
    
    -- Get actor role
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_block_user: insufficient privileges (role: %)', COALESCE(v_actor_role, 'NULL');
    END IF;
    
    -- Get target role and check existence
    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: target user not found';
    END IF;
    
    -- Prevent banning SUPER_ADMIN unless caller is SUPER_ADMIN
    IF v_target_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'admin_block_user: cannot ban SUPER_ADMIN';
    END IF;
    
    -- Perform mutation
    UPDATE public.profiles
    SET is_banned = true,
        ban_reason = p_reason,
        banned_at = now()
    WHERE id = p_target_user_id AND (is_banned IS DISTINCT FROM true);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_block_user: user already banned or update failed';
    END IF;
    
    -- Atomic audit log
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (v_actor_id, 'BLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_block_user(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_block_user(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_block_user(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user(UUID, TEXT) TO service_role;


-- 2b. admin_unblock_user
CREATE OR REPLACE FUNCTION public.admin_unblock_user(
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_unblock_user: only callable via service_role';
    END IF;
    
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_unblock_user: no authenticated actor';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_unblock_user: insufficient privileges';
    END IF;
    
    UPDATE public.profiles
    SET is_banned = false, ban_reason = NULL, banned_at = NULL
    WHERE id = p_target_user_id AND is_banned = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_unblock_user: user not banned or not found';
    END IF;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (v_actor_id, 'UNBLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user(UUID, TEXT) TO service_role;


-- 2c. admin_moderate_listing
CREATE OR REPLACE FUNCTION public.admin_moderate_listing(
    p_listing_id UUID,
    p_new_status TEXT,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_old_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_moderate_listing: only callable via service_role';
    END IF;
    
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: no authenticated actor';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_moderate_listing: insufficient privileges';
    END IF;
    
    -- Validate target
    SELECT status::text INTO v_old_status FROM public.listings WHERE id = p_listing_id;
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing not found';
    END IF;
    
    -- Validate allowed status values
    IF p_new_status NOT IN ('ACTIVE', 'DEACTIVATED', 'BLOCKED') THEN
        RAISE EXCEPTION 'admin_moderate_listing: invalid status %', p_new_status;
    END IF;
    
    -- Idempotent: skip if already in target status
    IF v_old_status = p_new_status THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing already has status %', p_new_status;
    END IF;
    
    UPDATE public.listings SET status = p_new_status::listing_status WHERE id = p_listing_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (v_actor_id, 'MODERATE_LISTING', p_listing_id, 'LISTING', p_reason, 
            jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) TO service_role;


-- 2d. admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_report_id UUID,
    p_resolution TEXT,
    p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_current_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_resolve_report: only callable via service_role';
    END IF;
    
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: no authenticated actor';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_resolve_report: insufficient privileges';
    END IF;
    
    IF p_resolution NOT IN ('RESOLVED', 'REJECTED') THEN
        RAISE EXCEPTION 'admin_resolve_report: invalid resolution %', p_resolution;
    END IF;
    
    SELECT status::text INTO v_current_status FROM public.reports WHERE id = p_report_id;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: report not found';
    END IF;
    
    IF v_current_status NOT IN ('OPEN', 'IN_REVIEW') THEN
        RAISE EXCEPTION 'admin_resolve_report: report already resolved (status: %)', v_current_status;
    END IF;
    
    UPDATE public.reports
    SET status = p_resolution::report_status,
        moderator_id = v_actor_id,
        resolution_notes = p_notes,
        resolved_at = now()
    WHERE id = p_report_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (v_actor_id, 'RESOLVE_REPORT', p_report_id, 'REPORT', p_notes,
            jsonb_build_object('resolution', p_resolution))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) TO service_role;


-- 3. Account deletion RPC — atomic anonymization + tombstoning
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
BEGIN
    -- Only callable via service_role
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
    END IF;
    
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'process_account_deletion: user not found';
    END IF;
    
    v_anon_name := 'Deleted User ' || substring(p_user_id::text from 1 for 5);
    
    -- Anonymize profile
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'
    WHERE id = p_user_id;
    
    -- Deactivate listings
    UPDATE public.listings SET status = 'DEACTIVATED' WHERE seller_id = p_user_id AND status != 'DEACTIVATED';
    
    -- Block stores
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    -- Clean up storage
    DELETE FROM storage.objects WHERE owner = p_user_id;
    
    -- Audit log (no PII in reason)
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;

REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID) TO service_role;


-- 4. Protect audit_logs from modification/deletion by non-service roles
-- No INSERT policy for authenticated users (audit writes go through service_role RPCs)
-- No UPDATE/DELETE policies at all
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
CREATE POLICY "No one can update audit logs" ON public.audit_logs FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;
CREATE POLICY "No one can delete audit logs" ON public.audit_logs FOR DELETE USING (false);


COMMIT;
