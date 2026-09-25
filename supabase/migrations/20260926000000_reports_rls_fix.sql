-- Fix Report RLS and add immutable fields protection
-- Add storage cleanup for account deletion

BEGIN;

DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;
CREATE POLICY "Staff can update reports" ON public.reports FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR')));

CREATE OR REPLACE FUNCTION public.prevent_immutable_report_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reporter_id IS DISTINCT FROM OLD.reporter_id THEN RAISE EXCEPTION 'Cannot update immutable field reporter_id'; END IF;
    IF NEW.target_id IS DISTINCT FROM OLD.target_id THEN RAISE EXCEPTION 'Cannot update immutable field target_id'; END IF;
    IF NEW.target_type IS DISTINCT FROM OLD.target_type THEN RAISE EXCEPTION 'Cannot update immutable field target_type'; END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Cannot update immutable field created_at'; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_immutable_report_updates ON public.reports;
CREATE TRIGGER tr_prevent_immutable_report_updates
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_report_updates();

-- Helper to clean up storage objects for a user so auth.admin.deleteUser doesn't fail on FK constraint
CREATE OR REPLACE FUNCTION public.cleanup_user_storage(uid UUID)
RETURNS void AS $$
BEGIN
    -- Delete files owned by the user from all buckets
    -- This requires the storage schema to exist. In Supabase, it always exists.
    DELETE FROM storage.objects WHERE owner = uid;
EXCEPTION
    WHEN OTHERS THEN
        -- Safely ignore if storage schema somehow differs or isn't accessible
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
