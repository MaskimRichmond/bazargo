-- P0 SECURITY & CORE RELIABILITY AUDIT MIGRATION

-- 1. Harden Storage Policies
-- We must ensure users can only upload files to their own path: userId/listingId/...
DROP POLICY IF EXISTS "Authenticated users can upload product images." ON storage.objects;
CREATE POLICY "Authenticated users can upload product images." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can upload store images." ON storage.objects;
CREATE POLICY "Authenticated users can upload store images." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'store-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Abuse Prevention Foundation (Rate Limiting)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No public access
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(user_id, action_type, created_at);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_action_type VARCHAR,
    p_limit INT,
    p_window_minutes INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM public.rate_limits
    WHERE user_id = auth.uid()
      AND action_type = p_action_type
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
      
    IF v_count >= p_limit THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO public.rate_limits (user_id, action_type) VALUES (auth.uid(), p_action_type);
    RETURN TRUE;
END;
$$;

-- Apply rate limits to send_message_transaction
CREATE OR REPLACE FUNCTION public.send_message_transaction(
    p_chat_id UUID,
    p_content TEXT
) RETURNS public.messages AS $$
DECLARE
    v_message public.messages;
    v_rate_ok BOOLEAN;
BEGIN
    -- Abuse Check: 60 messages per 5 minutes
    SELECT public.check_rate_limit('send_message', 60, 5) INTO v_rate_ok;
    IF NOT v_rate_ok THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
    END IF;

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

-- 3. Audit Log Foundation
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'CREATED', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'listings' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (auth.uid(), 'STATUS_CHANGED', 'listings', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        ELSIF TG_TABLE_NAME = 'orders' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (auth.uid(), 'STATUS_CHANGED', 'orders', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        ELSIF TG_TABLE_NAME = 'stores' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (auth.uid(), 'STATUS_CHANGED', 'stores', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_listings ON public.listings;
CREATE TRIGGER tr_audit_listings
AFTER UPDATE ON public.listings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_orders ON public.orders;
CREATE TRIGGER tr_audit_orders
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_stores ON public.stores;
CREATE TRIGGER tr_audit_stores
AFTER UPDATE ON public.stores
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_trigger_func();

-- 4. Missing P0 Indexes
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_buyer_id ON public.requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_offers_request_id ON public.request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_offers_seller_id ON public.request_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_store_id ON public.follows(followed_store_id);

-- 5. Harden Phone RPC against direct access without proper context
-- ALREADY DONE in `stage75_show_phone.sql` and `security_profiles_privacy.sql`
ALTER TABLE public.listings ADD CONSTRAINT listings_quantity_check CHECK (quantity >= 0); 
ALTER TABLE public.listings ADD CONSTRAINT listings_price_check CHECK (price >= 0);  
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);  
ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_check CHECK (unit_price >= 0);  
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0); 
