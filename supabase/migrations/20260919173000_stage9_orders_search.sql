-- STAGE 9: Orders, Cart, Inventory, Smart Search

-- 1. Create Enums
CREATE TYPE public.order_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- 2. Create Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    status public.order_status DEFAULT 'PENDING' NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 3. Create Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    title_snapshot VARCHAR(255) NOT NULL,
    image_url_snapshot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create Cart Items Table
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, listing_id)
);

-- 5. RLS for Cart Items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = seller_id);
-- No INSERT/UPDATE for clients, only through secure server actions (bypassing RLS with service role or relying on backend auth check)
CREATE POLICY "Buyers can insert their orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update orders" ON public.orders
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 7. RLS for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );
CREATE POLICY "Buyers can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.buyer_id = auth.uid()
        )
    );

-- 8. Atomic Inventory Logic (RPC)
CREATE OR REPLACE FUNCTION public.complete_order(order_id_param UUID, executing_user UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_listing RECORD;
BEGIN
    -- Get order and lock it for update to prevent concurrent completions
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Security check: only the seller can complete
    IF v_order.seller_id != executing_user THEN
        RAISE EXCEPTION 'Unauthorized: only seller can complete this order';
    END IF;

    -- Idempotency and State Machine check
    IF v_order.status = 'COMPLETED' THEN
        -- Safely ignore double-completion
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

-- 9. Smart Search & pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS listings_title_trgm_idx ON public.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_desc_trgm_idx ON public.listings USING gin (description gin_trgm_ops);

-- 10. Synonyms Table
CREATE TABLE public.search_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(100) NOT NULL UNIQUE,
    synonyms TEXT[] NOT NULL
);

INSERT INTO public.search_synonyms (keyword, synonyms) VALUES
('клавиатура', ARRAY['клава', 'клавы']),
('ноутбук', ARRAY['ноут', 'ноуты']),
('iphone', ARRAY['айфон', 'айфоны']),
('телефон', ARRAY['мобила', 'смартфон', 'смарт'])
ON CONFLICT (keyword) DO NOTHING;

-- 11. RPC for updating search synonyms via admin if needed
CREATE OR REPLACE FUNCTION public.get_synonyms(query_term TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
    res TEXT[];
BEGIN
    SELECT synonyms INTO res FROM public.search_synonyms WHERE keyword = query_term LIMIT 1;
    RETURN res;
END;
$$;
