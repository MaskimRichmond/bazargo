BEGIN;
SELECT plan(12);

-- Setup test users
INSERT INTO auth.users (id, email) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'regular@test.com'),
    ('a0000000-0000-0000-0000-000000000002', 'mod@test.com'),
    ('a0000000-0000-0000-0000-000000000003', 'admin@test.com'),
    ('a0000000-0000-0000-0000-000000000004', 'super@test.com'),
    ('a0000000-0000-0000-0000-000000000005', 'target@test.com');

INSERT INTO public.profiles (id, full_name, role) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Regular User', 'USER'),
    ('a0000000-0000-0000-0000-000000000002', 'Moderator', 'MODERATOR'),
    ('a0000000-0000-0000-0000-000000000003', 'Admin', 'ADMIN'),
    ('a0000000-0000-0000-0000-000000000004', 'Super Admin', 'SUPER_ADMIN'),
    ('a0000000-0000-0000-0000-000000000005', 'Target User', 'USER');

-- ============================================
-- 1. cleanup_user_storage — anon cannot call
-- ============================================
SET ROLE anon;
SELECT throws_ok(
    $$ SELECT public.cleanup_user_storage('a0000000-0000-0000-0000-000000000005') $$,
    '42501',
    NULL,
    'anon cannot call cleanup_user_storage'
);
RESET ROLE;

-- ============================================
-- 2. cleanup_user_storage — authenticated cannot call
-- ============================================
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
SELECT throws_ok(
    $$ SELECT public.cleanup_user_storage('a0000000-0000-0000-0000-000000000005') $$,
    '42501',
    NULL,
    'authenticated user cannot call cleanup_user_storage'
);
RESET ROLE;

-- ============================================
-- 3. cleanup_user_storage — service_role can call
-- ============================================
SET ROLE service_role;
SELECT lives_ok(
    $$ SELECT public.cleanup_user_storage('a0000000-0000-0000-0000-000000000005') $$,
    'service_role can call cleanup_user_storage'
);
RESET ROLE;

-- ============================================
-- 4. admin_block_user — anon cannot call
-- ============================================
SET ROLE anon;
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000005', 'test') $$,
    '42501',
    NULL,
    'anon cannot call admin_block_user'
);
RESET ROLE;

-- ============================================
-- 5. admin_block_user — authenticated user cannot call
-- ============================================
SET ROLE authenticated;
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000005', 'test') $$,
    '42501',
    NULL,
    'authenticated cannot call admin_block_user'
);
RESET ROLE;

-- ============================================
-- 6. Report immutability — reporter_id cannot be changed
-- ============================================
INSERT INTO public.reports (id, reporter_id, target_id, target_type, reason)
VALUES ('a0000000-0000-0000-0000-000000000090', 'a0000000-0000-0000-0000-000000000001', 
        'a0000000-0000-0000-0000-000000000005', 'USER', 'Test Report');

SELECT throws_ok(
    $$ UPDATE public.reports SET reporter_id = 'a0000000-0000-0000-0000-000000000005' WHERE id = 'a0000000-0000-0000-0000-000000000090' $$,
    'P0001',
    'Cannot update immutable field reporter_id',
    'Trigger prevents changing reporter_id'
);

-- ============================================
-- 7. Report immutability — target_id cannot be changed
-- ============================================
SELECT throws_ok(
    $$ UPDATE public.reports SET target_id = 'a0000000-0000-0000-0000-000000000001' WHERE id = 'a0000000-0000-0000-0000-000000000090' $$,
    'P0001',
    'Cannot update immutable field target_id',
    'Trigger prevents changing target_id'
);

-- ============================================
-- 8. Privilege escalation — USER cannot change own role
-- ============================================
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
SELECT throws_ok(
    $$ UPDATE public.profiles SET role = 'ADMIN' WHERE id = 'a0000000-0000-0000-0000-000000000001' $$,
    'P0001',
    'Unauthorized to change role',
    'Regular user cannot escalate own role'
);
RESET ROLE;

-- ============================================
-- 9. Privilege escalation — USER cannot unban self
-- ============================================
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
SELECT throws_ok(
    $$ UPDATE public.profiles SET is_banned = false WHERE id = 'a0000000-0000-0000-0000-000000000001' $$,
    'P0001',
    'Unauthorized to change ban status',
    'Regular user cannot change own ban status'
);
RESET ROLE;

-- ============================================
-- 10. Audit logs — USER cannot read
-- ============================================
SET ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
SELECT results_eq(
    $$ SELECT count(*)::int FROM public.audit_logs $$,
    ARRAY[0],
    'Regular user cannot read audit logs'
);
RESET ROLE;

-- ============================================
-- 11. process_account_deletion — only service_role
-- ============================================
SET ROLE authenticated;
SELECT throws_ok(
    $$ SELECT public.process_account_deletion('a0000000-0000-0000-0000-000000000005') $$,
    '42501',
    NULL,
    'authenticated cannot call process_account_deletion'
);
RESET ROLE;

-- ============================================
-- 12. process_account_deletion — service_role succeeds
-- ============================================
SET ROLE service_role;
SELECT lives_ok(
    $$ SELECT public.process_account_deletion('a0000000-0000-0000-0000-000000000005') $$,
    'service_role can call process_account_deletion'
);
RESET ROLE;

-- Verify target user is anonymized after deletion
SELECT results_eq(
    $$ SELECT full_name FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000005' $$,
    ARRAY['Deleted User a0000'],
    'Profile is anonymized after deletion'
);

SELECT * FROM finish();
ROLLBACK;
