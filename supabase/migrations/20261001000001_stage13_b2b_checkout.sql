-- Migration: B2B Offer to Order Conversion
-- Description: Creates an RPC to convert an ACCEPTED B2B offer into a real PENDING order, with stock checks

-- Add an optional b2b_offer_id to orders table to link them
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS b2b_offer_id UUID REFERENCES public.b2b_offers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_order_from_b2b_offer(
    p_offer_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_offer RECORD;
    v_listing RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(12,2);
    v_active_reserved INTEGER;
    v_img_url TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock the offer to prevent concurrent creations
    SELECT * INTO v_offer 
    FROM public.b2b_offers 
    WHERE id = p_offer_id 
    FOR UPDATE;

    IF v_offer IS NULL THEN
        RAISE EXCEPTION 'Offer not found';
    END IF;

    IF v_uid != v_offer.buyer_id THEN
        RAISE EXCEPTION 'Only the buyer can create an order from this offer';
    END IF;

    IF v_offer.status != 'ACCEPTED' THEN
        RAISE EXCEPTION 'Only ACCEPTED offers can be converted to orders';
    END IF;

    -- Check if an order already exists for this offer
    IF EXISTS (SELECT 1 FROM public.orders WHERE b2b_offer_id = p_offer_id) THEN
        RAISE EXCEPTION 'An order has already been created for this offer';
    END IF;

    -- Lock the listing to check stock
    SELECT l.id, l.title, l.status, l.quantity as stock, l.store_id, l.listing_type
    INTO v_listing
    FROM public.listings l
    WHERE l.id = v_offer.listing_id
    FOR UPDATE;

    IF v_listing IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_listing.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Listing is no longer active';
    END IF;

    -- Get first image
    SELECT url INTO v_img_url FROM public.listing_images WHERE listing_id = v_listing.id ORDER BY order_index ASC LIMIT 1;

    -- Determine agreed price and quantity (fallback to requested if no counter offer was made)
    DECLARE
        v_final_quantity INTEGER := COALESCE(v_offer.offered_quantity, v_offer.requested_quantity);
        v_final_price NUMERIC(12,2) := COALESCE(v_offer.offered_price, v_offer.requested_price);
    BEGIN
        -- Calculate currently reserved stock in PENDING/CONFIRMED orders
        SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.listing_id = v_listing.id 
        AND o.status IN ('PENDING', 'CONFIRMED');

        -- B2B usually requires multiple items, but we use the same stock logic
        IF v_active_reserved + v_final_quantity > COALESCE(v_listing.stock, 0) THEN
            RAISE EXCEPTION 'Item does not have enough available stock (Available: %, Requested: %)', 
                COALESCE(v_listing.stock, 0) - v_active_reserved, 
                v_final_quantity;
        END IF;

        v_total_amount := v_final_price * v_final_quantity;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            store_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes,
            b2b_offer_id
        ) VALUES (
            v_uid,
            v_offer.seller_id,
            v_listing.store_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP', -- Or negotiate this later
            'Created from B2B Offer',
            p_offer_id
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        INSERT INTO public.order_items (
            order_id,
            listing_id,
            quantity,
            unit_price,
            title_snapshot,
            image_url_snapshot
        ) VALUES (
            v_order_id,
            v_listing.id,
            v_final_quantity,
            v_final_price,
            v_listing.title,
            v_img_url
        );

        -- Send notification to seller
        INSERT INTO public.notifications (user_id, type, message, link)
        VALUES (
            v_offer.seller_id, 
            'NEW_ORDER', 
            'Покупатель оформил B2B-заказ!', 
            '/seller/orders/' || v_order_id
        );

        RETURN v_order_id;
    END;
END;
$$;
