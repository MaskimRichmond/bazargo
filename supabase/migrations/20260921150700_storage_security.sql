-- ==========================================
-- STAGE 3 (SECURITY P0): STORAGE SECURITY
-- ==========================================

-- 1. HARDEN PRODUCT-IMAGES BUCKET POLICIES
DROP POLICY IF EXISTS "Authenticated users can upload product images." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product images." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own product images." ON storage.objects;

-- We use (storage.foldername(name))[1] to get the root folder name, which should be the userId.
-- We use (storage.foldername(name))[2] to get the listingId.
CREATE POLICY "Authenticated users can upload product images." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM public.listings WHERE seller_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own product images." 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'product-images' 
    AND auth.uid() = owner
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own product images." 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'product-images' 
    AND auth.uid() = owner
    AND (storage.foldername(name))[1] = auth.uid()::text
);


-- 2. HARDEN STORE-IMAGES BUCKET POLICIES
DROP POLICY IF EXISTS "Authenticated users can upload store images." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own store images." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own store images." ON storage.objects;

-- For store logos, the path is now {userId}/{timestamp}.{ext}, so foldername[1] is userId
CREATE POLICY "Authenticated users can upload store images." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'store-images' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own store images." 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'store-images' 
    AND auth.uid() = owner
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own store images." 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'store-images' 
    AND auth.uid() = owner
    AND (storage.foldername(name))[1] = auth.uid()::text
);
