BEGIN;
SELECT plan(4);

-- Test cleanup_user_storage
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-000000000999', 'storage-test@example.com');

-- We can't insert directly into storage.objects easily without satisfying its FKs to storage.buckets
-- Let's just make sure the function executes without crashing under service_role
SET ROLE service_role;
SELECT lives_ok(
    $$ SELECT public.cleanup_user_storage('00000000-0000-0000-0000-000000000999') $$,
    'cleanup_user_storage executes without error as service_role'
);
RESET ROLE;

SET ROLE authenticated;
SELECT throws_ok(
    $$ SELECT public.cleanup_user_storage('00000000-0000-0000-0000-000000000999') $$,
    'P0001',
    'Unauthorized to clean up storage for this user',
    'cleanup_user_storage throws unauthorized for arbitrary user'
);
RESET ROLE;

-- Test report immutable fields
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000998', 'reporter@example.com');
INSERT INTO public.profiles (id, full_name, role) VALUES ('00000000-0000-0000-0000-000000000998', 'Reporter', 'USER');

INSERT INTO public.reports (id, reporter_id, target_id, target_type, reason)
VALUES ('00000000-0000-0000-0000-000000000990', '00000000-0000-0000-0000-000000000998', '00000000-0000-0000-0000-000000000999', 'USER', 'Test Report');

SELECT throws_ok(
    $$ UPDATE public.reports SET reporter_id = '00000000-0000-0000-0000-000000000999' WHERE id = '00000000-0000-0000-0000-000000000990' $$,
    'P0001',
    'Cannot update immutable field reporter_id',
    'Trigger prevents changing reporter_id'
);

SELECT throws_ok(
    $$ UPDATE public.reports SET target_id = '00000000-0000-0000-0000-000000000998' WHERE id = '00000000-0000-0000-0000-000000000990' $$,
    'P0001',
    'Cannot update immutable field target_id',
    'Trigger prevents changing target_id'
);

SELECT * FROM finish();
ROLLBACK;
