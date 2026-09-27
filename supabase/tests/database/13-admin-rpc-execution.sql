BEGIN;
SELECT plan(13);

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

-- 1. admin_block_user — anon cannot call
SET ROLE anon;
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'test') $$,
    '42501',
    NULL,
    'anon cannot call admin_block_user'
);
RESET ROLE;

-- 2. admin_block_user — authenticated user cannot call
SET ROLE authenticated;
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'test') $$,
    '42501',
    NULL,
    'authenticated cannot call admin_block_user'
);
RESET ROLE;

-- 3. admin_block_user — service_role fails if actor_id is NULL
SET ROLE service_role;
SELECT throws_ok(
    $$ SELECT public.admin_block_user(NULL, 'a0000000-0000-0000-0000-000000000005', 'test') $$,
    'P0001',
    'admin_block_user: missing actor_id',
    'admin_block_user rejects NULL actor_id'
);

-- 4. admin_block_user — service_role fails if actor lacks permission (USER role)
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'test') $$,
    'P0001',
    'admin_block_user: insufficient privileges (role: USER)',
    'admin_block_user rejects unauthorized actor'
);

-- 5. admin_block_user — service_role fails if actor lacks permission (MODERATOR role)
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'test') $$,
    'P0001',
    'admin_block_user: insufficient privileges (role: MODERATOR)',
    'admin_block_user rejects unauthorized actor (moderator)'
);

-- 6. admin_block_user — service_role succeeds for ADMIN
SELECT lives_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'test reason') $$,
    'admin_block_user succeeds for ADMIN'
);

-- 7. admin_block_user verifies atomic audit log
SELECT results_eq(
    $$ SELECT reason FROM public.audit_logs WHERE target_id = 'a0000000-0000-0000-0000-000000000005' AND action = 'BLOCK_USER' $$,
    ARRAY['test reason'::text],
    'audit log created correctly by admin_block_user'
);

-- 8. admin_block_user prevents ADMIN from banning SUPER_ADMIN
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'test') $$,
    'P0001',
    'admin_block_user: cannot ban SUPER_ADMIN',
    'ADMIN cannot ban SUPER_ADMIN'
);

-- 9. admin_block_user prevents duplicate ban (idempotent)
SELECT throws_ok(
    $$ SELECT public.admin_block_user('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'already banned') $$,
    'P0001',
    'admin_block_user: user already banned or update failed',
    'admin_block_user rejects repeat ban'
);

-- 10. process_account_deletion — anon cannot call
SET ROLE anon;
SELECT throws_ok(
    $$ SELECT public.process_account_deletion('a0000000-0000-0000-0000-000000000005') $$,
    '42501',
    NULL,
    'anon cannot call process_account_deletion'
);
RESET ROLE;

-- 11. process_account_deletion — authenticated cannot call
SET ROLE authenticated;
SELECT throws_ok(
    $$ SELECT public.process_account_deletion('a0000000-0000-0000-0000-000000000005') $$,
    '42501',
    NULL,
    'authenticated cannot call process_account_deletion'
);
RESET ROLE;

-- 12. process_account_deletion — service_role succeeds
SET ROLE service_role;
SELECT lives_ok(
    $$ SELECT public.process_account_deletion('a0000000-0000-0000-0000-000000000005') $$,
    'service_role can call process_account_deletion'
);

-- 13. Verify profile anonymization
SELECT results_eq(
    $$ SELECT full_name FROM public.profiles WHERE id = 'a0000000-0000-0000-0000-000000000005' $$,
    ARRAY['Deleted User a0000'::text],
    'process_account_deletion correctly anonymizes profile'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
