BEGIN;
SELECT plan(15);

-- 1. Check if new columns exist on orders table
SELECT has_column('public', 'orders', 'payment_status', 'orders should have payment_status column');
SELECT has_column('public', 'orders', 'delivery_type', 'orders should have delivery_type column');
SELECT has_column('public', 'orders', 'notes', 'orders should have notes column');
SELECT has_column('public', 'orders', 'cancellation_reason', 'orders should have cancellation_reason column');

-- 2. Check order_items columns
SELECT has_column('public', 'order_items', 'title_snapshot', 'order_items should have title_snapshot column');
SELECT has_column('public', 'order_items', 'image_url_snapshot', 'order_items should have image_url_snapshot column');
SELECT hasnt_column('public', 'order_items', 'store_id', 'order_items should NOT have store_id column');

-- 3. Check notifications table
SELECT has_column('public', 'notifications', 'payload', 'notifications should have payload column');
SELECT col_type_is('public', 'notifications', 'payload', 'jsonb', 'notifications.payload should be jsonb');

-- 4. Check indexes for admin performance
SELECT has_index('public', 'stores', 'idx_stores_status', 'stores should have idx_stores_status index');
SELECT has_index('public', 'reports', 'idx_reports_status', 'reports should have idx_reports_status index');
SELECT has_index('public', 'b2b_applications', 'idx_b2b_apps_status', 'b2b_applications should have idx_b2b_apps_status index');

-- 5. Check functions exist
SELECT has_function('public', 'create_orders_from_cart', 'create_orders_from_cart function should exist');
SELECT function_returns('public', 'create_orders_from_cart', 'uuid[]', 'create_orders_from_cart should return uuid[]');

-- 6. Check report_status enum
SELECT has_enum('public', 'report_status');

SELECT * FROM finish();
ROLLBACK;
