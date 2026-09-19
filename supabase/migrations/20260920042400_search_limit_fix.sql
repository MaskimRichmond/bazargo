-- Fix for search limit and pagination filtering

-- 1. Create inline SQL function that returns SETOF listings to allow PostgREST query pushing
CREATE OR REPLACE FUNCTION public.search_catalog_listings(query_text TEXT)
RETURNS SETOF public.listings
LANGUAGE sql
STABLE
AS $$
    WITH q AS (
        SELECT 
            public.normalize_search_query(query_text) AS norm,
            public.translate_search_query(public.normalize_search_query(query_text)) AS trans
    )
    SELECT l.*
    FROM public.listings l, q
    WHERE 
        l.status = 'ACTIVE' 
        AND q.norm != ''
        AND (
            l.title % q.norm 
            OR l.title % q.trans
            OR l.description % q.norm
            OR l.description % q.trans
            OR lower(l.title) ILIKE '%' || q.norm || '%'
            OR lower(l.title) ILIKE '%' || q.trans || '%'
            OR similarity(lower(l.title), q.norm) > 0.15
            OR similarity(lower(l.title), q.trans) > 0.15
        )
    ORDER BY (
        (CASE 
            WHEN lower(l.title) ILIKE q.norm || '%' THEN 1.0 
            WHEN lower(l.title) ILIKE q.trans || '%' THEN 0.9
            ELSE 0.0 
        END)
        +
        (CASE
            WHEN lower(l.title) ILIKE '%' || q.norm || '%' THEN 0.8
            WHEN lower(l.title) ILIKE '%' || q.trans || '%' THEN 0.7
            ELSE 0.0
        END)
        +
        GREATEST(similarity(lower(l.title), q.norm), similarity(lower(l.title), q.trans)) * 1.0
        +
        GREATEST(similarity(lower(l.description), q.norm), similarity(lower(l.description), q.trans)) * 0.2
    ) DESC;
$$;

-- 2. Drop old function to avoid confusion
DROP FUNCTION IF EXISTS public.search_listings(TEXT);
