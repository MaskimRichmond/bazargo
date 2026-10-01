-- Migration: B2B Offers and Negotiations
-- Description: Adds tables and logic for B2B wholesale negotiations

CREATE TYPE public.b2b_offer_status AS ENUM ('PENDING', 'COUNTER_OFFER', 'ACCEPTED', 'REJECTED');

CREATE TABLE public.b2b_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
    
    -- Buyer's original request
    requested_quantity INTEGER NOT NULL,
    requested_price NUMERIC(12, 2) NOT NULL,
    buyer_message TEXT,
    
    -- Seller's counter offer (if any)
    offered_quantity INTEGER,
    offered_price NUMERIC(12, 2),
    seller_message TEXT,
    
    status public.b2b_offer_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.b2b_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own offers"
ON public.b2b_offers FOR SELECT TO authenticated
USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view received offers"
ON public.b2b_offers FOR SELECT TO authenticated
USING (seller_id = auth.uid());

-- RPC to create a B2B offer
CREATE OR REPLACE FUNCTION public.create_b2b_offer(
    p_listing_id UUID,
    p_quantity INTEGER,
    p_price NUMERIC(12, 2),
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing RECORD;
    v_seller_id UUID;
    v_offer_id UUID;
    v_buyer_id UUID;
    v_chat_id UUID;
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify listing is B2B
    SELECT id, seller_id, is_b2b, min_order_quantity INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id;

    IF v_listing IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF NOT v_listing.is_b2b THEN
        RAISE EXCEPTION 'This listing is not a B2B offer';
    END IF;

    IF p_quantity < COALESCE(v_listing.min_order_quantity, 1) THEN
        RAISE EXCEPTION 'Quantity is below minimum order quantity';
    END IF;

    v_seller_id := v_listing.seller_id;
    IF v_buyer_id = v_seller_id THEN
        RAISE EXCEPTION 'Cannot make an offer on your own listing';
    END IF;

    -- Ensure chat exists between buyer and seller for this listing
    SELECT id INTO v_chat_id FROM public.chats 
    WHERE listing_id = p_listing_id AND buyer_id = v_buyer_id;

    IF v_chat_id IS NULL THEN
        INSERT INTO public.chats (listing_id, buyer_id, seller_id)
        VALUES (p_listing_id, v_buyer_id, v_seller_id)
        RETURNING id INTO v_chat_id;
    END IF;

    INSERT INTO public.b2b_offers (
        listing_id, buyer_id, seller_id, chat_id, requested_quantity, requested_price, buyer_message
    ) VALUES (
        p_listing_id, v_buyer_id, v_seller_id, v_chat_id, p_quantity, p_price, p_message
    ) RETURNING id INTO v_offer_id;

    -- Send notification to seller
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
        v_seller_id, 
        'NEW_B2B_OFFER', 
        'Новый запрос на оптовую закупку', 
        '/messages/' || v_chat_id
    );

    RETURN v_offer_id;
END;
$$;

-- RPC to update B2B offer status (seller counter, accept, reject)
CREATE OR REPLACE FUNCTION public.respond_b2b_offer(
    p_offer_id UUID,
    p_status public.b2b_offer_status,
    p_quantity INTEGER DEFAULT NULL,
    p_price NUMERIC(12, 2) DEFAULT NULL,
    p_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_offer FROM public.b2b_offers WHERE id = p_offer_id;
    IF v_offer IS NULL THEN
        RAISE EXCEPTION 'Offer not found';
    END IF;

    IF v_offer.status IN ('ACCEPTED', 'REJECTED') THEN
        RAISE EXCEPTION 'Cannot modify a closed offer';
    END IF;

    -- Seller responding
    IF v_uid = v_offer.seller_id THEN
        IF p_status = 'COUNTER_OFFER' THEN
            UPDATE public.b2b_offers
            SET status = 'COUNTER_OFFER',
                offered_quantity = p_quantity,
                offered_price = p_price,
                seller_message = p_message,
                updated_at = NOW()
            WHERE id = p_offer_id;

            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.buyer_id, 'B2B_COUNTER_OFFER', 'Поставщик предложил новые условия', '/messages/' || v_offer.chat_id);
            
        ELSIF p_status = 'ACCEPTED' THEN
            UPDATE public.b2b_offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.buyer_id, 'B2B_OFFER_ACCEPTED', 'Ваш запрос на закупку принят!', '/messages/' || v_offer.chat_id);
        ELSIF p_status = 'REJECTED' THEN
            UPDATE public.b2b_offers SET status = 'REJECTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.buyer_id, 'B2B_OFFER_REJECTED', 'Ваш запрос на закупку отклонен', '/messages/' || v_offer.chat_id);
        ELSE
            RAISE EXCEPTION 'Invalid status transition for seller';
        END IF;
    
    -- Buyer responding to a counter offer
    ELSIF v_uid = v_offer.buyer_id THEN
        IF v_offer.status != 'COUNTER_OFFER' THEN
            RAISE EXCEPTION 'No counter offer to respond to';
        END IF;
        
        IF p_status = 'ACCEPTED' THEN
            UPDATE public.b2b_offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.seller_id, 'B2B_OFFER_ACCEPTED', 'Покупатель принял встречные условия', '/messages/' || v_offer.chat_id);
        ELSIF p_status = 'REJECTED' THEN
            UPDATE public.b2b_offers SET status = 'REJECTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.seller_id, 'B2B_OFFER_REJECTED', 'Покупатель отклонил встречные условия', '/messages/' || v_offer.chat_id);
        ELSE
            RAISE EXCEPTION 'Invalid status transition for buyer';
        END IF;
    ELSE
        RAISE EXCEPTION 'Not a participant of this offer';
    END IF;
END;
$$;
