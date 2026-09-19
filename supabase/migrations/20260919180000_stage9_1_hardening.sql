-- STAGE 9.1: BAZARGO SECURITY, ORDER INTEGRITY & UX HARDENING

-- 1. Drop permissive policies
DROP POLICY IF EXISTS "Buyers can insert their orders" ON public.orders;
DROP POLICY IF EXISTS "Participants can update orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can insert order items" ON public.order_items;

DROP FUNCTION IF EXISTS public.complete_order(UUID, UUID);

-- (Keep SELECT policies so users can still read their orders/items)

-- 2. Hardened complete_order
CREATE OR REPLACE FUNCTION public.complete_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_listing RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Lock order
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.seller_id != v_uid THEN
        RAISE EXCEPTION 'Unauthorized: only seller can complete this order';
    END IF;

    IF v_order.status = 'COMPLETED' THEN
        RETURN TRUE; -- Idempotency
    END IF;

    IF v_order.status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Order must be CONFIRMED to complete';
    END IF;

    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = order_id_param LOOP
        SELECT * INTO v_listing FROM public.listings WHERE id = v_item.listing_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Listing % not found', v_item.listing_id;
        END IF;

        IF v_listing.status != 'ACTIVE' THEN
            RAISE EXCEPTION 'Listing % is no longer ACTIVE', v_listing.id;
        END IF;

        IF v_listing.seller_id != v_order.seller_id THEN
            RAISE EXCEPTION 'Listing seller mismatch';
        END IF;

        IF v_listing.listing_type = 'SINGLE' THEN
            UPDATE public.listings SET status = 'SOLD' WHERE id = v_listing.id;
        ELSIF v_listing.listing_type = 'INVENTORY' THEN
            IF v_listing.quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for listing %', v_listing.id;
            END IF;
            
            UPDATE public.listings 
            SET quantity = quantity - v_item.quantity 
            WHERE id = v_listing.id;
            
            IF (v_listing.quantity - v_item.quantity) = 0 THEN
                UPDATE public.listings SET status = 'OUT_OF_STOCK' WHERE id = v_listing.id;
            END IF;
        END IF;
    END LOOP;

    UPDATE public.orders 
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
    WHERE id = order_id_param;
    
    RETURN TRUE;
END;
$$;

-- 3. Hardened order state machine functions
CREATE OR REPLACE FUNCTION public.confirm_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.seller_id != v_uid THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF v_order.status = 'CONFIRMED' THEN RETURN TRUE; END IF;
    IF v_order.status != 'PENDING' THEN RAISE EXCEPTION 'Cannot confirm non-pending order'; END IF;
    
    UPDATE public.orders SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW() WHERE id = order_id_param;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.seller_id != v_uid THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF v_order.status = 'REJECTED' THEN RETURN TRUE; END IF;
    IF v_order.status != 'PENDING' THEN RAISE EXCEPTION 'Cannot reject non-pending order'; END IF;
    
    UPDATE public.orders SET status = 'REJECTED', updated_at = NOW() WHERE id = order_id_param;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.buyer_id != v_uid THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF v_order.status = 'CANCELLED' THEN RETURN TRUE; END IF;
    IF v_order.status NOT IN ('PENDING', 'CONFIRMED') THEN RAISE EXCEPTION 'Order cannot be cancelled'; END IF;
    
    UPDATE public.orders SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = order_id_param;
    RETURN TRUE;
END;
$$;

-- 4. Hardened checkout from cart
CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_cart_item RECORD;
    v_listing RECORD;
    v_seller_id UUID;
    v_store_id UUID;
    v_order_id UUID;
    v_total NUMERIC;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    -- Basic check if cart empty
    IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE user_id = v_uid) THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- Group by seller and create orders
    FOR v_seller_id IN (
        SELECT DISTINCT l.seller_id 
        FROM public.cart_items c 
        JOIN public.listings l ON c.listing_id = l.id 
        WHERE c.user_id = v_uid
    ) LOOP
        
        IF v_seller_id = v_uid THEN
            RAISE EXCEPTION 'Cannot buy own listings';
        END IF;

        v_total := 0;
        v_store_id := NULL;

        -- Create pending order
        INSERT INTO public.orders (buyer_id, seller_id, status, total_amount)
        VALUES (v_uid, v_seller_id, 'PENDING', 0)
        RETURNING id INTO v_order_id;

        -- Process items for this seller
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller_id
        ) LOOP
            -- Integrity checks
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Listing % is not ACTIVE', v_cart_item.title;
            END IF;
            IF v_cart_item.listing_type = 'SINGLE' AND v_cart_item.quantity > 1 THEN
                RAISE EXCEPTION 'Single listings can only have quantity 1';
            END IF;
            IF v_cart_item.listing_type = 'INVENTORY' AND v_cart_item.quantity > v_cart_item.stock THEN
                RAISE EXCEPTION 'Insufficient stock for %', v_cart_item.title;
            END IF;

            v_store_id := COALESCE(v_store_id, v_cart_item.store_id);
            v_total := v_total + (v_cart_item.price * v_cart_item.quantity);

            INSERT INTO public.order_items (order_id, listing_id, quantity, unit_price, title_snapshot, image_url_snapshot)
            VALUES (v_order_id, v_cart_item.id, v_cart_item.quantity, v_cart_item.price, v_cart_item.title, v_cart_item.img_url);
        END LOOP;

        -- Update order total and store_id
        UPDATE public.orders 
        SET total_amount = v_total, store_id = v_store_id 
        WHERE id = v_order_id;

    END LOOP;

    -- Clear cart
    DELETE FROM public.cart_items WHERE user_id = v_uid;

    RETURN TRUE;
END;
$$;

-- 5. Revoke EXECUTE from anon
REVOKE EXECUTE ON FUNCTION public.complete_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.confirm_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_orders_from_cart() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_orders_from_cart() FROM anon;
GRANT EXECUTE ON FUNCTION public.create_orders_from_cart() TO authenticated;

-- 6. RPC for pg_trgm smart search ranking
CREATE OR REPLACE FUNCTION public.search_listings(query_text TEXT)
RETURNS TABLE (id UUID, rank REAL)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_synonyms TEXT[];
    v_combined_query TEXT;
    v_term TEXT;
BEGIN
    -- Base condition for simple trigram match
    -- But we also want to lookup synonyms and include them
    SELECT synonyms INTO v_synonyms FROM public.search_synonyms WHERE keyword = lower(trim(query_text)) LIMIT 1;
    
    IF v_synonyms IS NOT NULL THEN
        -- Create a combined string of terms separated by spaces
        v_combined_query := lower(trim(query_text)) || ' ' || array_to_string(v_synonyms, ' ');
    ELSE
        v_combined_query := lower(trim(query_text));
    END IF;

    RETURN QUERY
    SELECT l.id,
           -- Simple heuristic rank: exact title prefix match = +1.0, trigram similarity = +similarity
           (CASE WHEN lower(l.title) LIKE lower(trim(query_text)) || '%' THEN 1.0 ELSE 0.0 END
            + similarity(lower(l.title), v_combined_query)
           )::REAL as rank
    FROM public.listings l
    WHERE 
        l.status = 'ACTIVE' 
        AND (
            l.title % v_combined_query 
            OR l.description % v_combined_query
            OR similarity(lower(l.title), v_combined_query) > 0.2
        )
    ORDER BY rank DESC;
END;
$$;
