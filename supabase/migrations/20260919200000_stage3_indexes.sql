-- STAGE 3: Performance Indexes and Concurrency Constraints

-- 1. Unique Constraints to prevent duplicate data
ALTER TABLE public.favorites 
ADD CONSTRAINT favorites_user_listing_unique UNIQUE (user_id, listing_id);

ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_user_listing_unique UNIQUE (user_id, listing_id);

ALTER TABLE public.chats 
ADD CONSTRAINT chats_buyer_seller_listing_unique UNIQUE (buyer_id, seller_id, listing_id);

-- 2. Foreign Key Indexes (to prevent sequential scans on joins)
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_store_id ON public.listings(store_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

CREATE INDEX IF NOT EXISTS idx_chats_buyer_id ON public.chats(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chats_seller_id ON public.chats(seller_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages(chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_b2b_applications_user_id ON public.b2b_applications(user_id);

-- 3. Atomic Message Sending RPC
-- To avoid 2 separate round-trips from the client and guarantee consistency
CREATE OR REPLACE FUNCTION public.send_message_transaction(
    p_chat_id UUID,
    p_content TEXT
) RETURNS public.messages AS $$
DECLARE
    v_message public.messages;
BEGIN
    -- 1. Insert message
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (p_chat_id, auth.uid(), p_content)
    RETURNING * INTO v_message;

    -- 2. Update chat updated_at
    UPDATE public.chats
    SET updated_at = NOW()
    WHERE id = p_chat_id;

    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
