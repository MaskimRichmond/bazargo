-- PRE-STAGE-8 AUDIT HOTFIX MIGRATION

-- 1. Fix Categories RLS
DROP POLICY IF EXISTS "Admins can manage categories." ON public.categories;

CREATE POLICY "Admins can insert categories" 
ON public.categories FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "Admins can update categories" 
ON public.categories FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "Admins can delete categories" 
ON public.categories FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));


-- 2. Fix Stores RLS (Public Select)
DROP POLICY IF EXISTS "Stores are viewable by everyone." ON public.stores;

CREATE POLICY "Stores are viewable by everyone." 
ON public.stores FOR SELECT 
USING (status = 'APPROVED' OR auth.uid() = owner_id);


-- 3. Fix Storage Policies (Upload path check)
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


-- 4. Fix Requests RLS (Public Select)
DROP POLICY IF EXISTS "Requests are viewable by everyone." ON public.requests;
CREATE POLICY "Requests are viewable by everyone." 
ON public.requests FOR SELECT 
USING (status = 'OPEN' OR auth.uid() = buyer_id);


-- 5. Fix favorites RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'favorites' 
        AND policyname = 'Favorites are viewable by everyone.'
    ) THEN
        DROP POLICY "Favorites are viewable by everyone." ON public.favorites;
    END IF;
END $$;

CREATE POLICY "Users can view their own favorites." 
ON public.favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites." 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites." 
ON public.favorites FOR DELETE 
USING (auth.uid() = user_id);


-- 6. Fix products RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone." 
ON public.products FOR SELECT 
USING (true);

-- Only admins can mutate products
CREATE POLICY "Admins can insert products" 
ON public.products FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "Admins can update products" 
ON public.products FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));

CREATE POLICY "Admins can delete products" 
ON public.products FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));


-- 7. Fix chats RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats." 
ON public.chats FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can insert chats where they are the buyer." 
ON public.chats FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);


-- 8. Fix messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats." 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = messages.chat_id 
    AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
  )
);

CREATE POLICY "Users can insert messages in their chats." 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = messages.chat_id 
    AND (chats.buyer_id = auth.uid() OR chats.seller_id = auth.uid())
  )
);


-- 9. Fix notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications." 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications." 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

