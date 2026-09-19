
CREATE POLICY "Images are viewable by everyone." 
  ON listing_images FOR SELECT USING (true);
CREATE POLICY "Users can insert images for their own listings." 
  ON listing_images FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = listing_images.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their own listing images." 
  ON listing_images FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = listing_images.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete their own listing images." 
  ON listing_images FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = listing_images.listing_id 
      AND listings.seller_id = auth.uid()
    )
  );
CREATE POLICY "Product images are publicly accessible." 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'product-images');
CREATE POLICY "Authenticated users can upload product images." 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own product images." 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'product-images' AND auth.uid() = owner);
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Listings are viewable by everyone." ON listings FOR SELECT USING (status = 'ACTIVE' OR auth.uid() = seller_id);
CREATE POLICY "Users can insert own listings." ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own listings." ON listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Stores are viewable by everyone." ON stores FOR SELECT USING (status = 'APPROVED' OR auth.uid() = owner_id);
CREATE POLICY "Users can create own store." ON stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own store." ON stores FOR UPDATE USING (auth.uid() = owner_id);
        CREATE POLICY "Categories are viewable by everyone." 
        ON public.categories FOR SELECT 
        USING (true);
        CREATE POLICY "Admins can manage categories." 
        ON public.categories FOR ALL 
        USING (auth.role() = 'authenticated'); -- Simplified for MVP, ideally check role = 'ADMIN'
        CREATE POLICY "Store images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'store-images');
        CREATE POLICY "Authenticated users can upload store images." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-images' AND auth.role() = 'authenticated');
        CREATE POLICY "Users can update their own store images." ON storage.objects FOR UPDATE USING (bucket_id = 'store-images' AND auth.uid() = owner);
        CREATE POLICY "Users can delete their own store images." ON storage.objects FOR DELETE USING (bucket_id = 'store-images' AND auth.uid() = owner);
        CREATE POLICY "Stores are viewable by everyone." ON public.stores FOR SELECT USING (true);
        CREATE POLICY "Users can insert their own store." ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
        CREATE POLICY "Users can update their own store." ON public.stores FOR UPDATE USING (auth.uid() = owner_id);
        CREATE POLICY "Follows are viewable by everyone." ON public.follows FOR SELECT USING (true);
        CREATE POLICY "Users can insert their own follows." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
        CREATE POLICY "Users can delete their own follows." ON public.follows FOR DELETE USING (auth.uid() = follower_id);
        CREATE POLICY "Requests are viewable by everyone." ON public.requests FOR SELECT USING (true);
        CREATE POLICY "Users can insert their own requests." ON public.requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);
        CREATE POLICY "Users can update their own requests." ON public.requests FOR UPDATE USING (auth.uid() = buyer_id);
        CREATE POLICY "Users can delete their own requests." ON public.requests FOR DELETE USING (auth.uid() = buyer_id);
        CREATE POLICY "Users can view offers for their requests or their own offers." 
          ON public.request_offers FOR SELECT 
          USING (
            auth.uid() = seller_id OR 
            auth.uid() = (SELECT buyer_id FROM public.requests WHERE id = request_id)
          );
        CREATE POLICY "Sellers can insert offers." 
          ON public.request_offers FOR INSERT 
          WITH CHECK (auth.uid() = seller_id);
        CREATE POLICY "Sellers can update their own offers." 
          ON public.request_offers FOR UPDATE 
          USING (auth.uid() = seller_id);
        CREATE POLICY "Sellers can delete their own offers." 
          ON public.request_offers FOR DELETE 
          USING (auth.uid() = seller_id);
CREATE POLICY "Admins can insert categories" 
ON public.categories FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins can update categories" 
ON public.categories FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins can delete categories" 
ON public.categories FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Stores are viewable by everyone." 
ON public.stores FOR SELECT 
USING (status = 'APPROVED' OR auth.uid() = owner_id);
CREATE POLICY "Authenticated users can upload product images." 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Authenticated users can upload store images." 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'store-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Requests are viewable by everyone." 
ON public.requests FOR SELECT 
USING (status = 'OPEN' OR auth.uid() = buyer_id);
CREATE POLICY "Users can view their own favorites." 
ON public.favorites FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites." 
ON public.favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites." 
ON public.favorites FOR DELETE 
USING (auth.uid() = user_id);
CREATE POLICY "Products are viewable by everyone." 
ON public.products FOR SELECT 
USING (true);
CREATE POLICY "Admins can insert products" 
ON public.products FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins can update products" 
ON public.products FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Admins can delete products" 
ON public.products FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'ADMIN'));
CREATE POLICY "Users can view their own chats." 
ON public.chats FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can insert chats where they are the buyer." 
ON public.chats FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);
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
CREATE POLICY "Users can view their own notifications." 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications." 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);
CREATE POLICY "Sellers can insert offers." 
  ON public.request_offers FOR INSERT 
  WITH CHECK (
    auth.uid() = seller_id AND
    auth.uid() = (SELECT seller_id FROM public.listings WHERE id = listing_id)
  );
        CREATE POLICY "Users can view offers for their requests or their own offers." 
          ON public.request_offers FOR SELECT 
          USING (
            auth.uid() = seller_id OR 
            auth.uid() = (SELECT buyer_id FROM public.requests WHERE id = request_id)
          );
CREATE POLICY "Users can view their own follows or store follows" 
ON public.follows FOR SELECT 
USING (auth.uid() = follower_id OR followed_store_id IS NOT NULL);
        CREATE POLICY "Users can insert their own follows." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
        CREATE POLICY "Users can delete their own follows." ON public.follows FOR DELETE USING (auth.uid() = follower_id);
CREATE POLICY "Users can update their own chats." 
ON public.chats FOR UPDATE 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Users can view their own b2b applications" 
ON public.b2b_applications FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own b2b applications" 
ON public.b2b_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Buyers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Buyers can insert their orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update orders" ON public.orders
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Participants can view order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        )
    );
CREATE POLICY "Buyers can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND orders.buyer_id = auth.uid()
        )
    );