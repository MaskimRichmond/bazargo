BEGIN;
-- Setup test environment
SELECT plan(6);

-- 1. Create a test profile and set it as banned
INSERT INTO auth.users (id, email) VALUES ('a0000000-0000-0000-0000-000000000099', 'banned@test.com') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, role, is_banned) VALUES ('a0000000-0000-0000-0000-000000000099', 'Banned User', 'USER', true)
ON CONFLICT (id) DO UPDATE SET is_banned = true;

-- 2. Test INSERT on protected table (listings)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000099';

SELECT throws_ok(
    $$ INSERT INTO public.listings (title, description, price, seller_id, category_id, status) VALUES ('t', 't', 1, 'a0000000-0000-0000-0000-000000000099', 'c0000000-0000-0000-0000-000000000000', 'ACTIVE') $$,
    'P0001',
    'Action not allowed for banned or deleted users.',
    'Banned user cannot insert into listings'
);

-- 3. Test UPDATE on protected table (listings)
SELECT throws_ok(
    $$ UPDATE public.listings SET title = 'updated' WHERE seller_id = 'a0000000-0000-0000-0000-000000000099' $$,
    'P0001',
    'Action not allowed for banned or deleted users.',
    'Banned user cannot update listings'
);

-- 4. Test DELETE on protected table (listings)
SELECT throws_ok(
    $$ DELETE FROM public.listings WHERE seller_id = 'a0000000-0000-0000-0000-000000000099' $$,
    'P0001',
    'Action not allowed for banned or deleted users.',
    'Banned user cannot delete listings'
);

-- 5. Test SELECT on protected table (listings) - Should NOT be blocked by trigger, because trigger is INSERT/UPDATE/DELETE
SELECT lives_ok(
    $$ SELECT count(*) FROM public.listings WHERE seller_id = 'a0000000-0000-0000-0000-000000000099' $$,
    'Banned user can still SELECT (triggers only block writes)'
);

-- 6. Test Admin (service_role) action - should NOT be blocked
RESET ROLE;
SET LOCAL role = 'service_role';
SELECT lives_ok(
    $$ UPDATE public.listings SET title = 'admin update' WHERE seller_id = 'a0000000-0000-0000-0000-000000000099' $$,
    'service_role can update listings of banned users'
);

-- 7. Test regular unbanned user - should NOT be blocked
INSERT INTO auth.users (id, email) VALUES ('a0000000-0000-0000-0000-000000000098', 'clean@test.com') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, full_name, role, is_banned) VALUES ('a0000000-0000-0000-0000-000000000098', 'Clean User', 'USER', false)
ON CONFLICT (id) DO UPDATE SET is_banned = false;

RESET ROLE;
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000098';
SELECT lives_ok(
    $$ UPDATE public.listings SET title = 'clean update' WHERE seller_id = 'a0000000-0000-0000-0000-000000000098' $$,
    'clean user can update their listings'
);

SELECT * FROM finish();
ROLLBACK;
