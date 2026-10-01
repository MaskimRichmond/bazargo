BEGIN;

-- Fix the privilege escalation vulnerability where an ADMIN could promote themselves or others to SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_service_role BOOLEAN := FALSE;
    v_current_role VARCHAR;
BEGIN
    -- Check if executing as service_role or direct DB connection (no JWT claims)
    IF current_setting('role', true) = 'service_role' THEN
        v_is_service_role := TRUE;
    ELSIF current_setting('request.jwt.claims', true) IS NULL OR current_setting('request.jwt.claims', true) = '' THEN
        v_is_service_role := TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        -- Get the current role of the executor from the database
        BEGIN
            SELECT role INTO v_current_role 
            FROM public.profiles 
            WHERE id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_current_role := 'USER';
        END;

        -- Role changes
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            -- Only ADMIN or SUPER_ADMIN can change roles
            IF v_current_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
                RAISE EXCEPTION 'Only administrators can change user roles';
            END IF;

            -- Only SUPER_ADMIN can grant SUPER_ADMIN
            IF NEW.role = 'SUPER_ADMIN' AND v_current_role != 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Only SUPER_ADMIN can grant SUPER_ADMIN privileges';
            END IF;
            
            -- Only SUPER_ADMIN can revoke SUPER_ADMIN
            IF OLD.role = 'SUPER_ADMIN' AND v_current_role != 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Only SUPER_ADMIN can revoke SUPER_ADMIN privileges';
            END IF;
        END IF;

        -- Banning users
        IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
            IF v_current_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
                RAISE EXCEPTION 'Only administrators can ban/unban users';
            END IF;
            
            -- ADMIN cannot ban SUPER_ADMIN
            IF OLD.role = 'SUPER_ADMIN' AND v_current_role != 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Only SUPER_ADMIN can ban other SUPER_ADMINs';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;
