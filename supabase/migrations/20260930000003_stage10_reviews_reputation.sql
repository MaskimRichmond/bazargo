-- Migration: Reviews & Reputation System
-- Description: Adds tables and logic for leaving reviews on completed/cancelled orders.

-- 1. Create review_status enum
CREATE TYPE public.review_status AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- 2. Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    reply TEXT,
    status public.review_status DEFAULT 'PUBLISHED' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Ensure one review per order by a reviewer
    UNIQUE (reviewer_id, order_id)
);

-- Index for quickly fetching user or store reviews
CREATE INDEX idx_reviews_target_user ON public.reviews(target_user_id) WHERE status = 'PUBLISHED';
CREATE INDEX idx_reviews_target_store ON public.reviews(target_store_id) WHERE status = 'PUBLISHED';
CREATE INDEX idx_reviews_order ON public.reviews(order_id);

-- 3. Update Profiles and Stores with cached rating
ALTER TABLE public.profiles 
  ADD COLUMN rating NUMERIC(3, 2) DEFAULT 0.00,
  ADD COLUMN reviews_count INTEGER DEFAULT 0;

ALTER TABLE public.stores 
  ADD COLUMN rating NUMERIC(3, 2) DEFAULT 0.00,
  ADD COLUMN reviews_count INTEGER DEFAULT 0;

-- 4. RPC to calculate and update rating
CREATE OR REPLACE FUNCTION public.update_entity_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update User Rating
    IF NEW.target_user_id IS NOT NULL THEN
        WITH stats AS (
            SELECT 
                COUNT(*) as cnt,
                COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews
            WHERE target_user_id = NEW.target_user_id AND status = 'PUBLISHED'
        )
        UPDATE public.profiles
        SET rating = ROUND((SELECT avg_rating FROM stats), 2),
            reviews_count = (SELECT cnt FROM stats)
        WHERE id = NEW.target_user_id;
    END IF;

    -- Update Store Rating
    IF NEW.target_store_id IS NOT NULL THEN
        WITH stats AS (
            SELECT 
                COUNT(*) as cnt,
                COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews
            WHERE target_store_id = NEW.target_store_id AND status = 'PUBLISHED'
        )
        UPDATE public.stores
        SET rating = ROUND((SELECT avg_rating FROM stats), 2),
            reviews_count = (SELECT cnt FROM stats)
        WHERE id = NEW.target_store_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to auto-update rating on review changes
CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE OF rating, status ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_entity_rating();

-- Handle deletes
CREATE OR REPLACE FUNCTION public.update_entity_rating_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.target_user_id IS NOT NULL THEN
        WITH stats AS (
            SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews WHERE target_user_id = OLD.target_user_id AND status = 'PUBLISHED'
        )
        UPDATE public.profiles SET rating = ROUND((SELECT avg_rating FROM stats), 2), reviews_count = (SELECT cnt FROM stats) WHERE id = OLD.target_user_id;
    END IF;
    IF OLD.target_store_id IS NOT NULL THEN
        WITH stats AS (
            SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews WHERE target_store_id = OLD.target_store_id AND status = 'PUBLISHED'
        )
        UPDATE public.stores SET rating = ROUND((SELECT avg_rating FROM stats), 2), reviews_count = (SELECT cnt FROM stats) WHERE id = OLD.target_store_id;
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_update_rating_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_entity_rating_on_delete();

-- 5. RLS for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read PUBLISHED reviews
CREATE POLICY "Public can read published reviews"
ON public.reviews FOR SELECT
USING (status = 'PUBLISHED');

-- Reviewers can read their own reviews regardless of status
CREATE POLICY "Users can read own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (reviewer_id = auth.uid());

-- Target users can read their own reviews regardless of status
CREATE POLICY "Targets can read own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (target_user_id = auth.uid());

-- 6. Secure RPC for submitting a review
-- This RPC checks order ownership, status, and prevents spoofing.
CREATE OR REPLACE FUNCTION public.submit_review(
    p_order_id UUID,
    p_rating INTEGER,
    p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_review_id UUID;
    v_reviewer_id UUID;
    v_target_user_id UUID;
    v_target_store_id UUID;
BEGIN
    v_reviewer_id := auth.uid();
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;

    -- Fetch order and verify participation
    SELECT id, buyer_id, seller_id, store_id, status 
    INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Reviews can only be left on completed orders. For issues with cancelled orders, please submit a report.';
    END IF;

    -- Determine target and verify reviewer was part of the transaction
    IF v_reviewer_id = v_order.buyer_id THEN
        v_target_user_id := v_order.seller_id;
        v_target_store_id := v_order.store_id;
    ELSIF v_reviewer_id = v_order.seller_id THEN
        -- Sellers can review buyers too (reputation goes both ways)
        v_target_user_id := v_order.buyer_id;
        v_target_store_id := NULL;
    ELSE
        RAISE EXCEPTION 'You are not part of this order';
    END IF;

    -- Insert review (unique constraint will throw if already reviewed)
    INSERT INTO public.reviews (
        reviewer_id, target_user_id, target_store_id, order_id, rating, comment
    ) VALUES (
        v_reviewer_id, v_target_user_id, v_target_store_id, p_order_id, p_rating, p_comment
    ) RETURNING id INTO v_review_id;

    RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) TO authenticated;

-- 7. Secure RPC for replying to a review
CREATE OR REPLACE FUNCTION public.reply_to_review(
    p_review_id UUID,
    p_reply TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_user_id UUID;
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT target_user_id INTO v_target_user_id FROM public.reviews WHERE id = p_review_id;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Review not found';
    END IF;

    IF v_target_user_id != v_uid THEN
        RAISE EXCEPTION 'You can only reply to reviews directed at you';
    END IF;

    UPDATE public.reviews
    SET reply = p_reply, updated_at = NOW()
    WHERE id = p_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_review(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reply_to_review(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.reply_to_review(UUID, TEXT) TO authenticated;
