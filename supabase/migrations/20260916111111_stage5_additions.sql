-- Add new listing status if it doesn't exist
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'OUT_OF_STOCK';

-- Add new listing types
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'SINGLE';
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'INVENTORY';

-- Enable RLS on listing_images
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

-- listing_images RLS Policies
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

-- Create Storage Bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for product-images bucket
CREATE POLICY "Product images are publicly accessible." 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images." 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own product images." 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'product-images' AND auth.uid() = owner);

-- Seed basic categories (if empty)
INSERT INTO categories (name, slug, icon_name)
SELECT * FROM (
    VALUES 
        ('Электроника', 'electronics', 'Smartphone'),
        ('Авто', 'auto', 'Car'),
        ('Квартиры', 'real-estate', 'Home'),
        ('Одежда', 'clothing', 'Shirt'),
        ('Мебель', 'furniture', 'Sofa'),
        ('Спорт', 'sport', 'Dumbbell'),
        ('Услуги', 'services', 'Wrench'),
        ('Прочее', 'other', 'Package')
) AS v(name, slug, icon_name)
WHERE NOT EXISTS (SELECT 1 FROM categories);
