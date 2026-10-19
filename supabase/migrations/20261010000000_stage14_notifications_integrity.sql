-- ==========================================
-- STAGE 14: NOTIFICATIONS INTEGRITY & FKs
-- ==========================================

-- 1. Add specific foreign keys to replace the generic 'link' string
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS target_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE;

-- 2. Backfill the new columns from the existing link column if possible
-- We'll try to extract UUIDs from URLs like '/orders/uuid', '/chats/uuid', '/b2b/requests/uuid'
UPDATE public.notifications
SET target_order_id = (substring(link from '/orders/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::UUID
WHERE link LIKE '/orders/%';

UPDATE public.notifications
SET target_chat_id = (substring(link from '/chats/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'))::UUID
WHERE link LIKE '/chats/%';

-- 3. Add check constraint to ensure at most one target is set (or none if it's a general system notification)
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_single_target_check 
    CHECK (
        num_nonnulls(target_order_id, target_chat_id, target_listing_id, target_request_id) <= 1
    );

-- 4. Add index for is_read (Performance optimization for unread count queries)
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;

-- 5. Add indexes for the new FKs
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(target_order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_chat_id ON public.notifications(target_chat_id);

-- 6. Add indexes on existing polymorphic tables to avoid seq scans
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- 7. Add missing indexes for b2b_offers and reviews as identified in DB Architect audit
CREATE INDEX IF NOT EXISTS idx_b2b_offers_listing_id ON public.b2b_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_b2b_offers_buyer_id ON public.b2b_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_offers_seller_id ON public.b2b_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
