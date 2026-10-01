BEGIN;
SELECT plan(10);

-- 1. Test B2B Moderation RPC permissions
-- Setup roles
INSERT INTO auth.users (id, email) VALUES 
('11111111-1111-1111-1111-111111111111', 'admin@bazar.go'),
('22222222-2222-2222-2222-222222222222', 'user@bazar.go'),
('33333333-3333-3333-3333-333333333333', 'supplier@bazar.go');

INSERT INTO public.profiles (id, role, full_name) VALUES 
('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Admin User'),
('22222222-2222-2222-2222-222222222222', 'USER', 'Normal User'),
('33333333-3333-3333-3333-333333333333', 'USER', 'Supplier User');

-- Create a B2B app
INSERT INTO public.b2b_applications (id, user_id, company_name, tax_id, status)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'OOO Supplier', '123456789', 'PENDING');

-- Try to moderate as normal user (should fail)
PREPARE mod_as_user AS SELECT public.admin_moderate_b2b('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'APPROVED', 'Ok');
SELECT throws_ok('mod_as_user', 'Unauthorized: insufficient privileges to moderate B2B applications', 'Normal users cannot moderate B2B');

-- Try to moderate as Admin (should succeed)
PREPARE mod_as_admin AS SELECT public.admin_moderate_b2b('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'APPROVED', 'Looks good');
SELECT lives_ok('mod_as_admin', 'Admins can moderate B2B apps');

SELECT results_eq(
  'SELECT status FROM public.b2b_applications WHERE id = ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa''',
  ARRAY['APPROVED'::public.b2b_application_status],
  'B2B app should be approved'
);

-- 2. Test Review Constraints (completed vs cancelled)
-- Create a store and listing
INSERT INTO public.stores (id, owner_id, name) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Supplier Store');
INSERT INTO public.categories (id, name, slug) VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Cat', 'test-cat');
INSERT INTO public.listings (id, seller_id, title, price, category_id, city, store_id) 
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333', 'Product 1', 100, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Bishkek', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Create a CANCELLED order
INSERT INTO public.orders (id, buyer_id, seller_id, listing_id, status, total_amount)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'CANCELLED', 100);

-- Auth as buyer
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

-- Try to review cancelled order
PREPARE review_cancelled AS SELECT public.submit_review('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 5, 'Great');
SELECT throws_ok('review_cancelled', 'Order must be completed to leave a review', 'Cannot review a cancelled order');

-- Create a COMPLETED order
INSERT INTO public.orders (id, buyer_id, seller_id, listing_id, status, total_amount)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'COMPLETED', 100);

-- Review completed order
PREPARE review_completed AS SELECT public.submit_review('ffffffff-ffff-ffff-ffff-ffffffffffff', 4, 'Good');
SELECT lives_ok('review_completed', 'Can review a completed order');

-- Check duplicate review prevention
PREPARE review_dup AS SELECT public.submit_review('ffffffff-ffff-ffff-ffff-ffffffffffff', 3, 'Changed mind');
SELECT throws_ok('review_dup', 'You have already reviewed this order', 'Cannot review twice');

-- Check if store rating updated via trigger (4 stars from 1 review)
SELECT results_eq(
    'SELECT rating, reviews_count FROM public.stores WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
    $$VALUES (4.0::NUMERIC, 1::INTEGER)$$,
    'Store rating should update automatically'
);

-- 3. Test B2B Offers
-- Make listing B2B
UPDATE public.listings SET is_b2b = true, wholesale_price = 80, min_order_quantity = 10 WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Create B2B offer
PREPARE create_b2b AS SELECT public.create_b2b_offer('dddddddd-dddd-dddd-dddd-dddddddddddd', 10, 80, 'I want 10');
SELECT lives_ok('create_b2b', 'Buyer can create B2B offer for B2B listing');

-- Try to create offer below MOA (Minimum Order Quantity)
PREPARE create_b2b_low AS SELECT public.create_b2b_offer('dddddddd-dddd-dddd-dddd-dddddddddddd', 5, 80, 'I want 5');
SELECT throws_ok('create_b2b_low', 'Quantity is below minimum order quantity', 'B2B offer respects min quantity');

-- Accept offer as seller
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
PREPARE accept_b2b AS SELECT public.respond_b2b_offer((SELECT id FROM public.b2b_offers LIMIT 1), 'ACCEPTED'::public.b2b_offer_status);
SELECT lives_ok('accept_b2b', 'Seller can accept B2B offer');

ROLLBACK;
