-- MULTILINGUAL AND FUZZY PRODUCT SEARCH PIPELINE

-- 1. Insert new aliases
INSERT INTO public.search_synonyms (keyword, synonyms) VALUES
('samsung', ARRAY['самсунг']),
('xiaomi', ARRAY['ксяоми', 'сяоми']),
('huawei', ARRAY['хуавей']),
('poco', ARRAY['поко'])
ON CONFLICT (keyword) DO NOTHING;

-- 2. Normalization Function
CREATE OR REPLACE FUNCTION public.normalize_search_query(raw_query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    normalized TEXT;
BEGIN
    normalized := lower(raw_query);
    -- Replace hyphens and common punctuation with space
    normalized := regexp_replace(normalized, '[-_,./\\;:]', ' ', 'g');
    -- Replace multiple spaces with single space
    normalized := regexp_replace(normalized, '\s+', ' ', 'g');
    normalized := trim(normalized);
    RETURN normalized;
END;
$$;

-- 3. Transliteration / Alias Replacer
CREATE OR REPLACE FUNCTION public.translate_search_query(normalized_query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    word TEXT;
    translated_words TEXT[] := ARRAY[]::TEXT[];
    v_keyword TEXT;
BEGIN
    FOR word IN SELECT unnest(string_to_array(normalized_query, ' ')) LOOP
        IF word = '' THEN CONTINUE; END IF;

        -- Fast exact match
        SELECT keyword INTO v_keyword
        FROM public.search_synonyms 
        WHERE keyword = word OR word = ANY(synonyms)
        LIMIT 1;

        IF FOUND THEN
            translated_words := array_append(translated_words, v_keyword);
        ELSE
            -- Fuzzy match against dictionary if word is > 3 chars (e.g. "айфоон" -> "iphone")
            IF length(word) > 3 THEN
                SELECT s.keyword INTO v_keyword
                FROM (
                    SELECT keyword, keyword as term FROM public.search_synonyms
                    UNION ALL
                    SELECT keyword, unnest(synonyms) as term FROM public.search_synonyms
                ) s
                WHERE similarity(s.term, word) > 0.4
                ORDER BY similarity(s.term, word) DESC
                LIMIT 1;

                IF FOUND THEN
                    translated_words := array_append(translated_words, v_keyword);
                ELSE
                    translated_words := array_append(translated_words, word);
                END IF;
            ELSE
                translated_words := array_append(translated_words, word);
            END IF;
        END IF;
    END LOOP;

    RETURN array_to_string(translated_words, ' ');
END;
$$;

-- 4. Rewrite search_listings RPC
CREATE OR REPLACE FUNCTION public.search_listings(query_text TEXT)
RETURNS TABLE (id UUID, rank REAL)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_normalized TEXT;
    v_translated TEXT;
BEGIN
    v_normalized := public.normalize_search_query(query_text);
    v_translated := public.translate_search_query(v_normalized);

    -- If empty search, return nothing
    IF v_normalized = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT l.id,
           (
             -- Exact/Prefix matches
             (CASE 
                WHEN lower(l.title) ILIKE v_normalized || '%' THEN 1.0 
                WHEN lower(l.title) ILIKE v_translated || '%' THEN 0.9
                ELSE 0.0 
              END)
             +
             -- High score for substring match (e.g. "Apple iPhone 15" contains "iphone 15")
             (CASE
                WHEN lower(l.title) ILIKE '%' || v_normalized || '%' THEN 0.8
                WHEN lower(l.title) ILIKE '%' || v_translated || '%' THEN 0.7
                ELSE 0.0
              END)
             +
             -- Trigram Similarity Match on Title
             GREATEST(
                 similarity(lower(l.title), v_normalized),
                 similarity(lower(l.title), v_translated)
             ) * 1.0
             +
             -- Trigram Similarity Match on Description (lower weight)
             GREATEST(
                 similarity(lower(l.description), v_normalized),
                 similarity(lower(l.description), v_translated)
             ) * 0.2
           )::REAL as rank
    FROM public.listings l
    WHERE 
        l.status = 'ACTIVE' 
        AND (
            -- Trigram match
            l.title % v_normalized 
            OR l.title % v_translated
            OR l.description % v_normalized
            OR l.description % v_translated
            -- Fallback ILIKE to ensure we catch strings where trigram fails (e.g. very short words)
            OR lower(l.title) ILIKE '%' || v_normalized || '%'
            OR lower(l.title) ILIKE '%' || v_translated || '%'
            -- Also support fuzzy matching with a lower threshold manually
            OR similarity(lower(l.title), v_normalized) > 0.15
            OR similarity(lower(l.title), v_translated) > 0.15
        )
    ORDER BY rank DESC
    LIMIT 500;
END;
$$;
