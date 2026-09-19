-- Chat Performance and Unread RPC

CREATE OR REPLACE FUNCTION public.get_chats_with_unread()
RETURNS TABLE (
    id UUID,
    updated_at TIMESTAMPTZ,
    buyer_id UUID,
    seller_id UUID,
    buyer_name TEXT,
    buyer_avatar TEXT,
    seller_name TEXT,
    seller_avatar TEXT,
    listing_title TEXT,
    listing_image TEXT,
    last_message_content TEXT,
    last_message_created_at TIMESTAMPTZ,
    last_message_sender_id UUID,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.updated_at,
        c.buyer_id,
        c.seller_id,
        pb.full_name AS buyer_name,
        pb.avatar_url AS buyer_avatar,
        ps.full_name AS seller_name,
        ps.avatar_url AS seller_avatar,
        l.title AS listing_title,
        (SELECT url FROM public.listing_images li WHERE li.listing_id = l.id ORDER BY order_index ASC LIMIT 1) AS listing_image,
        m.content AS last_message_content,
        m.created_at AS last_message_created_at,
        m.sender_id AS last_message_sender_id,
        (
            SELECT count(*) 
            FROM public.messages um 
            WHERE um.chat_id = c.id 
              AND um.is_read = false 
              AND um.sender_id != auth.uid()
        ) AS unread_count
    FROM public.chats c
    LEFT JOIN public.profiles pb ON c.buyer_id = pb.id
    LEFT JOIN public.profiles ps ON c.seller_id = ps.id
    LEFT JOIN public.listings l ON c.listing_id = l.id
    LEFT JOIN LATERAL (
        SELECT content, created_at, sender_id
        FROM public.messages
        WHERE chat_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) m ON true
    WHERE c.buyer_id = auth.uid() OR c.seller_id = auth.uid()
    ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
