BEGIN;

-- Apply enforce_banned_user_block to remaining mutable user tables
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_profiles ON public.profiles;
CREATE TRIGGER tr_enforce_banned_user_block_profiles
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_listing_images ON public.listing_images;
CREATE TRIGGER tr_enforce_banned_user_block_listing_images
    BEFORE INSERT OR UPDATE OR DELETE ON public.listing_images
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_user_blocks ON public.user_blocks;
CREATE TRIGGER tr_enforce_banned_user_block_user_blocks
    BEFORE INSERT OR UPDATE OR DELETE ON public.user_blocks
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_b2b_applications ON public.b2b_applications;
CREATE TRIGGER tr_enforce_banned_user_block_b2b_applications
    BEFORE INSERT OR UPDATE OR DELETE ON public.b2b_applications
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_notifications ON public.notifications;
CREATE TRIGGER tr_enforce_banned_user_block_notifications
    BEFORE INSERT OR UPDATE OR DELETE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_order_items ON public.order_items;
CREATE TRIGGER tr_enforce_banned_user_block_order_items
    BEFORE INSERT OR UPDATE OR DELETE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

COMMIT;
