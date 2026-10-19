BEGIN;
SELECT plan(6);

-- 1. Setup
-- Roles
INSERT INTO auth.users (id, email) VALUES 
('44444444-4444-4444-4444-444444444444', 'buyer4@bazar.go'),
('55555555-5555-5555-5555-555555555555', 'seller5@bazar.go');

INSERT INTO public.profiles (id, role, full_name) VALUES 
('44444444-4444-4444-4444-444444444444', 'USER', 'B2B Buyer'),
('55555555-5555-5555-5555-555555555555', 'USER', 'B2B Seller');

-- Store & Listing
INSERT INTO public.stores (id, owner_id, name) VALUES ('bbbbbbbb-4444-4444-4444-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'B2B Store');
INSERT INTO public.categories (id, name, slug) VALUES ('cccccccc-4444-4444-4444-cccccccccccc', 'Test Cat 2', 'test-cat-2');

INSERT INTO public.listings (id, seller_id, title, price, category_id, city, store_id, is_b2b, min_order_quantity, quantity, status) 
VALUES ('dddddddd-4444-4444-4444-dddddddddddd', '55555555-5555-5555-5555-555555555555', 'B2B Product', 100, 'cccccccc-4444-4444-4444-cccccccccccc', 'Bishkek', 'bbbbbbbb-4444-4444-4444-bbbbbbbbbbbb', true, 10, 50, 'ACTIVE');

-- Chat
INSERT INTO public.chats (id, listing_id, buyer_id, seller_id) VALUES ('eeeeeeee-4444-4444-4444-eeeeeeeeeeee', 'dddddddd-4444-4444-4444-dddddddddddd', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555');

-- Create PENDING offer
INSERT INTO public.b2b_offers (id, listing_id, buyer_id, seller_id, chat_id, requested_quantity, requested_price, status)
VALUES ('ffffffff-4444-4444-4444-ffffffffffff', 'dddddddd-4444-4444-4444-dddddddddddd', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'eeeeeeee-4444-4444-4444-eeeeeeeeeeee', 20, 80, 'PENDING');

-- 2. Try to checkout PENDING offer
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
PREPARE checkout_pending AS SELECT public.create_order_from_b2b_offer('ffffffff-4444-4444-4444-ffffffffffff');
SELECT throws_ok('checkout_pending', 'Only ACCEPTED offers can be converted to orders', 'Cannot checkout PENDING offer');

-- 3. Accept the offer
UPDATE public.b2b_offers SET status = 'ACCEPTED' WHERE id = 'ffffffff-4444-4444-4444-ffffffffffff';

-- 4. Try to checkout as seller
SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555"}', true);
PREPARE checkout_seller AS SELECT public.create_order_from_b2b_offer('ffffffff-4444-4444-4444-ffffffffffff');
SELECT throws_ok('checkout_seller', 'Only the buyer can create an order from this offer', 'Seller cannot checkout buyer offer');

-- 5. Checkout as buyer
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444"}', true);
PREPARE checkout_success AS SELECT public.create_order_from_b2b_offer('ffffffff-4444-4444-4444-ffffffffffff');
SELECT lives_ok('checkout_success', 'Buyer can checkout ACCEPTED offer');

-- 6. Check if order was created correctly (quantity 20 * price 80 = 1600)
SELECT results_eq(
    'SELECT total_amount FROM public.orders WHERE b2b_offer_id = ''ffffffff-4444-4444-4444-ffffffffffff''',
    ARRAY[1600.00::NUMERIC],
    'Order should have correct total amount'
);

-- 7. Try to checkout same offer again
PREPARE checkout_again AS SELECT public.create_order_from_b2b_offer('ffffffff-4444-4444-4444-ffffffffffff');
SELECT throws_ok('checkout_again', 'An order has already been created for this offer', 'Cannot checkout twice');

-- 8. Test overstock
-- Accept new offer for 100 items, while stock is only 50
INSERT INTO public.b2b_offers (id, listing_id, buyer_id, seller_id, requested_quantity, requested_price, status)
VALUES ('aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', 'dddddddd-4444-4444-4444-dddddddddddd', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 100, 80, 'ACCEPTED');

PREPARE checkout_overstock AS SELECT public.create_order_from_b2b_offer('aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa');
SELECT throws_ok('checkout_overstock', 'Item does not have enough available stock (Available: 30, Requested: 100)', 'Cannot checkout if stock is insufficient');

ROLLBACK;
