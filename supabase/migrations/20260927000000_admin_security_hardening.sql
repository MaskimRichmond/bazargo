BEGIN;

-- 1. Fix cleanup_user_storage IDOR
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
    
    -- Must be called by service_role (Admin Action) OR the user themselves
    IF v_role != 'service_role' AND auth.uid() != uid THEN
        RAISE EXCEPTION 'Unauthorized to clean up storage for this user';
    END IF;
    
    DELETE FROM storage.objects WHERE owner = uid;
EXCEPTION WHEN OTHERS THEN
    -- To ensure idempotency and non-blocking behavior on missing schema, we catch but log
    RAISE WARNING 'Failed to cleanup storage: %', SQLERRM;
END;
$$;

-- Restrict execute permissions
REVOKE EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) TO authenticated;

COMMIT;
