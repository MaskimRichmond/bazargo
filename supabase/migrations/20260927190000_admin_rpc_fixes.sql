BEGIN;

-- Drop old RPCs that didn't take actor_id
DROP FUNCTION IF EXISTS public.admin_block_user(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_unblock_user(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_moderate_listing(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_resolve_report(UUID, TEXT, TEXT);

-- 1. admin_block_user
CREATE OR REPLACE FUNCTION public.admin_block_user(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role TEXT;
    v_target_role TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_block_user: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_block_user: insufficient privileges (role: %)', COALESCE(v_actor_role, 'NULL');
    END IF;
    
    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: target user not found';
    END IF;
    
    IF v_target_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'admin_block_user: cannot ban SUPER_ADMIN';
    END IF;
    
    UPDATE public.profiles
    SET is_banned = true,
        ban_reason = p_reason,
        banned_at = now()
    WHERE id = p_target_user_id AND (is_banned IS DISTINCT FROM true);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_block_user: user already banned or update failed';
    END IF;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_actor_id, 'BLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_block_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user(UUID, UUID, TEXT) TO service_role;

-- 2. admin_unblock_user
CREATE OR REPLACE FUNCTION public.admin_unblock_user(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_unblock_user: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_unblock_user: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
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
    VALUES (p_actor_id, 'UNBLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user(UUID, UUID, TEXT) TO service_role;

-- 3. admin_moderate_listing
CREATE OR REPLACE FUNCTION public.admin_moderate_listing(
    p_actor_id UUID,
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
    v_actor_role TEXT;
    v_old_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_moderate_listing: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_moderate_listing: insufficient privileges';
    END IF;
    
    SELECT status::text INTO v_old_status FROM public.listings WHERE id = p_listing_id;
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing not found';
    END IF;
    
    IF p_new_status NOT IN ('ACTIVE', 'DEACTIVATED', 'BLOCKED') THEN
        RAISE EXCEPTION 'admin_moderate_listing: invalid status %', p_new_status;
    END IF;
    
    IF v_old_status = p_new_status THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing already has status %', p_new_status;
    END IF;
    
    -- Explicitly cast using public schema
    UPDATE public.listings SET status = p_new_status::public.listing_status WHERE id = p_listing_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (p_actor_id, 'MODERATE_LISTING', p_listing_id, 'LISTING', p_reason, 
            jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_listing(UUID, UUID, TEXT, TEXT) TO service_role;

-- 4. admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_actor_id UUID,
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
    v_actor_role TEXT;
    v_current_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_resolve_report: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
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
    
    -- Explicitly cast using public schema
    UPDATE public.reports
    SET status = p_resolution::public.report_status,
        moderator_id = p_actor_id,
        resolution_notes = p_notes,
        resolved_at = now()
    WHERE id = p_report_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (p_actor_id, 'RESOLVE_REPORT', p_report_id, 'REPORT', p_notes,
            jsonb_build_object('resolution', p_resolution))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, UUID, TEXT, TEXT) TO service_role;

-- 5. process_account_deletion (Remove direct storage.objects deletion)
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
    
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'
    WHERE id = p_user_id;
    
    -- Use explicit casting
    UPDATE public.listings SET status = 'DEACTIVATED'::public.listing_status WHERE seller_id = p_user_id AND status != 'DEACTIVATED'::public.listing_status;
    
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    -- NOTE: Physical storage deletion is now handled via API in the Server Action
    -- We do not DELETE FROM storage.objects directly here anymore.
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;

COMMIT;
