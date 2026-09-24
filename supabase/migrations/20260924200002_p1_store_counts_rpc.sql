CREATE OR REPLACE FUNCTION public.get_store_active_listings_counts(store_ids UUID[])
RETURNS TABLE(store_id UUID, active_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT l.store_id, COUNT(*) as active_count
    FROM public.listings l
    WHERE l.store_id = ANY(store_ids)
      AND l.status = 'ACTIVE'
    GROUP BY l.store_id;
END;
$$;
