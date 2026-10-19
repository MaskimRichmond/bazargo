BEGIN;
SELECT plan(6);

-- 1. Setup
INSERT INTO auth.users (id, email) VALUES 
('66666666-6666-6666-6666-666666666666', 'buyer6@bazar.go'),
('77777777-7777-7777-7777-777777777777', 'seller7@bazar.go');

INSERT INTO public.profiles (id, role, full_name) VALUES 
('66666666-6666-6666-6666-666666666666', 'USER', 'C2C Buyer'),
('77777777-7777-7777-7777-777777777777', 'USER', 'C2C Seller');

INSERT INTO public.orders (id, buyer_id, seller_id, total_amount, status) 
VALUES ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', 100, 'PENDING');

-- 2. Buyer cannot CONFIRM
SELECT set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666"}', true);
PREPARE buyer_confirm AS SELECT public.change_order_status('88888888-8888-8888-8888-888888888888', 'CONFIRMED');
SELECT throws_ok('buyer_confirm', 'Buyer cannot transition order to CONFIRMED', 'Buyer cannot confirm order');

-- 3. Seller CAN confirm
SELECT set_config('request.jwt.claims', '{"sub":"77777777-7777-7777-7777-777777777777"}', true);
PREPARE seller_confirm AS SELECT public.change_order_status('88888888-8888-8888-8888-888888888888', 'CONFIRMED');
SELECT lives_ok('seller_confirm', 'Seller can confirm order');

-- 4. Seller cannot COMPLETE
PREPARE seller_complete AS SELECT public.change_order_status('88888888-8888-8888-8888-888888888888', 'COMPLETED');
SELECT throws_ok('seller_complete', 'Seller cannot transition order to COMPLETED', 'Seller cannot complete order');

-- 5. Buyer CAN complete
SELECT set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666"}', true);
PREPARE buyer_complete AS SELECT public.change_order_status('88888888-8888-8888-8888-888888888888', 'COMPLETED');
SELECT lives_ok('buyer_complete', 'Buyer can complete order');

-- 6. Direct update by client is blocked
PREPARE direct_update AS UPDATE public.orders SET status = 'CANCELLED' WHERE id = '88888888-8888-8888-8888-888888888888';
SELECT throws_ok('direct_update', 'Order status can only be changed via official actions', 'Direct update is blocked by trigger');

-- 7. Test cancellation logic freeing stock implicitly (We just test that CANCELLED works)
INSERT INTO public.orders (id, buyer_id, seller_id, total_amount, status) 
VALUES ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', 100, 'PENDING');
PREPARE buyer_cancel AS SELECT public.change_order_status('99999999-9999-9999-9999-999999999999', 'CANCELLED');
SELECT lives_ok('buyer_cancel', 'Buyer can cancel PENDING order');

ROLLBACK;
