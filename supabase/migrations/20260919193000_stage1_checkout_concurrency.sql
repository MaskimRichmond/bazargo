-- STAGE 1: ORDER CHECKOUT CONCURRENCY & OVERSELLING FIX

CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_seller RECORD;
    v_cart_item RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(10,2);
    v_created_order_ids UUID[] := '{}';
    v_active_reserved INTEGER;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- For each unique seller in the cart
    FOR v_seller IN (
        SELECT DISTINCT l.seller_id
        FROM public.cart_items c
        JOIN public.listings l ON c.listing_id = l.id
        WHERE c.user_id = v_uid
    ) LOOP
        v_total_amount := 0;

        -- We need to check stock with row locking to prevent race conditions during checkout
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
            FOR UPDATE OF l -- Row lock to prevent concurrent checkouts of the same listing!
        ) LOOP
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Item % is no longer active', v_cart_item.title;
            END IF;

            -- Calculate currently reserved stock in PENDING/CONFIRMED orders
            SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            WHERE oi.listing_id = v_cart_item.id 
            AND o.status IN ('PENDING', 'CONFIRMED');

            IF v_cart_item.listing_type = 'SINGLE' THEN
                IF v_active_reserved + v_cart_item.quantity > 1 THEN
                    RAISE EXCEPTION 'Item % is already ordered by someone else', v_cart_item.title;
                END IF;
            ELSE
                IF v_active_reserved + v_cart_item.quantity > v_cart_item.stock THEN
                    RAISE EXCEPTION 'Item % does not have enough available stock (Available: %, Requested: %)', 
                        v_cart_item.title, 
                        v_cart_item.stock - v_active_reserved, 
                        v_cart_item.quantity;
                END IF;
            END IF;

            v_total_amount := v_total_amount + (v_cart_item.price * v_cart_item.quantity);
        END LOOP;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes
        ) VALUES (
            v_uid,
            v_seller.seller_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP',
            ''
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
        ) LOOP
            INSERT INTO public.order_items (
                order_id,
                listing_id,
                store_id,
                quantity,
                unit_price,
                title,
                image_url
            ) VALUES (
                v_order_id,
                v_cart_item.id,
                v_cart_item.store_id,
                v_cart_item.quantity,
                v_cart_item.price,
                v_cart_item.title,
                v_cart_item.img_url
            );
        END LOOP;

        -- Remove these items from cart
        DELETE FROM public.cart_items 
        WHERE user_id = v_uid 
        AND listing_id IN (
            SELECT id FROM public.listings WHERE seller_id = v_seller.seller_id
        );

        v_created_order_ids := array_append(v_created_order_ids, v_order_id);
    END LOOP;

    RETURN true;
END;
$$;
