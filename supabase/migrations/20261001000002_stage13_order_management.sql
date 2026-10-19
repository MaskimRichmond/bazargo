-- Migration: Stage 13 Order Management Fixes
-- Description: Fix complete_order signature to match frontend and use auth.uid()

DROP FUNCTION IF EXISTS public.complete_order(UUID, UUID);
DROP FUNCTION IF EXISTS public.complete_order(UUID);

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
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    -- Get order and lock it for update to prevent concurrent completions
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Security check: only the seller can complete (Wait, complete is usually done by seller to indicate they handed it over? Or buyer?)
    -- The frontend has "COMPLETED" available for seller in order-actions.tsx!
    -- Yes, `isSeller` branch has `COMPLETED`.
    IF v_order.seller_id != v_uid THEN
        RAISE EXCEPTION 'Unauthorized: only seller can complete this order';
    END IF;

    -- Idempotency and State Machine check
    IF v_order.status = 'COMPLETED' THEN
        RETURN TRUE;
    END IF;

    IF v_order.status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Order must be CONFIRMED to complete';
    END IF;

    -- Loop through items
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = order_id_param LOOP
        -- Lock listing
        SELECT * INTO v_listing FROM public.listings WHERE id = v_item.listing_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Listing % not found', v_item.listing_id;
        END IF;

        IF v_listing.status != 'ACTIVE' THEN
            RAISE EXCEPTION 'Listing is no longer ACTIVE';
        END IF;

        IF v_listing.listing_type = 'SINGLE' THEN
            UPDATE public.listings SET status = 'SOLD' WHERE id = v_listing.id;
        ELSIF v_listing.listing_type = 'INVENTORY' THEN
            IF v_listing.quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Недостаточно товара в наличии для завершения этой сделки.';
            END IF;
            
            UPDATE public.listings SET quantity = quantity - v_item.quantity WHERE id = v_listing.id;
            
            IF (v_listing.quantity - v_item.quantity) = 0 THEN
                UPDATE public.listings SET status = 'OUT_OF_STOCK' WHERE id = v_listing.id;
            END IF;
        END IF;
    END LOOP;

    -- Mark order as completed
    UPDATE public.orders 
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
    WHERE id = order_id_param;
    
    RETURN TRUE;
END;
$$;
