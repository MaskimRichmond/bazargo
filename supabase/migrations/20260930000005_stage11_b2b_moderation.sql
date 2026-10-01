-- Migration: B2B Application Moderation RPC
-- Description: Allows admins to safely approve or reject B2B applications and log the action.

ALTER TABLE public.b2b_applications ADD COLUMN admin_comment TEXT;

CREATE OR REPLACE FUNCTION public.admin_moderate_b2b(
    p_actor_id UUID,
    p_app_id UUID,
    p_new_status public.b2b_application_status,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_role public.user_role;
    v_audit_id UUID;
    v_target_user_id UUID;
BEGIN
    -- Verify actor privileges
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to moderate B2B applications';
    END IF;

    -- Fetch app info
    SELECT user_id INTO v_target_user_id FROM public.b2b_applications WHERE id = p_app_id;
    IF v_target_user_id IS NULL THEN
         RAISE EXCEPTION 'Application not found';
    END IF;

    -- Update application status
    UPDATE public.b2b_applications
    SET status = p_new_status,
        admin_comment = p_reason,
        updated_at = NOW()
    WHERE id = p_app_id;

    -- Log action
    INSERT INTO public.audit_logs (actor_id, target_user_id, action, details)
    VALUES (
        p_actor_id,
        v_target_user_id,
        'B2B_APP_MODERATE',
        jsonb_build_object(
            'application_id', p_app_id,
            'new_status', p_new_status,
            'reason', p_reason
        )
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;
