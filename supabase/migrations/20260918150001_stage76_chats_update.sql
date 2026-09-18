BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- Allow chat members to update the chat (e.g. bump updated_at)
DROP POLICY IF EXISTS "Users can update their own chats." ON public.chats;
CREATE POLICY "Users can update their own chats." 
ON public.chats FOR UPDATE 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

COMMIT;
