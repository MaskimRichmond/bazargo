BEGIN;
SELECT plan(13);

-- Create dummy users
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'user1@example.com'),
    ('00000000-0000-0000-0000-000000000002', 'user2@example.com'),
    ('00000000-0000-0000-0000-000000000003', 'admin@example.com');

INSERT INTO public.profiles (id, full_name, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'User 1', 'USER'),
    ('00000000-0000-0000-0000-000000000002', 'User 2', 'USER'),
    ('00000000-0000-0000-0000-000000000003', 'Admin', 'SUPER_ADMIN');

-- 1. Reports RLS
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    $$ INSERT INTO public.reports (reporter_id, target_id, target_type, reason) 
       VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'USER', 'Spam') $$,
    'User can create report for themselves'
);

SELECT throws_ok(
    $$ INSERT INTO public.reports (reporter_id, target_id, target_type, reason) 
       VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'USER', 'Spam') $$,
    'new row violates row-level security policy for table "reports"',
    'User CANNOT create report for someone else'
);

SELECT results_eq(
    $$ SELECT count(*)::int FROM public.reports $$,
    ARRAY[1],
    'User sees only their own report'
);

-- Admin sees all reports
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
SELECT results_eq(
    $$ SELECT count(*)::int FROM public.reports $$,
    ARRAY[1],
    'Admin can view all reports'
);

-- 2. User Blocks RLS
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT lives_ok(
    $$ INSERT INTO public.user_blocks (blocker_id, blocked_id) 
       VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002') $$,
    'User 1 can block User 2'
);

-- User 1 tries to message User 2 (Should fail because User 1 blocked User 2)
-- Create a dummy chat first
SET LOCAL role = 'postgres';
INSERT INTO public.chats (id, buyer_id, seller_id) VALUES ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

SELECT throws_ok(
    $$ INSERT INTO public.messages (chat_id, sender_id, content) VALUES ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Hello') $$,
    'new row violates row-level security policy for table "messages"',
    'User 1 CANNOT message User 2 after blocking them'
);

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT throws_ok(
    $$ INSERT INTO public.messages (chat_id, sender_id, content) VALUES ('00000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'Hello') $$,
    'new row violates row-level security policy for table "messages"',
    'User 2 CANNOT message User 1 because they are blocked'
);

-- 3. Privilege Escalation Trigger Test
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT throws_ok(
    $$ UPDATE public.profiles SET role = 'SUPER_ADMIN' WHERE id = '00000000-0000-0000-0000-000000000001' $$,
    'P0001',
    'Unauthorized to change role',
    'Regular user cannot elevate their own role'
);

SELECT throws_ok(
    $$ UPDATE public.profiles SET is_banned = false WHERE id = '00000000-0000-0000-0000-000000000001' $$,
    'P0001',
    'Unauthorized to change ban status',
    'Regular user cannot unban themselves'
);

-- 4. Audit Logs Access
SELECT results_eq(
    $$ SELECT count(*)::int FROM public.audit_logs $$,
    ARRAY[0],
    'Regular user cannot read audit logs'
);

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
SELECT lives_ok(
    $$ SELECT count(*)::int FROM public.audit_logs $$,
    'Admin CAN read audit logs'
);

SELECT lives_ok(
    $$ UPDATE public.profiles SET role = 'MODERATOR' WHERE id = '00000000-0000-0000-0000-000000000002' $$,
    'Admin CAN change user roles'
);

SELECT * FROM finish();
ROLLBACK;
