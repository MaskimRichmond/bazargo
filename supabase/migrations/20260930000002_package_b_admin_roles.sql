BEGIN;

CREATE OR REPLACE FUNCTION public.admin_change_user_role(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_new_role VARCHAR,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role VARCHAR;
    v_target_old_role VARCHAR;
    v_audit_id UUID;
BEGIN
    -- 1. Check actor role
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Unauthorized: only ADMIN or SUPER_ADMIN can change roles';
    END IF;

    -- 2. Get target old role
    SELECT role INTO v_target_old_role FROM public.profiles WHERE id = p_target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- 3. Check hierarchy
    IF p_new_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: only SUPER_ADMIN can grant SUPER_ADMIN role';
    END IF;

    IF v_target_old_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: only SUPER_ADMIN can change a SUPER_ADMIN role';
    END IF;

    -- 4. Update role
    UPDATE public.profiles
    SET role = p_new_role
    WHERE id = p_target_user_id;

    -- 5. Audit log
    INSERT INTO public.admin_audit_logs (
        actor_id,
        action_type,
        target_type,
        target_id,
        old_state,
        new_state,
        reason
    ) VALUES (
        p_actor_id,
        'CHANGE_ROLE',
        'USER',
        p_target_user_id,
        jsonb_build_object('role', v_target_old_role),
        jsonb_build_object('role', p_new_role),
        p_reason
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role TO service_role;

COMMIT;
