-- 20260916111111_stage5_additions.sql
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


-- 20260916_initial_schema.sql
﻿-- Initial Schema for BazarGo MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum Types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE store_status AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');
CREATE TYPE listing_status AS ENUM ('ACTIVE', 'DEACTIVATED', 'SOLD', 'BLOCKED');
CREATE TYPE listing_type AS ENUM ('SIMPLE', 'QUANTITY');
CREATE TYPE item_condition AS ENUM ('NEW', 'USED_LIKE_NEW', 'USED_GOOD', 'USED_FAIR', 'FOR_PARTS');
CREATE TYPE request_status AS ENUM ('ACTIVE', 'CLOSED');

-- 1. Profiles Table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(100),
    avatar_url TEXT,
    city VARCHAR(100) DEFAULT 'Bishkek',
    role user_role DEFAULT 'USER',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    icon_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stores Table
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    logo_url TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    city VARCHAR(100) NOT NULL,
    status store_status DEFAULT 'PENDING',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products Catalog (Optional for Listings, useful for normalization)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(100),
    model VARCHAR(150) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Listings Table (The main ad entity)
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    condition item_condition NOT NULL,
    quantity INTEGER DEFAULT 1,
    status listing_status DEFAULT 'ACTIVE',
    listing_type listing_type DEFAULT 'SIMPLE',
    city VARCHAR(100) NOT NULL,
    delivery_methods JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Listing Images
CREATE TABLE listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Favorites Table
CREATE TABLE favorites (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

-- 8. Follows Table (following stores or users)
CREATE TABLE follows (
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    followed_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    followed_store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (followed_profile_id IS NOT NULL AND followed_store_id IS NULL) OR
        (followed_profile_id IS NULL AND followed_store_id IS NOT NULL)
    ),
    UNIQUE(follower_id, followed_profile_id),
    UNIQUE(follower_id, followed_store_id)
);

-- 9. Chat and Messages
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id, buyer_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Requests ("РќСѓР¶РµРЅ С‚РѕРІР°СЂ")
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT NOT NULL,
    max_price NUMERIC(12, 2),
    condition item_condition,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    status request_status DEFAULT 'ACTIVE',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE request_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_stores_modtime BEFORE UPDATE ON stores FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_listings_modtime BEFORE UPDATE ON listings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_chats_modtime BEFORE UPDATE ON chats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_requests_modtime BEFORE UPDATE ON requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name, avatar_url)
  VALUES (
    new.id,
    new.phone,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable RLS (Row Level Security) on basic tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Listings RLS
CREATE POLICY "Listings are viewable by everyone." ON listings FOR SELECT USING (status = 'ACTIVE' OR auth.uid() = seller_id);
CREATE POLICY "Users can insert own listings." ON listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update own listings." ON listings FOR UPDATE USING (auth.uid() = seller_id);

-- Stores RLS
CREATE POLICY "Stores are viewable by everyone." ON stores FOR SELECT USING (status = 'APPROVED' OR auth.uid() = owner_id);
CREATE POLICY "Users can create own store." ON stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own store." ON stores FOR UPDATE USING (auth.uid() = owner_id);



-- 20260917111111_auth_email_update.sql
﻿-- Add email to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Update trigger to handle email and phone gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.phone,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 20260917111112_safe_categories.sql
-- Enable UUID extension just in case it's missing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Safely create categories table if it was skipped or missing
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    icon_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'categories' 
        AND policyname = 'Categories are viewable by everyone.'
    ) THEN
        CREATE POLICY "Categories are viewable by everyone." 
        ON public.categories FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Allow only authenticated users to modify categories (for future admin panel)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'categories' 
        AND policyname = 'Admins can manage categories.'
    ) THEN
        CREATE POLICY "Admins can manage categories." 
        ON public.categories FOR ALL 
        USING (auth.role() = 'authenticated'); -- Simplified for MVP, ideally check role = 'ADMIN'
    END IF;
END $$;

-- Seed minimal required categories
INSERT INTO public.categories (name, slug, icon_name)
SELECT * FROM (
    VALUES 
        ('Электроника', 'electronics', 'Smartphone'),
        ('Телефоны', 'phones', 'Phone'),
        ('Компьютеры', 'computers', 'Laptop'),
        ('Авто', 'auto', 'Car'),
        ('Недвижимость', 'real-estate', 'Home'),
        ('Одежда и обувь', 'clothing', 'Shirt'),
        ('Дом и сад', 'home-garden', 'TreePine'),
        ('Детские товары', 'kids', 'Baby'),
        ('Красота и здоровье', 'beauty', 'Heart'),
        ('Спорт и отдых', 'sport', 'Dumbbell'),
        ('Животные', 'pets', 'Dog'),
        ('Работа', 'jobs', 'Briefcase'),
        ('Услуги', 'services', 'Wrench'),
        ('Бизнес и оборудование', 'business', 'Building')
) AS v(name, slug, icon_name)
ON CONFLICT (slug) DO NOTHING;


-- 20260917122222_fix_category_encoding.sql
-- Fix category names corrupted by mojibake

UPDATE public.categories SET name = 'Электроника' WHERE slug = 'electronics';
UPDATE public.categories SET name = 'Телефоны' WHERE slug = 'phones';
UPDATE public.categories SET name = 'Компьютеры' WHERE slug = 'computers';
UPDATE public.categories SET name = 'Авто' WHERE slug = 'auto';
UPDATE public.categories SET name = 'Недвижимость' WHERE slug = 'real-estate';
UPDATE public.categories SET name = 'Одежда и обувь' WHERE slug = 'clothing';
UPDATE public.categories SET name = 'Дом и сад' WHERE slug = 'home-garden';
UPDATE public.categories SET name = 'Детские товары' WHERE slug = 'kids';
UPDATE public.categories SET name = 'Красота и здоровье' WHERE slug = 'beauty';
UPDATE public.categories SET name = 'Спорт и отдых' WHERE slug = 'sport';
UPDATE public.categories SET name = 'Животные' WHERE slug = 'pets';
UPDATE public.categories SET name = 'Работа' WHERE slug = 'jobs';
UPDATE public.categories SET name = 'Услуги' WHERE slug = 'services';
UPDATE public.categories SET name = 'Бизнес и оборудование' WHERE slug = 'business';
UPDATE public.categories SET name = 'Мебель' WHERE slug = 'furniture';
UPDATE public.categories SET name = 'Прочее' WHERE slug = 'other';


-- 20260917133333_add_archived_status.sql
-- Add ARCHIVED status to listing_status enum
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'ARCHIVED';


-- 20260918000000_category_hierarchy.sql
-- Create hierarchy for electronics
UPDATE public.categories 
SET parent_id = (SELECT id FROM public.categories WHERE slug = 'electronics') 
WHERE slug IN ('phones', 'computers');

-- Fix icons for electronics
UPDATE public.categories SET icon_name = 'Monitor' WHERE slug = 'electronics';
UPDATE public.categories SET icon_name = 'Smartphone' WHERE slug = 'phones';
UPDATE public.categories SET icon_name = 'Laptop' WHERE slug = 'computers';


-- 20260918111111_stores_update.sql
-- 1. Add missing columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS slug VARCHAR(150) UNIQUE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS email VARCHAR(100);

-- 2. Create Storage Bucket for store images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for store-images bucket
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store images are publicly accessible.') THEN
        CREATE POLICY "Store images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'store-images');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload store images.') THEN
        CREATE POLICY "Authenticated users can upload store images." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-images' AND auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own store images.') THEN
        CREATE POLICY "Users can update their own store images." ON storage.objects FOR UPDATE USING (bucket_id = 'store-images' AND auth.uid() = owner);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own store images.') THEN
        CREATE POLICY "Users can delete their own store images." ON storage.objects FOR DELETE USING (bucket_id = 'store-images' AND auth.uid() = owner);
    END IF;
END $$;

-- 3. Stores Table RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Stores are viewable by everyone.' AND tablename = 'stores') THEN
        CREATE POLICY "Stores are viewable by everyone." ON public.stores FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own store.' AND tablename = 'stores') THEN
        CREATE POLICY "Users can insert their own store." ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own store.' AND tablename = 'stores') THEN
        CREATE POLICY "Users can update their own store." ON public.stores FOR UPDATE USING (auth.uid() = owner_id);
    END IF;
END $$;

-- 4. Follows Table RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Follows are viewable by everyone.' AND tablename = 'follows') THEN
        CREATE POLICY "Follows are viewable by everyone." ON public.follows FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own follows.' AND tablename = 'follows') THEN
        CREATE POLICY "Users can insert their own follows." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own follows.' AND tablename = 'follows') THEN
        CREATE POLICY "Users can delete their own follows." ON public.follows FOR DELETE USING (auth.uid() = follower_id);
    END IF;
END $$;


-- 20260918120000_requests_stage.sql
-- 1. Rename columns to match requirements
ALTER TABLE public.requests RENAME COLUMN user_id TO buyer_id;
ALTER TABLE public.requests RENAME COLUMN max_price TO budget_max;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS budget_min NUMERIC(12, 2);

-- 2. Add missing enum values to request_status
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'CANCELLED';



-- 3. RLS for Requests
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Requests are viewable by everyone.') THEN
        CREATE POLICY "Requests are viewable by everyone." ON public.requests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own requests.') THEN
        CREATE POLICY "Users can insert their own requests." ON public.requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own requests.') THEN
        CREATE POLICY "Users can update their own requests." ON public.requests FOR UPDATE USING (auth.uid() = buyer_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own requests.') THEN
        CREATE POLICY "Users can delete their own requests." ON public.requests FOR DELETE USING (auth.uid() = buyer_id);
    END IF;
END $$;

-- 4. RLS for Request Offers
ALTER TABLE public.request_offers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view offers for their requests or their own offers.') THEN
        CREATE POLICY "Users can view offers for their requests or their own offers." 
          ON public.request_offers FOR SELECT 
          USING (
            auth.uid() = seller_id OR 
            auth.uid() = (SELECT buyer_id FROM public.requests WHERE id = request_id)
          );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sellers can insert offers.') THEN
        CREATE POLICY "Sellers can insert offers." 
          ON public.request_offers FOR INSERT 
          WITH CHECK (auth.uid() = seller_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sellers can update their own offers.') THEN
        CREATE POLICY "Sellers can update their own offers." 
          ON public.request_offers FOR UPDATE 
          USING (auth.uid() = seller_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Sellers can delete their own offers.') THEN
        CREATE POLICY "Sellers can delete their own offers." 
          ON public.request_offers FOR DELETE 
          USING (auth.uid() = seller_id);
    END IF;
END $$;

-- 5. Ensure UNIQUE constraint to prevent duplicate offers
ALTER TABLE public.request_offers ADD CONSTRAINT unique_request_listing UNIQUE (request_id, listing_id);


-- 20260918120001_requests_stage_default.sql
-- Change default status from ACTIVE to OPEN
ALTER TABLE public.requests ALTER COLUMN status SET DEFAULT 'OPEN';

-- If there are any 'ACTIVE' rows, change them to 'OPEN'
UPDATE public.requests SET status = 'OPEN' WHERE status = 'ACTIVE';


-- 20260918130000_pre_stage_8_audit.sql
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



-- 20260918130001_final_pre_stage8_security.sql
-- FINAL PRE-STAGE-8 SECURITY MIGRATION

-- 1. REQUEST_OFFERS RLS
ALTER TABLE public.request_offers ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if any
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'request_offers' 
        AND policyname = 'Sellers can insert offers.'
    ) THEN
        DROP POLICY "Sellers can insert offers." ON public.request_offers;
    END IF;
END $$;

-- Create secure INSERT policy checking both seller_id and listing ownership
CREATE POLICY "Sellers can insert offers." 
  ON public.request_offers FOR INSERT 
  WITH CHECK (
    auth.uid() = seller_id AND
    auth.uid() = (SELECT seller_id FROM public.listings WHERE id = listing_id)
  );

-- Keep the other policies for request_offers as they are secure (uid = seller_id / buyer_id)
-- Just ensuring the SELECT policy is intact for buyer and seller
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'request_offers' 
        AND policyname = 'Users can view offers for their requests or their own offers.'
    ) THEN
        CREATE POLICY "Users can view offers for their requests or their own offers." 
          ON public.request_offers FOR SELECT 
          USING (
            auth.uid() = seller_id OR 
            auth.uid() = (SELECT buyer_id FROM public.requests WHERE id = request_id)
          );
    END IF;
END $$;


-- 2. FOLLOWS RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Follows are viewable by everyone.'
    ) THEN
        DROP POLICY "Follows are viewable by everyone." ON public.follows;
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Users can view their own follows or store follows'
    ) THEN
        DROP POLICY "Users can view their own follows or store follows" ON public.follows;
    END IF;
END $$;

-- Selective SELECT: users see their own follows, and store follows remain public for the counter
CREATE POLICY "Users can view their own follows or store follows" 
ON public.follows FOR SELECT 
USING (auth.uid() = follower_id OR followed_store_id IS NOT NULL);

-- Ensure INSERT/DELETE are strictly auth.uid() = follower_id
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Users can insert their own follows.'
    ) THEN
        CREATE POLICY "Users can insert their own follows." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Users can delete their own follows.'
    ) THEN
        CREATE POLICY "Users can delete their own follows." ON public.follows FOR DELETE USING (auth.uid() = follower_id);
    END IF;
END $$;


-- 20260918140000_stage75_show_phone.sql
-- Add show_phone column to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS show_phone BOOLEAN NOT NULL DEFAULT false;


-- 20260918150000_stage76_realtime.sql
��E m p t y  
 

-- 20260918150001_stage76_chats_update.sql
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


-- 20260918160000_b2b_supplier_applications.sql
CREATE TYPE public.b2b_application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE public.b2b_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    categories TEXT,
    description TEXT,
    status public.b2b_application_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.b2b_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own b2b applications" 
ON public.b2b_applications FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can insert their own b2b applications" 
ON public.b2b_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- We won't allow users to update their applications for MVP, only admins can update (which implies service_role or admin RLS in the future)


-- 20260919000000_stage8_regions.sql
-- Add region column to listings
ALTER TABLE public.listings 
ADD COLUMN region VARCHAR(100);

-- Backfill region for listings based on existing city
UPDATE public.listings
SET region = 
  CASE 
    WHEN city = 'Бишкек' THEN 'Бишкек'
    WHEN city = 'Ош' THEN 'Ош'
    WHEN city = 'Джалал-Абад' THEN 'Джалал-Абадская область'
    WHEN city = 'Каракол' THEN 'Иссык-Кульская область'
    WHEN city = 'Баткен' THEN 'Баткенская область'
    WHEN city = 'Талас' THEN 'Таласская область'
    WHEN city = 'Нарын' THEN 'Нарынская область'
    WHEN city = 'Токмок' THEN 'Чуйская область'
    WHEN city = 'Кант' THEN 'Чуйская область'
    WHEN city = 'Кара-Балта' THEN 'Чуйская область'
    ELSE 'Бишкек' -- default fallback for existing data to allow NOT NULL, MVP approach
  END;

-- Make region NOT NULL now that it's populated
ALTER TABLE public.listings 
ALTER COLUMN region SET NOT NULL;

-- Do the same for requests
ALTER TABLE public.requests 
ADD COLUMN region VARCHAR(100);

UPDATE public.requests
SET region = 
  CASE 
    WHEN city = 'Бишкек' THEN 'Бишкек'
    WHEN city = 'Ош' THEN 'Ош'
    WHEN city = 'Джалал-Абад' THEN 'Джалал-Абадская область'
    WHEN city = 'Каракол' THEN 'Иссык-Кульская область'
    WHEN city = 'Баткен' THEN 'Баткенская область'
    WHEN city = 'Талас' THEN 'Таласская область'
    WHEN city = 'Нарын' THEN 'Нарынская область'
    ELSE 'Бишкек'
  END;

ALTER TABLE public.requests 
ALTER COLUMN region SET NOT NULL;


-- 20260919003500_b2b_admin_comment.sql
ALTER TABLE public.b2b_applications ADD COLUMN IF NOT EXISTS admin_comment TEXT; 


-- 20260919173000_stage9_orders_search.sql
-- STAGE 9: Orders, Cart, Inventory, Smart Search

-- 1. Create Enums
CREATE TYPE public.order_status AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- 2. Create Orders Table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    status public.order_status DEFAULT 'PENDING' NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 3. Create Order Items Table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    title_snapshot VARCHAR(255) NOT NULL,
    image_url_snapshot TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create Cart Items Table
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, listing_id)
);

-- 5. RLS for Cart Items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view their orders" ON public.orders
    FOR SELECT USING (auth.uid() = seller_id);
-- No INSERT/UPDATE for clients, only through secure server actions (bypassing RLS with service role or relying on backend auth check)
CREATE POLICY "Buyers can insert their orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update orders" ON public.orders
    FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 7. RLS for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
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

-- 8. Atomic Inventory Logic (RPC)
CREATE OR REPLACE FUNCTION public.complete_order(order_id_param UUID, executing_user UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_listing RECORD;
BEGIN
    -- Get order and lock it for update to prevent concurrent completions
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Security check: only the seller can complete
    IF v_order.seller_id != executing_user THEN
        RAISE EXCEPTION 'Unauthorized: only seller can complete this order';
    END IF;

    -- Idempotency and State Machine check
    IF v_order.status = 'COMPLETED' THEN
        -- Safely ignore double-completion
        RETURN TRUE;
    END IF;

    IF v_order.status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Order must be CONFIRMED to complete';
    END IF;

    -- Loop through items
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = order_id_param LOOP
        -- Lock listing
        SELECT * INTO v_listing FROM public.listings WHERE id = v_item.listing_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Listing % not found', v_item.listing_id;
        END IF;

        IF v_listing.status != 'ACTIVE' THEN
            RAISE EXCEPTION 'Listing is no longer ACTIVE';
        END IF;

        IF v_listing.listing_type = 'SINGLE' THEN
            UPDATE public.listings SET status = 'SOLD' WHERE id = v_listing.id;
        ELSIF v_listing.listing_type = 'INVENTORY' THEN
            IF v_listing.quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Недостаточно товара в наличии для завершения этой сделки.';
            END IF;
            
            UPDATE public.listings SET quantity = quantity - v_item.quantity WHERE id = v_listing.id;
            
            IF (v_listing.quantity - v_item.quantity) = 0 THEN
                UPDATE public.listings SET status = 'OUT_OF_STOCK' WHERE id = v_listing.id;
            END IF;
        END IF;
    END LOOP;

    -- Mark order as completed
    UPDATE public.orders 
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
    WHERE id = order_id_param;
    
    RETURN TRUE;
END;
$$;

-- 9. Smart Search & pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS listings_title_trgm_idx ON public.listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_desc_trgm_idx ON public.listings USING gin (description gin_trgm_ops);

-- 10. Synonyms Table
CREATE TABLE public.search_synonyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(100) NOT NULL UNIQUE,
    synonyms TEXT[] NOT NULL
);

INSERT INTO public.search_synonyms (keyword, synonyms) VALUES
('клавиатура', ARRAY['клава', 'клавы']),
('ноутбук', ARRAY['ноут', 'ноуты']),
('iphone', ARRAY['айфон', 'айфоны']),
('телефон', ARRAY['мобила', 'смартфон', 'смарт'])
ON CONFLICT (keyword) DO NOTHING;

-- 11. RPC for updating search synonyms via admin if needed
CREATE OR REPLACE FUNCTION public.get_synonyms(query_term TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
    res TEXT[];
BEGIN
    SELECT synonyms INTO res FROM public.search_synonyms WHERE keyword = query_term LIMIT 1;
    RETURN res;
END;
$$;


-- 20260919180000_stage9_1_hardening.sql
-- STAGE 9.1: BAZARGO SECURITY, ORDER INTEGRITY & UX HARDENING

-- 1. Drop permissive policies
DROP POLICY IF EXISTS "Buyers can insert their orders" ON public.orders;
DROP POLICY IF EXISTS "Participants can update orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can insert order items" ON public.order_items;

DROP FUNCTION IF EXISTS public.complete_order(UUID, UUID);

-- (Keep SELECT policies so users can still read their orders/items)

-- 2. Hardened complete_order
CREATE OR REPLACE FUNCTION public.complete_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_listing RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Lock order
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.seller_id != v_uid THEN
        RAISE EXCEPTION 'Unauthorized: only seller can complete this order';
    END IF;

    IF v_order.status = 'COMPLETED' THEN
        RETURN TRUE; -- Idempotency
    END IF;

    IF v_order.status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Order must be CONFIRMED to complete';
    END IF;

    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = order_id_param LOOP
        SELECT * INTO v_listing FROM public.listings WHERE id = v_item.listing_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Listing % not found', v_item.listing_id;
        END IF;

        IF v_listing.status != 'ACTIVE' THEN
            RAISE EXCEPTION 'Listing % is no longer ACTIVE', v_listing.id;
        END IF;

        IF v_listing.seller_id != v_order.seller_id THEN
            RAISE EXCEPTION 'Listing seller mismatch';
        END IF;

        IF v_listing.listing_type = 'SINGLE' THEN
            UPDATE public.listings SET status = 'SOLD' WHERE id = v_listing.id;
        ELSIF v_listing.listing_type = 'INVENTORY' THEN
            IF v_listing.quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for listing %', v_listing.id;
            END IF;
            
            UPDATE public.listings 
            SET quantity = quantity - v_item.quantity 
            WHERE id = v_listing.id;
            
            IF (v_listing.quantity - v_item.quantity) = 0 THEN
                UPDATE public.listings SET status = 'OUT_OF_STOCK' WHERE id = v_listing.id;
            END IF;
        END IF;
    END LOOP;

    UPDATE public.orders 
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
    WHERE id = order_id_param;
    
    RETURN TRUE;
END;
$$;

-- 3. Hardened order state machine functions
CREATE OR REPLACE FUNCTION public.confirm_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.seller_id != v_uid THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF v_order.status = 'CONFIRMED' THEN RETURN TRUE; END IF;
    IF v_order.status != 'PENDING' THEN RAISE EXCEPTION 'Cannot confirm non-pending order'; END IF;
    
    UPDATE public.orders SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW() WHERE id = order_id_param;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.seller_id != v_uid THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF v_order.status = 'REJECTED' THEN RETURN TRUE; END IF;
    IF v_order.status != 'PENDING' THEN RAISE EXCEPTION 'Cannot reject non-pending order'; END IF;
    
    UPDATE public.orders SET status = 'REJECTED', updated_at = NOW() WHERE id = order_id_param;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.buyer_id != v_uid THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF v_order.status = 'CANCELLED' THEN RETURN TRUE; END IF;
    IF v_order.status NOT IN ('PENDING', 'CONFIRMED') THEN RAISE EXCEPTION 'Order cannot be cancelled'; END IF;
    
    UPDATE public.orders SET status = 'CANCELLED', cancelled_at = NOW(), updated_at = NOW() WHERE id = order_id_param;
    RETURN TRUE;
END;
$$;

-- 4. Hardened checkout from cart
CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_cart_item RECORD;
    v_listing RECORD;
    v_seller_id UUID;
    v_store_id UUID;
    v_order_id UUID;
    v_total NUMERIC;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    -- Basic check if cart empty
    IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE user_id = v_uid) THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;

    -- Group by seller and create orders
    FOR v_seller_id IN (
        SELECT DISTINCT l.seller_id 
        FROM public.cart_items c 
        JOIN public.listings l ON c.listing_id = l.id 
        WHERE c.user_id = v_uid
    ) LOOP
        
        IF v_seller_id = v_uid THEN
            RAISE EXCEPTION 'Cannot buy own listings';
        END IF;

        v_total := 0;
        v_store_id := NULL;

        -- Create pending order
        INSERT INTO public.orders (buyer_id, seller_id, status, total_amount)
        VALUES (v_uid, v_seller_id, 'PENDING', 0)
        RETURNING id INTO v_order_id;

        -- Process items for this seller
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller_id
        ) LOOP
            -- Integrity checks
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Listing % is not ACTIVE', v_cart_item.title;
            END IF;
            IF v_cart_item.listing_type = 'SINGLE' AND v_cart_item.quantity > 1 THEN
                RAISE EXCEPTION 'Single listings can only have quantity 1';
            END IF;
            IF v_cart_item.listing_type = 'INVENTORY' AND v_cart_item.quantity > v_cart_item.stock THEN
                RAISE EXCEPTION 'Insufficient stock for %', v_cart_item.title;
            END IF;

            v_store_id := COALESCE(v_store_id, v_cart_item.store_id);
            v_total := v_total + (v_cart_item.price * v_cart_item.quantity);

            INSERT INTO public.order_items (order_id, listing_id, quantity, unit_price, title_snapshot, image_url_snapshot)
            VALUES (v_order_id, v_cart_item.id, v_cart_item.quantity, v_cart_item.price, v_cart_item.title, v_cart_item.img_url);
        END LOOP;

        -- Update order total and store_id
        UPDATE public.orders 
        SET total_amount = v_total, store_id = v_store_id 
        WHERE id = v_order_id;

    END LOOP;

    -- Clear cart
    DELETE FROM public.cart_items WHERE user_id = v_uid;

    RETURN TRUE;
END;
$$;

-- 5. Revoke EXECUTE from anon
REVOKE EXECUTE ON FUNCTION public.complete_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.confirm_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.confirm_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_orders_from_cart() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_orders_from_cart() FROM anon;
GRANT EXECUTE ON FUNCTION public.create_orders_from_cart() TO authenticated;

-- 6. RPC for pg_trgm smart search ranking
CREATE OR REPLACE FUNCTION public.search_listings(query_text TEXT)
RETURNS TABLE (id UUID, rank REAL)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_synonyms TEXT[];
    v_combined_query TEXT;
    v_term TEXT;
BEGIN
    -- Base condition for simple trigram match
    -- But we also want to lookup synonyms and include them
    SELECT synonyms INTO v_synonyms FROM public.search_synonyms WHERE keyword = lower(trim(query_text)) LIMIT 1;
    
    IF v_synonyms IS NOT NULL THEN
        -- Create a combined string of terms separated by spaces
        v_combined_query := lower(trim(query_text)) || ' ' || array_to_string(v_synonyms, ' ');
    ELSE
        v_combined_query := lower(trim(query_text));
    END IF;

    RETURN QUERY
    SELECT l.id,
           -- Simple heuristic rank: exact title prefix match = +1.0, trigram similarity = +similarity
           (CASE WHEN lower(l.title) LIKE lower(trim(query_text)) || '%' THEN 1.0 ELSE 0.0 END
            + similarity(lower(l.title), v_combined_query)
           )::REAL as rank
    FROM public.listings l
    WHERE 
        l.status = 'ACTIVE' 
        AND (
            l.title % v_combined_query 
            OR l.description % v_combined_query
            OR similarity(lower(l.title), v_combined_query) > 0.2
        )
    ORDER BY rank DESC;
END;
$$;


-- 20260919190000_stage1_security_matrix.sql
-- STAGE 1: BAZARGO SECURITY & DATABASE INTEGRITY

-- ==========================================
-- 1. PROFILES PROTECTION (Prevent Privilege Escalation)
-- ==========================================
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Users can update own profile." 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow admins to change role or is_verified
    IF OLD.role != NEW.role OR OLD.is_verified != NEW.is_verified THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) THEN
            NEW.role := OLD.role;
            NEW.is_verified := OLD.is_verified;
        END IF;
    END IF;
    
    -- Never allow id change
    NEW.id := OLD.id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_escalation ON public.profiles;
CREATE TRIGGER tr_protect_profile_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_escalation();


-- ==========================================
-- 2. STORES PROTECTION (Prevent Moderation Bypass)
-- ==========================================
DROP POLICY IF EXISTS "Users can update own store." ON public.stores;
DROP POLICY IF EXISTS "Users can update their own store." ON public.stores;

CREATE POLICY "Users can update own store." 
ON public.stores FOR UPDATE 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.protect_store_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Prevent users from approving their own stores or making them verified
    IF OLD.status != NEW.status OR OLD.is_verified != NEW.is_verified THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) THEN
            NEW.status := OLD.status;
            NEW.is_verified := OLD.is_verified;
        END IF;
    END IF;
    
    NEW.owner_id := OLD.owner_id; -- Prevent transferring ownership arbitrarily
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_store_moderation ON public.stores;
CREATE TRIGGER tr_protect_store_moderation
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_store_moderation();


-- ==========================================
-- 3. LISTINGS PROTECTION
-- ==========================================
DROP POLICY IF EXISTS "Users can update own listings." ON public.listings;

CREATE POLICY "Users can update own listings." 
ON public.listings FOR UPDATE 
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE OR REPLACE FUNCTION public.protect_listing_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- If listing is blocked, only admin can unblock it
    IF OLD.status = 'BLOCKED' AND NEW.status != 'BLOCKED' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) THEN
            NEW.status := 'BLOCKED';
        END IF;
    END IF;
    
    -- Prevent changing the seller
    NEW.seller_id := OLD.seller_id;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_listing_integrity ON public.listings;
CREATE TRIGGER tr_protect_listing_integrity
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_integrity();


-- ==========================================
-- 4. CATEGORIES (Fix permissive admin policy)
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage categories." ON public.categories;


-- ==========================================
-- 5. CHAT & MESSAGES SECURITY
-- ==========================================
DROP POLICY IF EXISTS "Users can insert chats where they are the buyer." ON public.chats;

-- Prevent spoofing seller_id or creating chat for another's listing
CREATE POLICY "Users can insert chats safely." 
ON public.chats FOR INSERT 
WITH CHECK (
    auth.uid() = buyer_id 
    AND seller_id = (SELECT seller_id FROM public.listings WHERE id = listing_id)
    AND buyer_id != seller_id
);

-- Message restrictions
CREATE OR REPLACE FUNCTION public.protect_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.content := trim(NEW.content);
    
    IF length(NEW.content) = 0 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;
    
    IF length(NEW.content) > 2000 THEN
        RAISE EXCEPTION 'Message is too long';
    END IF;

    -- Protect chat membership (RLS handles this for INSERT, but let's double enforce)
    IF NOT EXISTS (
        SELECT 1 FROM public.chats 
        WHERE id = NEW.chat_id AND (buyer_id = NEW.sender_id OR seller_id = NEW.sender_id)
    ) THEN
        RAISE EXCEPTION 'Sender is not in this chat';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_messages ON public.messages;
CREATE TRIGGER tr_protect_messages
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_messages();


-- ==========================================
-- 6. DOUBLE CHECK ORDER INSERT INTEGRITY
-- ==========================================
-- Ensure orders/order_items can ONLY be inserted via our secured RPCs or by owner, but since we rely on checkoutCart, 
-- we already dropped INSERT policies for orders and order_items in 9.1 for users. 
-- Let's just make absolutely sure no public INSERT exists.
DROP POLICY IF EXISTS "Buyers can insert their orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can insert order items" ON public.order_items;

-- ==========================================
-- 7. CLEAN UP CART_ITEMS (Fix quantity spoofing)
-- ==========================================
CREATE OR REPLACE FUNCTION public.protect_cart_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_listing RECORD;
BEGIN
    SELECT * INTO v_listing FROM public.listings WHERE id = NEW.listing_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;
    
    IF v_listing.seller_id = NEW.user_id THEN
        RAISE EXCEPTION 'Cannot add own item to cart';
    END IF;
    
    IF v_listing.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Listing is not ACTIVE';
    END IF;
    
    IF v_listing.listing_type = 'SINGLE' AND NEW.quantity > 1 THEN
        NEW.quantity := 1;
    END IF;
    
    IF v_listing.listing_type = 'INVENTORY' AND NEW.quantity > v_listing.quantity THEN
        RAISE EXCEPTION 'Cannot add more than available stock';
    END IF;

    IF NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_cart_items ON public.cart_items;
CREATE TRIGGER tr_protect_cart_items
BEFORE INSERT OR UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.protect_cart_items();

-- ==========================================
-- 8. STORAGE BUCKET POLICIES HARDENING
-- ==========================================
-- (Assuming they were mostly correct but let's enforce path ownership more cleanly if needed.
-- Already had path verification `(storage.foldername(name))[1] = auth.uid()::text`. 
-- We ensure no UPDATE to files not owned by them)


-- 20260919193000_stage1_checkout_concurrency.sql
-- STAGE 1: ORDER CHECKOUT CONCURRENCY & OVERSELLING FIX

CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_seller RECORD;
    v_cart_item RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(10,2);
    v_created_order_ids UUID[] := '{}';
    v_active_reserved INTEGER;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- For each unique seller in the cart
    FOR v_seller IN (
        SELECT DISTINCT l.seller_id
        FROM public.cart_items c
        JOIN public.listings l ON c.listing_id = l.id
        WHERE c.user_id = v_uid
    ) LOOP
        v_total_amount := 0;

        -- We need to check stock with row locking to prevent race conditions during checkout
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
            FOR UPDATE OF l -- Row lock to prevent concurrent checkouts of the same listing!
        ) LOOP
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Item % is no longer active', v_cart_item.title;
            END IF;

            -- Calculate currently reserved stock in PENDING/CONFIRMED orders
            SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            WHERE oi.listing_id = v_cart_item.id 
            AND o.status IN ('PENDING', 'CONFIRMED');

            IF v_cart_item.listing_type = 'SINGLE' THEN
                IF v_active_reserved + v_cart_item.quantity > 1 THEN
                    RAISE EXCEPTION 'Item % is already ordered by someone else', v_cart_item.title;
                END IF;
            ELSE
                IF v_active_reserved + v_cart_item.quantity > v_cart_item.stock THEN
                    RAISE EXCEPTION 'Item % does not have enough available stock (Available: %, Requested: %)', 
                        v_cart_item.title, 
                        v_cart_item.stock - v_active_reserved, 
                        v_cart_item.quantity;
                END IF;
            END IF;

            v_total_amount := v_total_amount + (v_cart_item.price * v_cart_item.quantity);
        END LOOP;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes
        ) VALUES (
            v_uid,
            v_seller.seller_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP',
            ''
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
        ) LOOP
            INSERT INTO public.order_items (
                order_id,
                listing_id,
                store_id,
                quantity,
                unit_price,
                title,
                image_url
            ) VALUES (
                v_order_id,
                v_cart_item.id,
                v_cart_item.store_id,
                v_cart_item.quantity,
                v_cart_item.price,
                v_cart_item.title,
                v_cart_item.img_url
            );
        END LOOP;

        -- Remove these items from cart
        DELETE FROM public.cart_items 
        WHERE user_id = v_uid 
        AND listing_id IN (
            SELECT id FROM public.listings WHERE seller_id = v_seller.seller_id
        );

        v_created_order_ids := array_append(v_created_order_ids, v_order_id);
    END LOOP;

    RETURN true;
END;
$$;


-- 20260919200000_stage3_indexes.sql
-- STAGE 3: Performance Indexes and Concurrency Constraints

-- 1. Unique Constraints to prevent duplicate data
ALTER TABLE public.favorites 
ADD CONSTRAINT favorites_user_listing_unique UNIQUE (user_id, listing_id);

ALTER TABLE public.cart_items 
ADD CONSTRAINT cart_items_user_listing_unique UNIQUE (user_id, listing_id);

ALTER TABLE public.chats 
ADD CONSTRAINT chats_buyer_seller_listing_unique UNIQUE (buyer_id, seller_id, listing_id);

-- 2. Foreign Key Indexes (to prevent sequential scans on joins)
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_store_id ON public.listings(store_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON public.listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

CREATE INDEX IF NOT EXISTS idx_chats_buyer_id ON public.chats(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chats_seller_id ON public.chats(seller_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON public.chats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON public.messages(chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_b2b_applications_user_id ON public.b2b_applications(user_id);

-- 3. Atomic Message Sending RPC
-- To avoid 2 separate round-trips from the client and guarantee consistency
CREATE OR REPLACE FUNCTION public.send_message_transaction(
    p_chat_id UUID,
    p_content TEXT
) RETURNS public.messages AS $$
DECLARE
    v_message public.messages;
BEGIN
    -- 1. Insert message
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (p_chat_id, auth.uid(), p_content)
    RETURNING * INTO v_message;

    -- 2. Update chat updated_at
    UPDATE public.chats
    SET updated_at = NOW()
    WHERE id = p_chat_id;

    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;


-- 20260919210000_stage3_chat_rpc.sql
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


-- 20260919213000_stage3_1_chat_rpc_fix.sql
-- STAGE 3.1: Fix Chat RPC Regression

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
        pb.full_name::TEXT AS buyer_name,
        pb.avatar_url::TEXT AS buyer_avatar,
        ps.full_name::TEXT AS seller_name,
        ps.avatar_url::TEXT AS seller_avatar,
        l.title::TEXT AS listing_title,
        (SELECT url::TEXT FROM public.listing_images li WHERE li.listing_id = l.id ORDER BY order_index ASC LIMIT 1) AS listing_image,
        m.content::TEXT AS last_message_content,
        m.created_at AS last_message_created_at,
        m.sender_id AS last_message_sender_id,
        (
            SELECT count(*) 
            FROM public.messages um 
            WHERE um.chat_id = c.id 
              AND um.is_read = false 
              AND um.sender_id != auth.uid()
        )::BIGINT AS unread_count
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


-- 20260919220000_security_profiles_privacy.sql
-- 1. Revoke table-level SELECT for anon and authenticated
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;

-- 2. Grant column-level SELECT for safe columns
GRANT SELECT (id, full_name, avatar_url, city, role, is_verified, created_at, updated_at) 
ON public.profiles TO anon, authenticated;

-- 3. Create secure RPCs for fetching phone numbers based on strict business logic

-- For Product Page
CREATE OR REPLACE FUNCTION public.get_listing_phone(p_listing_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_show_phone BOOLEAN;
BEGIN
  SELECT seller_id, show_phone INTO v_seller_id, v_show_phone
  FROM listings
  WHERE id = p_listing_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF v_seller_id = auth.uid() OR v_show_phone = true THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- For Buyer checking Order
CREATE OR REPLACE FUNCTION public.get_order_seller_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_status order_status;
BEGIN
  SELECT seller_id, buyer_id, status INTO v_seller_id, v_buyer_id, v_status
  FROM orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_seller_id OR (auth.uid() = v_buyer_id AND v_status = 'CONFIRMED') THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- For Seller checking Order
CREATE OR REPLACE FUNCTION public.get_order_buyer_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
BEGIN
  SELECT seller_id, buyer_id INTO v_seller_id, v_buyer_id
  FROM orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_buyer_id OR auth.uid() = v_seller_id THEN
    SELECT phone INTO v_phone FROM profiles WHERE id = v_buyer_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_listing_phone(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_seller_phone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_buyer_phone(UUID) TO authenticated;


-- 20260919223000_security_profiles_privacy_hardening.sql
-- 1. Remove 'role' from public select
REVOKE SELECT ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, city, is_verified, created_at, updated_at) 
ON public.profiles TO anon, authenticated;

-- 2. Harden get_listing_phone
CREATE OR REPLACE FUNCTION public.get_listing_phone(p_listing_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_show_phone BOOLEAN;
  v_status public.listing_status;
BEGIN
  SELECT seller_id, show_phone, status INTO v_seller_id, v_show_phone, v_status
  FROM public.listings
  WHERE id = p_listing_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF v_seller_id = auth.uid() OR (v_show_phone = true AND v_status = 'ACTIVE') THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Harden get_order_seller_phone
CREATE OR REPLACE FUNCTION public.get_order_seller_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
  v_status public.order_status;
BEGIN
  SELECT seller_id, buyer_id, status INTO v_seller_id, v_buyer_id, v_status
  FROM public.orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_seller_id OR (auth.uid() = v_buyer_id AND v_status = 'CONFIRMED') THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_seller_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- 4. Harden get_order_buyer_phone
CREATE OR REPLACE FUNCTION public.get_order_buyer_phone(p_order_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_phone VARCHAR;
  v_seller_id UUID;
  v_buyer_id UUID;
BEGIN
  SELECT seller_id, buyer_id INTO v_seller_id, v_buyer_id
  FROM public.orders
  WHERE id = p_order_id;

  IF v_seller_id IS NULL THEN RETURN NULL; END IF;

  IF auth.uid() = v_buyer_id OR auth.uid() = v_seller_id THEN
    SELECT phone INTO v_phone FROM public.profiles WHERE id = v_buyer_id;
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

-- 5. Revoke default execute and strictly grant
REVOKE EXECUTE ON FUNCTION public.get_listing_phone(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_seller_phone(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_buyer_phone(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_listing_phone(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_seller_phone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_buyer_phone(UUID) TO authenticated;


-- 20260919230000_search_multilingual_fuzzy.sql
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


-- 20260920042400_search_limit_fix.sql
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


-- 20260920042900_security_listing_state_machine.sql
-- ==========================================
-- STAGE 2: LISTING STATE MACHINE HARDENING
-- ==========================================

-- Replace the existing trigger with a strict DB-level State Machine
-- Enforcement for listing statuses.
CREATE OR REPLACE FUNCTION public.protect_listing_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
    v_is_service_role BOOLEAN := FALSE;
BEGIN
    -- 1. Check if caller is admin
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) INTO v_is_admin;
    END IF;

    -- 2. Check if caller is service_role (bypassing normal checks)
    BEGIN
        IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
            v_is_service_role := TRUE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if not set
    END;

    -- 3. Always protect seller_id ownership integrity
    NEW.seller_id := OLD.seller_id;

    -- 4. Status State Machine
    IF OLD.status != NEW.status THEN
        -- Admins and Service Role bypass the strict owner state machine to perform moderation
        IF NOT v_is_admin AND NOT v_is_service_role THEN
            
            -- BLOCKED (Only Admin can block/unblock)
            IF OLD.status = 'BLOCKED' THEN
                RAISE EXCEPTION 'Blocked listings cannot be modified by the owner';
            END IF;
            IF NEW.status = 'BLOCKED' THEN
                RAISE EXCEPTION 'Only administrators can block a listing';
            END IF;

            -- ARCHIVED (Terminal state for owners)
            IF OLD.status = 'ARCHIVED' THEN
                RAISE EXCEPTION 'Archived listings cannot be reactivated or modified';
            END IF;

            -- SOLD
            IF OLD.status = 'SOLD' THEN
                IF NEW.status != 'ARCHIVED' THEN
                    RAISE EXCEPTION 'Sold listings can only be archived';
                END IF;
            END IF;

            -- OUT_OF_STOCK
            IF OLD.status = 'OUT_OF_STOCK' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED', 'DEACTIVATED') THEN
                    RAISE EXCEPTION 'Invalid transition from OUT_OF_STOCK to %', NEW.status;
                END IF;
            END IF;

            -- ACTIVE
            IF OLD.status = 'ACTIVE' THEN
                IF NEW.status NOT IN ('DEACTIVATED', 'SOLD', 'OUT_OF_STOCK', 'ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from ACTIVE to %', NEW.status;
                END IF;
            END IF;

            -- DEACTIVATED
            IF OLD.status = 'DEACTIVATED' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from DEACTIVATED to %', NEW.status;
                END IF;
            END IF;

        END IF;
    END IF;

    -- 5. Inventory Integrity
    -- Auto-transition to OUT_OF_STOCK if inventory hits 0 and status is ACTIVE
    IF NEW.status = 'ACTIVE' AND NEW.quantity <= 0 THEN
        NEW.status := 'OUT_OF_STOCK';
    END IF;

    -- SINGLE listings cannot have quantity > 1
    IF NEW.listing_type = 'SINGLE' AND NEW.quantity > 1 THEN
        NEW.quantity := 1;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger is already attached from previous stages, but we ensure it's BEFORE UPDATE
DROP TRIGGER IF EXISTS tr_protect_listing_integrity ON public.listings;
CREATE TRIGGER tr_protect_listing_integrity
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.protect_listing_integrity();


-- 20260921144900_security_listing_state_machine_followup.sql
-- ==========================================
-- STAGE 2: LISTING STATE MACHINE HARDENING (FOLLOW-UP)
-- ==========================================

-- 1. SECURITY DEFINER HARDENING & IMMUTABILITY FIXES
CREATE OR REPLACE FUNCTION public.protect_listing_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
    v_is_service_role BOOLEAN := FALSE;
BEGIN
    -- 1. Check if caller is admin
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) INTO v_is_admin;
    END IF;

    -- 2. Check if caller is service_role (bypassing normal checks)
    BEGIN
        IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
            v_is_service_role := TRUE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if not set
    END;

    -- 3. Always protect seller_id ownership integrity
    NEW.seller_id := OLD.seller_id;

    -- 4. Status and Immutability checks for owners
    IF NOT v_is_admin AND NOT v_is_service_role THEN

        -- BLOCKED Immutability
        IF OLD.status = 'BLOCKED' THEN
            IF NEW.status IS DISTINCT FROM OLD.status 
               OR NEW.title IS DISTINCT FROM OLD.title 
               OR NEW.description IS DISTINCT FROM OLD.description 
               OR NEW.price IS DISTINCT FROM OLD.price 
               OR NEW.quantity IS DISTINCT FROM OLD.quantity 
               OR NEW.category_id IS DISTINCT FROM OLD.category_id 
               OR NEW.condition IS DISTINCT FROM OLD.condition 
               OR NEW.city IS DISTINCT FROM OLD.city 
               OR NEW.delivery_methods IS DISTINCT FROM OLD.delivery_methods 
               OR NEW.product_id IS DISTINCT FROM OLD.product_id
               OR NEW.store_id IS DISTINCT FROM OLD.store_id
               OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
                RAISE EXCEPTION 'Blocked listings cannot be modified by the owner';
            END IF;
        END IF;

        IF NEW.status = 'BLOCKED' AND OLD.status != 'BLOCKED' THEN
            RAISE EXCEPTION 'Only administrators can block a listing';
        END IF;

        -- ARCHIVED Immutability
        IF OLD.status = 'ARCHIVED' THEN
            IF NEW.status IS DISTINCT FROM OLD.status 
               OR NEW.title IS DISTINCT FROM OLD.title 
               OR NEW.description IS DISTINCT FROM OLD.description 
               OR NEW.price IS DISTINCT FROM OLD.price 
               OR NEW.quantity IS DISTINCT FROM OLD.quantity 
               OR NEW.category_id IS DISTINCT FROM OLD.category_id 
               OR NEW.condition IS DISTINCT FROM OLD.condition 
               OR NEW.city IS DISTINCT FROM OLD.city 
               OR NEW.delivery_methods IS DISTINCT FROM OLD.delivery_methods 
               OR NEW.product_id IS DISTINCT FROM OLD.product_id
               OR NEW.store_id IS DISTINCT FROM OLD.store_id
               OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
                RAISE EXCEPTION 'Archived listings cannot be modified by the owner';
            END IF;
        END IF;

        -- Status State Machine (only check if status actually changed)
        IF OLD.status != NEW.status THEN
            -- SOLD transitions
            IF OLD.status = 'SOLD' THEN
                IF NEW.status != 'ARCHIVED' THEN
                    RAISE EXCEPTION 'Sold listings can only be archived';
                END IF;
            END IF;

            -- OUT_OF_STOCK
            IF OLD.status = 'OUT_OF_STOCK' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED', 'DEACTIVATED') THEN
                    RAISE EXCEPTION 'Invalid transition from OUT_OF_STOCK to %', NEW.status;
                END IF;
            END IF;

            -- ACTIVE
            IF OLD.status = 'ACTIVE' THEN
                IF NEW.status NOT IN ('DEACTIVATED', 'SOLD', 'OUT_OF_STOCK', 'ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from ACTIVE to %', NEW.status;
                END IF;
            END IF;

            -- DEACTIVATED
            IF OLD.status = 'DEACTIVATED' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from DEACTIVATED to %', NEW.status;
                END IF;
            END IF;
        END IF;
    END IF;

    -- 5. Inventory Integrity
    -- Auto-transition to OUT_OF_STOCK if inventory hits 0 and status is ACTIVE
    IF NEW.status = 'ACTIVE' AND NEW.quantity <= 0 THEN
        NEW.status := 'OUT_OF_STOCK';
    END IF;

    -- SINGLE listings cannot have quantity > 1
    IF NEW.listing_type = 'SINGLE' AND NEW.quantity > 1 THEN
        NEW.quantity := 1;
    END IF;

    RETURN NEW;
END;
$$;


-- 20260921150700_storage_security.sql
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


-- 20260921153400_security_order_expiration.sql
-- ==========================================
-- STAGE 4 (SECURITY P0): ORDER RESERVATION EXPIRATION
-- ==========================================

-- 1. Add EXPIRED to order_status enum
-- Safe to do in modern Postgres inside transaction
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'EXPIRED';

-- 2. Add expires_at to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours');

-- Backfill existing PENDING orders with a 24h TTL from their creation date
UPDATE public.orders 
SET expires_at = created_at + INTERVAL '24 hours' 
WHERE status = 'PENDING' AND expires_at IS NULL;

-- 3. Create DB-Level Protection Trigger
-- Prevent arbitrary status manipulation directly from the client API.
-- Only official RPCs (which run as SECURITY DEFINER owned by postgres/supabase_admin) 
-- or service_role can change order status or financial data.
CREATE OR REPLACE FUNCTION public.protect_order_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_service_role BOOLEAN := FALSE;
BEGIN
    -- Check if running as service_role OR inside a SECURITY DEFINER function owned by superuser
    IF current_setting('role', true) = 'service_role' 
       OR current_user = 'postgres' 
       OR current_user = 'supabase_admin' THEN
        v_is_service_role := TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        -- Block status manipulation
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Order status can only be changed via official actions';
        END IF;

        -- Block financial/participant manipulation
        IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
            RAISE EXCEPTION 'Cannot modify total amount of an order';
        END IF;

        IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id OR NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
            RAISE EXCEPTION 'Cannot modify order participants';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_order_integrity ON public.orders;
CREATE TRIGGER tr_protect_order_integrity
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE PROCEDURE public.protect_order_integrity();

-- 4. Create the Server-Side Atomic Expiration RPC
CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_expired_count INTEGER := 0;
    v_order RECORD;
BEGIN
    -- We select all PENDING orders that have exceeded their TTL.
    -- FOR UPDATE SKIP LOCKED ensures that concurrent executions of this cron/RPC 
    -- don't block each other and don't double-expire rows (exactly-once semantics).
    FOR v_order IN 
        SELECT id FROM public.orders 
        WHERE status = 'PENDING' 
        AND expires_at IS NOT NULL 
        AND expires_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Transition to EXPIRED.
        -- Because the soft-reservation view `create_orders_from_cart()` strictly checks 
        -- `status IN ('PENDING', 'CONFIRMED')`, changing status to EXPIRED
        -- atomically drops the inventory reservation without manually manipulating listing quantities.
        UPDATE public.orders 
        SET status = 'EXPIRED', 
            updated_at = NOW()
        WHERE id = v_order.id;
        
        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$;

-- Secure the RPC (only callable by server/cron, not anonymous or authenticated users)
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM authenticated;

-- Allow service_role to execute it
-- NOTE: In Supabase, you can grant to service_role safely.
-- However, if pg_cron calls it, it usually runs as postgres. 
-- The function is owned by postgres and executable by it since they own it.
GRANT EXECUTE ON FUNCTION public.expire_pending_orders() TO service_role;

-- 5. Enable pg_cron and Schedule (if supported in the environment)
DO $$
BEGIN
    -- Attempt to create extension if possible
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    
    -- Schedule to run every 15 minutes
    PERFORM cron.schedule('expire_pending_orders_job', '*/15 * * * *', 'SELECT public.expire_pending_orders();');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available or schedule failed. Expiration must be triggered via Vercel Cron calling the RPC as service_role.';
END;
$$;


-- 20260921154500_security_order_expiration_backfill.sql
-- ==========================================
-- STAGE 4.1: Corrective Order Expiration Backfill
-- ==========================================

-- Problem: The previous migration used `DEFAULT (NOW() + INTERVAL '24 hours')` 
-- which filled all existing orders (both pending and terminal) with `migration_time + 24h`.
-- We need to correct existing PENDING orders to use their actual `created_at`,
-- and optionally clear expires_at for non-pending orders for semantic correctness.

-- 1. Correct existing PENDING orders to expire based on their actual creation time
UPDATE public.orders
SET expires_at = created_at + INTERVAL '24 hours'
WHERE status = 'PENDING';

-- 2. Clear expires_at for already confirmed or terminal orders to avoid confusion.
-- (They will never be expired anyway because the RPC strictly checks status = 'PENDING')
UPDATE public.orders
SET expires_at = NULL
WHERE status != 'PENDING';

-- Note: The pg_cron block from the previous migration might have failed gracefully
-- if pg_cron was unavailable. The Vercel Cron API route will take over execution.


-- 20260921180000_stores_unique_owner.sql
ALTER TABLE public.stores ADD CONSTRAINT stores_owner_id_key UNIQUE (owner_id);


-- 20260921183000_fix_stores_rls.sql
DROP POLICY IF EXISTS "Stores are viewable by everyone." ON public.stores;
CREATE POLICY "Stores are viewable by everyone." 
ON public.stores FOR SELECT 
USING (status = 'APPROVED' OR auth.uid() = owner_id);


-- 20260924000000_p0_security_audit.sql
-- P0 SECURITY & CORE RELIABILITY AUDIT MIGRATION

-- 1. Harden Storage Policies
-- We must ensure users can only upload files to their own path: userId/listingId/...
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

-- 2. Abuse Prevention Foundation (Rate Limiting)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No public access
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(user_id, action_type, created_at);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_action_type VARCHAR,
    p_limit INT,
    p_window_minutes INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM public.rate_limits
    WHERE user_id = auth.uid()
      AND action_type = p_action_type
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
      
    IF v_count >= p_limit THEN
        RETURN FALSE;
    END IF;
    
    INSERT INTO public.rate_limits (user_id, action_type) VALUES (auth.uid(), p_action_type);
    RETURN TRUE;
END;
$$;

-- Apply rate limits to send_message_transaction
CREATE OR REPLACE FUNCTION public.send_message_transaction(
    p_chat_id UUID,
    p_content TEXT
) RETURNS public.messages AS $$
DECLARE
    v_message public.messages;
    v_rate_ok BOOLEAN;
BEGIN
    -- Abuse Check: 60 messages per 5 minutes
    SELECT public.check_rate_limit('send_message', 60, 5) INTO v_rate_ok;
    IF NOT v_rate_ok THEN
        RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
    END IF;

    -- 1. Insert message
    INSERT INTO public.messages (chat_id, sender_id, content)
    VALUES (p_chat_id, auth.uid(), p_content)
    RETURNING * INTO v_message;

    -- 2. Update chat updated_at
    UPDATE public.chats
    SET updated_at = NOW()
    WHERE id = p_chat_id;

    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Audit Log Foundation
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
        VALUES (auth.uid(), 'CREATED', TG_TABLE_NAME, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'listings' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (auth.uid(), 'STATUS_CHANGED', 'listings', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        ELSIF TG_TABLE_NAME = 'orders' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (auth.uid(), 'STATUS_CHANGED', 'orders', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        ELSIF TG_TABLE_NAME = 'stores' AND OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
            VALUES (auth.uid(), 'STATUS_CHANGED', 'stores', NEW.id, jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_audit_listings ON public.listings;
CREATE TRIGGER tr_audit_listings
AFTER UPDATE ON public.listings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_orders ON public.orders;
CREATE TRIGGER tr_audit_orders
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_stores ON public.stores;
CREATE TRIGGER tr_audit_stores
AFTER UPDATE ON public.stores
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.audit_trigger_func();

-- 4. Missing P0 Indexes
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_buyer_id ON public.requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_offers_request_id ON public.request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_offers_seller_id ON public.request_offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_store_id ON public.follows(followed_store_id);

-- 5. Harden Phone RPC against direct access without proper context
-- ALREADY DONE in `stage75_show_phone.sql` and `security_profiles_privacy.sql`
ALTER TABLE public.listings ADD CONSTRAINT listings_quantity_check CHECK (quantity >= 0); 
ALTER TABLE public.listings ADD CONSTRAINT listings_price_check CHECK (price >= 0);  
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0);  
ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_check CHECK (unit_price >= 0);  
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0); 


-- 20260924180000_p0_final_hardening.sql
-- P0 FINAL HARDENING

-- ==================================================
-- 1. READ RECEIPTS SECURITY
-- ==================================================
-- Ensure a user can only update messages to is_read = true IF they are the recipient in the chat.
DROP POLICY IF EXISTS "Users can update their own chats." ON public.messages;
DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.messages;

CREATE POLICY "Users can mark received messages as read" ON public.messages
FOR UPDATE USING (
    auth.uid() IN (SELECT buyer_id FROM public.chats WHERE id = chat_id UNION SELECT seller_id FROM public.chats WHERE id = chat_id)
    AND sender_id != auth.uid()
) WITH CHECK (
    auth.uid() IN (SELECT buyer_id FROM public.chats WHERE id = chat_id UNION SELECT seller_id FROM public.chats WHERE id = chat_id)
    AND sender_id != auth.uid()
);

-- Protect messages from being edited (content spoofing) by the sender after creation
-- (We only allow updating is_read, which is done by the recipient. The sender cannot update their own message content).
-- This is handled because sender_id != auth.uid() for updates.

-- ==================================================
-- 2. ANTI-FRAUD FOUNDATION
-- ==================================================
-- Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abuse_score INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS abuse_score INT DEFAULT 0;

-- Stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS abuse_score INT DEFAULT 0;

-- Requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;

-- Protect Anti-Fraud flags from owner manipulation
CREATE OR REPLACE FUNCTION public.protect_anti_fraud_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow bypass for Service Role or Admin
    IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
            RETURN NEW;
        END IF;
    END IF;

    -- For normal users, force NEW values to equal OLD values for these fields
    IF TG_TABLE_NAME = 'profiles' THEN
        NEW.is_verified := OLD.is_verified;
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.abuse_score := OLD.abuse_score;
        NEW.blocked_reason := OLD.blocked_reason;
        NEW.role := OLD.role;
    ELSIF TG_TABLE_NAME IN ('listings', 'stores', 'requests') THEN
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.abuse_score := OLD.abuse_score;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profiles_anti_fraud ON public.profiles;
CREATE TRIGGER tr_protect_profiles_anti_fraud
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_anti_fraud_flags();

DROP TRIGGER IF EXISTS tr_protect_stores_anti_fraud ON public.stores;
CREATE TRIGGER tr_protect_stores_anti_fraud
BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.protect_anti_fraud_flags();

-- Also integrate anti-fraud protection into the existing listing integrity trigger
CREATE OR REPLACE FUNCTION public.protect_listing_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
    v_is_service_role BOOLEAN := FALSE;
BEGIN
    -- 1. Check if caller is admin
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) INTO v_is_admin;
    END IF;

    -- 2. Check if caller is service_role
    BEGIN
        IF current_setting('role', true) = 'service_role' OR auth.role() = 'service_role' THEN
            v_is_service_role := TRUE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore
    END;

    -- 3. Always protect seller_id ownership integrity
    NEW.seller_id := OLD.seller_id;

    -- 4. Protect Anti-Fraud flags
    IF NOT v_is_admin AND NOT v_is_service_role THEN
        NEW.is_suspicious := OLD.is_suspicious;
        NEW.abuse_score := OLD.abuse_score;
    END IF;

    -- 5. Status and Immutability checks for owners
    IF NOT v_is_admin AND NOT v_is_service_role THEN
        -- BLOCKED Immutability
        IF OLD.status = 'BLOCKED' THEN
            IF NEW.status IS DISTINCT FROM OLD.status 
               OR NEW.title IS DISTINCT FROM OLD.title 
               OR NEW.description IS DISTINCT FROM OLD.description 
               OR NEW.price IS DISTINCT FROM OLD.price 
               OR NEW.quantity IS DISTINCT FROM OLD.quantity 
               OR NEW.category_id IS DISTINCT FROM OLD.category_id 
               OR NEW.condition IS DISTINCT FROM OLD.condition 
               OR NEW.city IS DISTINCT FROM OLD.city 
               OR NEW.delivery_methods IS DISTINCT FROM OLD.delivery_methods 
               OR NEW.product_id IS DISTINCT FROM OLD.product_id
               OR NEW.store_id IS DISTINCT FROM OLD.store_id
               OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
                RAISE EXCEPTION 'Blocked listings cannot be modified by the owner';
            END IF;
        END IF;

        IF NEW.status = 'BLOCKED' AND OLD.status != 'BLOCKED' THEN
            RAISE EXCEPTION 'Only administrators can block a listing';
        END IF;

        -- ARCHIVED Immutability
        IF OLD.status = 'ARCHIVED' THEN
            IF NEW.status IS DISTINCT FROM OLD.status 
               OR NEW.title IS DISTINCT FROM OLD.title 
               OR NEW.description IS DISTINCT FROM OLD.description 
               OR NEW.price IS DISTINCT FROM OLD.price 
               OR NEW.quantity IS DISTINCT FROM OLD.quantity 
               OR NEW.category_id IS DISTINCT FROM OLD.category_id 
               OR NEW.condition IS DISTINCT FROM OLD.condition 
               OR NEW.city IS DISTINCT FROM OLD.city 
               OR NEW.delivery_methods IS DISTINCT FROM OLD.delivery_methods 
               OR NEW.product_id IS DISTINCT FROM OLD.product_id
               OR NEW.store_id IS DISTINCT FROM OLD.store_id
               OR NEW.listing_type IS DISTINCT FROM OLD.listing_type THEN
                RAISE EXCEPTION 'Archived listings cannot be modified by the owner';
            END IF;
        END IF;

        -- Status State Machine
        IF OLD.status != NEW.status THEN
            IF OLD.status = 'SOLD' THEN
                IF NEW.status != 'ARCHIVED' THEN
                    RAISE EXCEPTION 'Sold listings can only be archived';
                END IF;
            END IF;
            IF OLD.status = 'OUT_OF_STOCK' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED', 'DEACTIVATED') THEN
                    RAISE EXCEPTION 'Invalid transition from OUT_OF_STOCK to %', NEW.status;
                END IF;
            END IF;
            IF OLD.status = 'ACTIVE' THEN
                IF NEW.status NOT IN ('DEACTIVATED', 'SOLD', 'OUT_OF_STOCK', 'ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from ACTIVE to %', NEW.status;
                END IF;
            END IF;
            IF OLD.status = 'DEACTIVATED' THEN
                IF NEW.status = 'ACTIVE' THEN
                    IF NEW.quantity <= 0 THEN
                        RAISE EXCEPTION 'Cannot activate listing with 0 inventory';
                    END IF;
                ELSIF NEW.status NOT IN ('ARCHIVED') THEN
                    RAISE EXCEPTION 'Invalid transition from DEACTIVATED to %', NEW.status;
                END IF;
            END IF;
        END IF;
    END IF;

    -- 6. Inventory Integrity
    IF NEW.status = 'ACTIVE' AND NEW.quantity <= 0 THEN
        NEW.status := 'OUT_OF_STOCK';
    END IF;
    IF NEW.listing_type = 'SINGLE' AND NEW.quantity > 1 THEN
        NEW.quantity := 1;
    END IF;

    RETURN NEW;
END;
$$;

-- ==================================================
-- 3. EXTENDED AUDIT LOGGING
-- ==================================================
DROP TRIGGER IF EXISTS tr_audit_requests ON public.requests;
CREATE TRIGGER tr_audit_requests
AFTER INSERT OR UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS tr_audit_request_offers ON public.request_offers;
CREATE TRIGGER tr_audit_request_offers
AFTER INSERT OR UPDATE ON public.request_offers
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger_func();


-- 20260924200000_p1_notifications_trigger.sql
-- Notifications trigger logic

-- 1. Notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chat_buyer_id UUID;
  v_chat_seller_id UUID;
  v_recipient_id UUID;
  v_sender_name VARCHAR;
BEGIN
  -- Get chat participants
  SELECT buyer_id, seller_id INTO v_chat_buyer_id, v_chat_seller_id
  FROM public.chats WHERE id = NEW.chat_id;

  -- Determine recipient
  IF NEW.sender_id = v_chat_buyer_id THEN
    v_recipient_id := v_chat_seller_id;
  ELSE
    v_recipient_id := v_chat_buyer_id;
  END IF;

  -- Get sender name
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  IF v_sender_name IS NULL THEN
    v_sender_name := 'Пользователь';
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    v_recipient_id,
    'NEW_MESSAGE',
    'Новое сообщение от ' || v_sender_name,
    '/messages/' || NEW.chat_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- 2. Notify on new offer
CREATE OR REPLACE FUNCTION public.notify_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_id UUID;
  v_request_title VARCHAR;
BEGIN
  -- Get request details
  SELECT buyer_id, title INTO v_buyer_id, v_request_title
  FROM public.requests WHERE id = NEW.request_id;

  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    v_buyer_id,
    'NEW_OFFER',
    'Новое предложение для запроса "' || v_request_title || '"',
    '/requests/' || NEW.request_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_offer ON public.request_offers;
CREATE TRIGGER trigger_notify_new_offer
AFTER INSERT ON public.request_offers
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_offer();

-- 3. Notify on new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (
    NEW.seller_id,
    'NEW_ORDER',
    'У вас новый заказ!',
    '/seller/orders/' || NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_order ON public.orders;
CREATE TRIGGER trigger_notify_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_order();

-- 4. Notify on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_text VARCHAR;
  v_recipient_id UUID;
  v_link VARCHAR;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    IF NEW.status = 'CONFIRMED' THEN
      v_status_text := 'Заказ подтвержден продавцом';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'REJECTED' THEN
      v_status_text := 'Заказ отклонен продавцом';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'CANCELLED' THEN
      -- It could be cancelled by buyer or seller, notify the other party
      -- For simplicity, if we don't know who cancelled, we might notify both or just the other.
      -- Usually the RPC sets the status.
      -- Let's just notify the seller if it was cancelled, or buyer if it was cancelled.
      -- We don't have executor ID here. Let's notify seller (assuming buyer cancelled).
      v_status_text := 'Заказ отменен';
      v_recipient_id := NEW.seller_id;
      v_link := '/seller/orders/' || NEW.id;
    ELSIF NEW.status = 'COMPLETED' THEN
      v_status_text := 'Сделка завершена';
      v_recipient_id := NEW.seller_id; -- Notify seller that buyer completed it
      v_link := '/seller/orders/' || NEW.id;
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
      v_recipient_id,
      'ORDER_STATUS',
      v_status_text,
      v_link
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_order_status_change ON public.orders;
CREATE TRIGGER trigger_notify_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

-- 5. Notify on request expiration or closure
CREATE OR REPLACE FUNCTION public.notify_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'EXPIRED' THEN
      INSERT INTO public.notifications (user_id, type, message, link)
      VALUES (
        NEW.buyer_id,
        'REQUEST_EXPIRED',
        'Срок действия вашего запроса истек',
        '/requests/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_request_status_change ON public.requests;
CREATE TRIGGER trigger_notify_request_status_change
AFTER UPDATE ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_request_status_change();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY; 


-- 20260924200001_p1_checkout_return.sql
DROP FUNCTION IF EXISTS public.create_orders_from_cart();

CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_seller RECORD;
    v_cart_item RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(10,2);
    v_created_order_ids UUID[] := '{}';
    v_active_reserved INTEGER;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- For each unique seller in the cart
    FOR v_seller IN (
        SELECT DISTINCT l.seller_id
        FROM public.cart_items c
        JOIN public.listings l ON c.listing_id = l.id
        WHERE c.user_id = v_uid
    ) LOOP
        v_total_amount := 0;

        -- We need to check stock with row locking to prevent race conditions during checkout
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
            FOR UPDATE OF l -- Row lock to prevent concurrent checkouts of the same listing!
        ) LOOP
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Item % is no longer active', v_cart_item.title;
            END IF;

            -- Calculate currently reserved stock in PENDING/CONFIRMED orders
            SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            WHERE oi.listing_id = v_cart_item.id 
            AND o.status IN ('PENDING', 'CONFIRMED');

            IF v_cart_item.listing_type = 'SINGLE' THEN
                IF v_active_reserved + v_cart_item.quantity > 1 THEN
                    RAISE EXCEPTION 'Item % is already ordered by someone else', v_cart_item.title;
                END IF;
            ELSE
                IF v_active_reserved + v_cart_item.quantity > v_cart_item.stock THEN
                    RAISE EXCEPTION 'Item % does not have enough available stock (Available: %, Requested: %)', 
                        v_cart_item.title, 
                        v_cart_item.stock - v_active_reserved, 
                        v_cart_item.quantity;
                END IF;
            END IF;

            v_total_amount := v_total_amount + (v_cart_item.price * v_cart_item.quantity);
        END LOOP;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes
        ) VALUES (
            v_uid,
            v_seller.seller_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP',
            ''
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
        ) LOOP
            INSERT INTO public.order_items (
                order_id,
                listing_id,
                store_id,
                quantity,
                unit_price,
                title,
                image_url
            ) VALUES (
                v_order_id,
                v_cart_item.id,
                v_cart_item.store_id,
                v_cart_item.quantity,
                v_cart_item.price,
                v_cart_item.title,
                v_cart_item.img_url
            );
        END LOOP;

        -- Remove these items from cart
        DELETE FROM public.cart_items 
        WHERE user_id = v_uid 
        AND listing_id IN (
            SELECT id FROM public.listings WHERE seller_id = v_seller.seller_id
        );

        v_created_order_ids := array_append(v_created_order_ids, v_order_id);
    END LOOP;

    RETURN v_created_order_ids;
END;
$$;


-- 20260924200002_p1_store_counts_rpc.sql
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


-- 20260924200003_p2_indexes_and_chat_rpc.sql
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- Chat RPC with pagination
CREATE OR REPLACE FUNCTION public.get_chats_with_unread(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
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
        pb.full_name::TEXT AS buyer_name,
        pb.avatar_url::TEXT AS buyer_avatar,
        ps.full_name::TEXT AS seller_name,
        ps.avatar_url::TEXT AS seller_avatar,
        l.title::TEXT AS listing_title,
        (SELECT url::TEXT FROM public.listing_images li WHERE li.listing_id = l.id ORDER BY order_index ASC LIMIT 1) AS listing_image,
        m.content::TEXT AS last_message_content,
        m.created_at AS last_message_created_at,
        m.sender_id AS last_message_sender_id,
        (
            SELECT count(*) 
            FROM public.messages um 
            WHERE um.chat_id = c.id 
              AND um.is_read = false 
              AND um.sender_id != auth.uid()
        )::BIGINT AS unread_count
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
    ORDER BY c.updated_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Unread Notifications Count RPC
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS BIGINT
LANGUAGE sql
SECURITY INVOKER
AS $$
    SELECT count(*) FROM public.notifications 
    WHERE user_id = auth.uid() AND is_read = false;
$$;


-- 20260924200004_drop_unbounded_chat_rpc.sql
-- Drop the old unbounded get_chats_with_unread function overload
DROP FUNCTION IF EXISTS public.get_chats_with_unread();


-- 20260925134700_secure_search_synonyms.sql
ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read search synonyms" ON public.search_synonyms FOR SELECT USING (true);


-- 20260925234500_compliance_admin_rbac.sql
-- Migration: Compliance, Admin RBAC, Reports, User Blocking, and Audit Logs

-- 1. Extend user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MODERATOR';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPPORT';
COMMIT;

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    target_id UUID,
    target_type VARCHAR(255),
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')));

-- 3. Reports Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_target_type') THEN
        CREATE TYPE report_target_type AS ENUM ('LISTING', 'USER', 'MESSAGE', 'STORE');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type report_target_type NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status report_status NOT NULL DEFAULT 'OPEN',
    moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT unique_active_report UNIQUE NULLS NOT DISTINCT (reporter_id, target_id, target_type) -- Prevent spamming reports
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Staff can view reports" ON public.reports;
CREATE POLICY "Staff can view reports" ON public.reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR'))
);
DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;
CREATE POLICY "Staff can update reports" ON public.reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR'))
);

-- 4. User Blocks Table (Peer-to-Peer Blocking)
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert blocks" ON public.user_blocks;
CREATE POLICY "Users can insert blocks" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
CREATE POLICY "Users can view their own blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
DROP POLICY IF EXISTS "Users can delete their blocks" ON public.user_blocks;
CREATE POLICY "Users can delete their blocks" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- 5. Ban tracking in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.prevent_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (current_setting('role', true) != 'service_role') THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role NOT IN ('ADMIN', 'SUPER_ADMIN')) THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Unauthorized to change role';
            END IF;
            IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
                RAISE EXCEPTION 'Unauthorized to change ban status';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_privilege_escalation();

-- 6. Chat Abuse / Messages
DROP POLICY IF EXISTS "Users can insert messages in their chats." ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
CREATE POLICY "Users can insert messages in their chats"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.chats c 
        WHERE c.id = chat_id 
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM public.user_blocks ub 
            WHERE (ub.blocker_id = c.buyer_id AND ub.blocked_id = c.seller_id)
               OR (ub.blocker_id = c.seller_id AND ub.blocked_id = c.buyer_id)
        )
    )
);

DROP POLICY IF EXISTS "Users can create chats." ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
CREATE POLICY "Users can create chats"
ON public.chats FOR INSERT
WITH CHECK (
    (auth.uid() = buyer_id OR auth.uid() = seller_id) AND
    NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub 
        WHERE (ub.blocker_id = buyer_id AND ub.blocked_id = seller_id)
           OR (ub.blocker_id = seller_id AND ub.blocked_id = buyer_id)
    )
);


-- 20260926000000_reports_rls_fix.sql
-- Fix Report RLS and add immutable fields protection
-- Add storage cleanup for account deletion

BEGIN;

DROP POLICY IF EXISTS "Staff can update reports" ON public.reports;
CREATE POLICY "Staff can update reports" ON public.reports FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR')))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN', 'MODERATOR')));

CREATE OR REPLACE FUNCTION public.prevent_immutable_report_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reporter_id IS DISTINCT FROM OLD.reporter_id THEN RAISE EXCEPTION 'Cannot update immutable field reporter_id'; END IF;
    IF NEW.target_id IS DISTINCT FROM OLD.target_id THEN RAISE EXCEPTION 'Cannot update immutable field target_id'; END IF;
    IF NEW.target_type IS DISTINCT FROM OLD.target_type THEN RAISE EXCEPTION 'Cannot update immutable field target_type'; END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'Cannot update immutable field created_at'; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_immutable_report_updates ON public.reports;
CREATE TRIGGER tr_prevent_immutable_report_updates
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_report_updates();

-- Helper to clean up storage objects for a user so auth.admin.deleteUser doesn't fail on FK constraint
CREATE OR REPLACE FUNCTION public.cleanup_user_storage(uid UUID)
RETURNS void AS $$
BEGIN
    -- Delete files owned by the user from all buckets
    -- This requires the storage schema to exist. In Supabase, it always exists.
    DELETE FROM storage.objects WHERE owner = uid;
EXCEPTION
    WHEN OTHERS THEN
        -- Safely ignore if storage schema somehow differs or isn't accessible
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;


-- 20260927000000_admin_security_hardening.sql
BEGIN;

-- 1. Fix cleanup_user_storage IDOR
CREATE OR REPLACE FUNCTION public.cleanup_user_storage(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := current_setting('role', true);
    
    -- Must be called by service_role (Admin Action) OR the user themselves
    IF v_role != 'service_role' AND auth.uid() != uid THEN
        RAISE EXCEPTION 'Unauthorized to clean up storage for this user';
    END IF;
    
    DELETE FROM storage.objects WHERE owner = uid;
EXCEPTION WHEN OTHERS THEN
    -- To ensure idempotency and non-blocking behavior on missing schema, we catch but log
    RAISE WARNING 'Failed to cleanup storage: %', SQLERRM;
END;
$$;

-- Restrict execute permissions
REVOKE EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) TO authenticated;

COMMIT;


-- 20260927180000_admin_security_remediation.sql
BEGIN;

-- ===========================================
-- ADMIN SECURITY REMEDIATION MIGRATION
-- ===========================================

-- 1. Fix cleanup_user_storage: proper auth, no error suppression, correct grants
CREATE OR REPLACE FUNCTION public.cleanup_user_storage(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := current_setting('role', true);
    
    -- Only service_role (called from trusted Server Action) can invoke this
    IF v_role IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'cleanup_user_storage: only callable via service_role';
    END IF;
    
    -- Delete all storage objects owned by this user
    DELETE FROM storage.objects WHERE owner = uid;
END;
$$;

-- Revoke from ALL roles first, then grant only to service_role
REVOKE ALL ON FUNCTION public.cleanup_user_storage(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_user_storage(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_user_storage(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_user_storage(UUID) TO service_role;


-- 2. Atomic admin mutation RPCs
-- Each RPC: validates caller role, performs mutation + audit in one transaction

-- 2a. admin_block_user
CREATE OR REPLACE FUNCTION public.admin_block_user(
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_target_role TEXT;
    v_audit_id UUID;
BEGIN
    -- Must be called via service_role from trusted server action
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_block_user: only callable via service_role';
    END IF;
    
    -- actor_id is passed via Supabase RPC headers (not from client param)
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: no authenticated actor';
    END IF;
    
    -- Get actor role
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_block_user: insufficient privileges (role: %)', COALESCE(v_actor_role, 'NULL');
    END IF;
    
    -- Get target role and check existence
    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: target user not found';
    END IF;
    
    -- Prevent banning SUPER_ADMIN unless caller is SUPER_ADMIN
    IF v_target_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'admin_block_user: cannot ban SUPER_ADMIN';
    END IF;
    
    -- Perform mutation
    UPDATE public.profiles
    SET is_banned = true,
        ban_reason = p_reason,
        banned_at = now()
    WHERE id = p_target_user_id AND (is_banned IS DISTINCT FROM true);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_block_user: user already banned or update failed';
    END IF;
    
    -- Atomic audit log
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (v_actor_id, 'BLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_block_user(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_block_user(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_block_user(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user(UUID, TEXT) TO service_role;


-- 2b. admin_unblock_user
CREATE OR REPLACE FUNCTION public.admin_unblock_user(
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_unblock_user: only callable via service_role';
    END IF;
    
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_unblock_user: no authenticated actor';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_unblock_user: insufficient privileges';
    END IF;
    
    UPDATE public.profiles
    SET is_banned = false, ban_reason = NULL, banned_at = NULL
    WHERE id = p_target_user_id AND is_banned = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_unblock_user: user not banned or not found';
    END IF;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (v_actor_id, 'UNBLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user(UUID, TEXT) TO service_role;


-- 2c. admin_moderate_listing
CREATE OR REPLACE FUNCTION public.admin_moderate_listing(
    p_listing_id UUID,
    p_new_status TEXT,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_old_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_moderate_listing: only callable via service_role';
    END IF;
    
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: no authenticated actor';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_moderate_listing: insufficient privileges';
    END IF;
    
    -- Validate target
    SELECT status::text INTO v_old_status FROM public.listings WHERE id = p_listing_id;
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing not found';
    END IF;
    
    -- Validate allowed status values
    IF p_new_status NOT IN ('ACTIVE', 'DEACTIVATED', 'BLOCKED') THEN
        RAISE EXCEPTION 'admin_moderate_listing: invalid status %', p_new_status;
    END IF;
    
    -- Idempotent: skip if already in target status
    IF v_old_status = p_new_status THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing already has status %', p_new_status;
    END IF;
    
    UPDATE public.listings SET status = p_new_status::listing_status WHERE id = p_listing_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (v_actor_id, 'MODERATE_LISTING', p_listing_id, 'LISTING', p_reason, 
            jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) TO service_role;


-- 2d. admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_report_id UUID,
    p_resolution TEXT,
    p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_current_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_resolve_report: only callable via service_role';
    END IF;
    
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: no authenticated actor';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_resolve_report: insufficient privileges';
    END IF;
    
    IF p_resolution NOT IN ('RESOLVED', 'REJECTED') THEN
        RAISE EXCEPTION 'admin_resolve_report: invalid resolution %', p_resolution;
    END IF;
    
    SELECT status::text INTO v_current_status FROM public.reports WHERE id = p_report_id;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: report not found';
    END IF;
    
    IF v_current_status NOT IN ('OPEN', 'IN_REVIEW') THEN
        RAISE EXCEPTION 'admin_resolve_report: report already resolved (status: %)', v_current_status;
    END IF;
    
    UPDATE public.reports
    SET status = p_resolution::report_status,
        moderator_id = v_actor_id,
        resolution_notes = p_notes,
        resolved_at = now()
    WHERE id = p_report_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (v_actor_id, 'RESOLVE_REPORT', p_report_id, 'REPORT', p_notes,
            jsonb_build_object('resolution', p_resolution))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) TO service_role;


-- 3. Account deletion RPC — atomic anonymization + tombstoning
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
BEGIN
    -- Only callable via service_role
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
    END IF;
    
    -- Verify user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'process_account_deletion: user not found';
    END IF;
    
    v_anon_name := 'Deleted User ' || substring(p_user_id::text from 1 for 5);
    
    -- Anonymize profile
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'
    WHERE id = p_user_id;
    
    -- Deactivate listings
    UPDATE public.listings SET status = 'DEACTIVATED' WHERE seller_id = p_user_id AND status != 'DEACTIVATED';
    
    -- Block stores
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    -- Clean up storage
    DELETE FROM storage.objects WHERE owner = p_user_id;
    
    -- Audit log (no PII in reason)
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;

REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID) TO service_role;


-- 4. Protect audit_logs from modification/deletion by non-service roles
-- No INSERT policy for authenticated users (audit writes go through service_role RPCs)
-- No UPDATE/DELETE policies at all
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
CREATE POLICY "No one can update audit logs" ON public.audit_logs FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;
CREATE POLICY "No one can delete audit logs" ON public.audit_logs FOR DELETE USING (false);


COMMIT;


-- 20260927190000_admin_rpc_fixes.sql
BEGIN;

-- Drop old RPCs that didn't take actor_id
DROP FUNCTION IF EXISTS public.admin_block_user(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_unblock_user(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_moderate_listing(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_resolve_report(UUID, TEXT, TEXT);

-- 1. admin_block_user
CREATE OR REPLACE FUNCTION public.admin_block_user(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role TEXT;
    v_target_role TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_block_user: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_block_user: insufficient privileges (role: %)', COALESCE(v_actor_role, 'NULL');
    END IF;
    
    SELECT role INTO v_target_role FROM public.profiles WHERE id = p_target_user_id;
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'admin_block_user: target user not found';
    END IF;
    
    IF v_target_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'admin_block_user: cannot ban SUPER_ADMIN';
    END IF;
    
    UPDATE public.profiles
    SET is_banned = true,
        ban_reason = p_reason,
        banned_at = now()
    WHERE id = p_target_user_id AND (is_banned IS DISTINCT FROM true);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_block_user: user already banned or update failed';
    END IF;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_actor_id, 'BLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_block_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_block_user(UUID, UUID, TEXT) TO service_role;

-- 2. admin_unblock_user
CREATE OR REPLACE FUNCTION public.admin_unblock_user(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_unblock_user: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_unblock_user: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_unblock_user: insufficient privileges';
    END IF;
    
    UPDATE public.profiles
    SET is_banned = false, ban_reason = NULL, banned_at = NULL
    WHERE id = p_target_user_id AND is_banned = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'admin_unblock_user: user not banned or not found';
    END IF;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_actor_id, 'UNBLOCK_USER', p_target_user_id, 'USER', p_reason)
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_unblock_user(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unblock_user(UUID, UUID, TEXT) TO service_role;

-- 3. admin_moderate_listing
CREATE OR REPLACE FUNCTION public.admin_moderate_listing(
    p_actor_id UUID,
    p_listing_id UUID,
    p_new_status TEXT,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role TEXT;
    v_old_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_moderate_listing: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_moderate_listing: insufficient privileges';
    END IF;
    
    SELECT status::text INTO v_old_status FROM public.listings WHERE id = p_listing_id;
    IF v_old_status IS NULL THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing not found';
    END IF;
    
    IF p_new_status NOT IN ('ACTIVE', 'DEACTIVATED', 'BLOCKED') THEN
        RAISE EXCEPTION 'admin_moderate_listing: invalid status %', p_new_status;
    END IF;
    
    IF v_old_status = p_new_status THEN
        RAISE EXCEPTION 'admin_moderate_listing: listing already has status %', p_new_status;
    END IF;
    
    -- Explicitly cast using public schema
    UPDATE public.listings SET status = p_new_status::public.listing_status WHERE id = p_listing_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (p_actor_id, 'MODERATE_LISTING', p_listing_id, 'LISTING', p_reason, 
            jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_moderate_listing(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_listing(UUID, UUID, TEXT, TEXT) TO service_role;

-- 4. admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
    p_actor_id UUID,
    p_report_id UUID,
    p_resolution TEXT,
    p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role TEXT;
    v_current_status TEXT;
    v_audit_id UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'admin_resolve_report: only callable via service_role';
    END IF;
    
    IF p_actor_id IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: missing actor_id';
    END IF;
    
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('MODERATOR', 'ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'admin_resolve_report: insufficient privileges';
    END IF;
    
    IF p_resolution NOT IN ('RESOLVED', 'REJECTED') THEN
        RAISE EXCEPTION 'admin_resolve_report: invalid resolution %', p_resolution;
    END IF;
    
    SELECT status::text INTO v_current_status FROM public.reports WHERE id = p_report_id;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'admin_resolve_report: report not found';
    END IF;
    
    IF v_current_status NOT IN ('OPEN', 'IN_REVIEW') THEN
        RAISE EXCEPTION 'admin_resolve_report: report already resolved (status: %)', v_current_status;
    END IF;
    
    -- Explicitly cast using public schema
    UPDATE public.reports
    SET status = p_resolution::public.report_status,
        moderator_id = p_actor_id,
        resolution_notes = p_notes,
        resolved_at = now()
    WHERE id = p_report_id;
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason, metadata)
    VALUES (p_actor_id, 'RESOLVE_REPORT', p_report_id, 'REPORT', p_notes,
            jsonb_build_object('resolution', p_resolution))
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, UUID, TEXT, TEXT) TO service_role;

-- 5. process_account_deletion (Remove direct storage.objects deletion)
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'process_account_deletion: user not found';
    END IF;
    
    v_anon_name := 'Deleted User ' || substring(p_user_id::text from 1 for 5);
    
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'
    WHERE id = p_user_id;
    
    -- Use explicit casting
    UPDATE public.listings SET status = 'DEACTIVATED'::public.listing_status WHERE seller_id = p_user_id AND status != 'DEACTIVATED'::public.listing_status;
    
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    -- NOTE: Physical storage deletion is now handled via API in the Server Action
    -- We do not DELETE FROM storage.objects directly here anymore.
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;

COMMIT;


-- 20260927200000_account_deletion_state_machine.sql
BEGIN;

-- 1. Create Account Deletion State Machine
CREATE TYPE public.deletion_status AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    status public.deletion_status NOT NULL DEFAULT 'REQUESTED',
    error_details TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deletion request" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion request" ON public.account_deletion_requests 
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (implicitly bypasses RLS)

-- 2. Update process_account_deletion to also set is_banned = true
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'process_account_deletion: user not found';
    END IF;
    
    v_anon_name := 'Deleted User ' || substring(p_user_id::text from 1 for 5);
    
    -- Anonymize and ban profile
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'::public.user_role,
        is_banned = true,
        ban_reason = 'Account deleted by user',
        banned_at = now()
    WHERE id = p_user_id;
    
    UPDATE public.listings SET status = 'DEACTIVATED'::public.listing_status WHERE seller_id = p_user_id AND status != 'DEACTIVATED'::public.listing_status;
    
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;
REVOKE ALL ON FUNCTION public.process_account_deletion(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID) TO service_role;

COMMIT;


-- 20260927210000_banned_user_triggers.sql
BEGIN;

-- 1. Atomic State Machine Lock RPC
CREATE OR REPLACE FUNCTION public.acquire_deletion_lock(p_user_id UUID)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req public.account_deletion_requests;
    v_timeout_threshold TIMESTAMPTZ := now() - interval '5 minutes';
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'acquire_deletion_lock: only callable via service_role';
    END IF;

    -- Lock the row if it exists
    SELECT * INTO v_req 
    FROM public.account_deletion_requests 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF FOUND THEN
        IF v_req.status = 'COMPLETED' THEN
            RAISE EXCEPTION 'Account deletion already completed';
        END IF;

        IF v_req.status = 'PROCESSING' AND v_req.started_at >= v_timeout_threshold THEN
            RAISE EXCEPTION 'Account deletion is already in progress';
        END IF;

        -- Update to PROCESSING
        UPDATE public.account_deletion_requests
        SET status = 'PROCESSING',
            started_at = now(),
            error_details = NULL
        WHERE user_id = p_user_id
        RETURNING * INTO v_req;
    ELSE
        -- Insert new request
        INSERT INTO public.account_deletion_requests (user_id, status, started_at)
        VALUES (p_user_id, 'PROCESSING', now())
        RETURNING * INTO v_req;
    END IF;

    RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_deletion_lock(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_deletion_lock(UUID) TO service_role;

-- 2. Global Banned User Block Trigger (Mitigates 1-hour JWT window)
CREATE OR REPLACE FUNCTION public.enforce_banned_user_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID;
    v_is_banned BOOLEAN;
BEGIN
    -- We only block actions initiated by actual authenticated users via REST API
    v_uid := auth.uid();
    
    IF v_uid IS NOT NULL AND current_setting('role', true) = 'authenticated' THEN
        SELECT is_banned INTO v_is_banned FROM public.profiles WHERE id = v_uid;
        IF v_is_banned THEN
            RAISE EXCEPTION 'Action not allowed for banned or deleted users.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Apply to critical tables where deleted/banned users should not be able to mutate data
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_listings ON public.listings;
CREATE TRIGGER tr_enforce_banned_user_block_listings
    BEFORE INSERT OR UPDATE OR DELETE ON public.listings
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_messages ON public.messages;
CREATE TRIGGER tr_enforce_banned_user_block_messages
    BEFORE INSERT OR UPDATE OR DELETE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_orders ON public.orders;
CREATE TRIGGER tr_enforce_banned_user_block_orders
    BEFORE INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_stores ON public.stores;
CREATE TRIGGER tr_enforce_banned_user_block_stores
    BEFORE INSERT OR UPDATE OR DELETE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

COMMIT;


-- 20260927220000_deletion_fencing_token.sql
BEGIN;

-- 1. Add fencing token to state machine
ALTER TABLE public.account_deletion_requests ADD COLUMN IF NOT EXISTS fencing_token UUID;

-- 2. Update acquire_deletion_lock to generate and return fencing token
CREATE OR REPLACE FUNCTION public.acquire_deletion_lock(p_user_id UUID)
RETURNS public.account_deletion_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_req public.account_deletion_requests;
    v_timeout_threshold TIMESTAMPTZ := now() - interval '5 minutes';
    v_new_token UUID := gen_random_uuid();
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'acquire_deletion_lock: only callable via service_role';
    END IF;

    -- Lock the row if it exists
    SELECT * INTO v_req 
    FROM public.account_deletion_requests 
    WHERE user_id = p_user_id 
    FOR UPDATE;

    IF FOUND THEN
        IF v_req.status = 'COMPLETED' THEN
            RAISE EXCEPTION 'Account deletion already completed';
        END IF;

        IF v_req.status = 'PROCESSING' AND v_req.started_at >= v_timeout_threshold THEN
            RAISE EXCEPTION 'Account deletion is already in progress';
        END IF;

        -- Update to PROCESSING with new fencing token
        UPDATE public.account_deletion_requests
        SET status = 'PROCESSING',
            started_at = now(),
            error_details = NULL,
            fencing_token = v_new_token
        WHERE user_id = p_user_id
        RETURNING * INTO v_req;
    ELSE
        -- Insert new request with fencing token
        INSERT INTO public.account_deletion_requests (user_id, status, started_at, fencing_token)
        VALUES (p_user_id, 'PROCESSING', now(), v_new_token)
        RETURNING * INTO v_req;
    END IF;

    RETURN v_req;
END;
$$;

-- 3. Update process_account_deletion to require fencing token
CREATE OR REPLACE FUNCTION public.process_account_deletion(p_user_id UUID, p_fencing_token UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_anon_name TEXT;
    v_current_token UUID;
BEGIN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'process_account_deletion: only callable via service_role';
    END IF;
    
    -- Fencing Token Check
    SELECT fencing_token INTO v_current_token 
    FROM public.account_deletion_requests 
    WHERE user_id = p_user_id;

    IF v_current_token IS DISTINCT FROM p_fencing_token THEN
        RAISE EXCEPTION 'Fencing token mismatch or lock lost';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'process_account_deletion: user not found';
    END IF;
    
    v_anon_name := 'Deleted User ' || substring(p_user_id::text from 1 for 5);
    
    -- Anonymize and ban profile
    UPDATE public.profiles
    SET full_name = v_anon_name,
        avatar_url = NULL,
        phone = NULL,
        role = 'USER'::public.user_role,
        is_banned = true,
        ban_reason = 'Account deleted by user',
        banned_at = now()
    WHERE id = p_user_id;
    
    UPDATE public.listings SET status = 'DEACTIVATED'::public.listing_status WHERE seller_id = p_user_id AND status != 'DEACTIVATED'::public.listing_status;
    
    UPDATE public.stores SET status = 'BLOCKED' WHERE owner_id = p_user_id AND status != 'BLOCKED';
    
    INSERT INTO public.audit_logs (actor_id, action, target_id, target_type, reason)
    VALUES (p_user_id, 'ACCOUNT_DELETION_COMPLETED', p_user_id, 'USER', 'Self-service account deletion');
END;
$$;

-- 4. Apply enforce_banned_user_block to remaining mutable tables
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_chats ON public.chats;
CREATE TRIGGER tr_enforce_banned_user_block_chats
    BEFORE INSERT OR UPDATE OR DELETE ON public.chats
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_reports ON public.reports;
CREATE TRIGGER tr_enforce_banned_user_block_reports
    BEFORE INSERT OR UPDATE OR DELETE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_requests ON public.requests;
CREATE TRIGGER tr_enforce_banned_user_block_requests
    BEFORE INSERT OR UPDATE OR DELETE ON public.requests
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_request_offers ON public.request_offers;
CREATE TRIGGER tr_enforce_banned_user_block_request_offers
    BEFORE INSERT OR UPDATE OR DELETE ON public.request_offers
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_favorites ON public.favorites;
CREATE TRIGGER tr_enforce_banned_user_block_favorites
    BEFORE INSERT OR UPDATE OR DELETE ON public.favorites
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_follows ON public.follows;
CREATE TRIGGER tr_enforce_banned_user_block_follows
    BEFORE INSERT OR UPDATE OR DELETE ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();
    
DROP TRIGGER IF EXISTS tr_enforce_banned_user_block_cart_items ON public.cart_items;
CREATE TRIGGER tr_enforce_banned_user_block_cart_items
    BEFORE INSERT OR UPDATE OR DELETE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.enforce_banned_user_block();

COMMIT;


-- 20260927230000_seal_remaining_tables.sql
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


-- 20260930000000_package_a_architecture.sql
-- Package A: Architecture and Database Fixes

BEGIN;

-- A1 & A6: Add missing columns to orders to support checkout RPC and cancellation
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'PICKUP' NOT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- A7: Add payload to notifications for structured data
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

-- A3: Add missing indexes for admin dashboard performance
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_b2b_apps_status ON public.b2b_applications(status);

-- Fix the checkout RPC to use the correct columns for order_items (title_snapshot, image_url_snapshot)
-- and remove the non-existent store_id from order_items (it's already on orders)
CREATE OR REPLACE FUNCTION public.create_orders_from_cart()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_seller RECORD;
    v_cart_item RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(10,2);
    v_created_order_ids UUID[] := '{}';
    v_active_reserved INTEGER;
    v_store_id UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- For each unique seller in the cart
    FOR v_seller IN (
        SELECT DISTINCT l.seller_id
        FROM public.cart_items c
        JOIN public.listings l ON c.listing_id = l.id
        WHERE c.user_id = v_uid
    ) LOOP
        v_total_amount := 0;
        v_store_id := NULL;

        -- We need to check stock with row locking to prevent race conditions during checkout
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.status, l.quantity as stock, l.listing_type, l.store_id
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
            ORDER BY l.id
            FOR UPDATE OF l -- Row lock to prevent concurrent checkouts of the same listing!
        ) LOOP
            IF v_cart_item.status != 'ACTIVE' THEN
                RAISE EXCEPTION 'Item % is no longer active', v_cart_item.title;
            END IF;

            -- Calculate currently reserved stock in PENDING/CONFIRMED orders
            SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
            FROM public.order_items oi
            JOIN public.orders o ON o.id = oi.order_id
            WHERE oi.listing_id = v_cart_item.id 
            AND o.status IN ('PENDING', 'CONFIRMED');

            IF v_cart_item.listing_type = 'SINGLE' THEN
                IF v_active_reserved + v_cart_item.quantity > 1 THEN
                    RAISE EXCEPTION 'Item % is already ordered by someone else', v_cart_item.title;
                END IF;
            ELSE
                IF v_active_reserved + v_cart_item.quantity > v_cart_item.stock THEN
                    RAISE EXCEPTION 'Item % does not have enough available stock (Available: %, Requested: %)', 
                        v_cart_item.title, 
                        v_cart_item.stock - v_active_reserved, 
                        v_cart_item.quantity;
                END IF;
            END IF;

            v_total_amount := v_total_amount + (v_cart_item.price * v_cart_item.quantity);
            v_store_id := COALESCE(v_store_id, v_cart_item.store_id);
        END LOOP;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            store_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes
        ) VALUES (
            v_uid,
            v_seller.seller_id,
            v_store_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP',
            ''
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        FOR v_cart_item IN (
            SELECT c.quantity, l.id, l.price, l.title, l.store_id,
                   (SELECT url FROM public.listing_images WHERE listing_id = l.id ORDER BY order_index ASC LIMIT 1) as img_url
            FROM public.cart_items c
            JOIN public.listings l ON c.listing_id = l.id
            WHERE c.user_id = v_uid AND l.seller_id = v_seller.seller_id
        ) LOOP
            INSERT INTO public.order_items (
                order_id,
                listing_id,
                quantity,
                unit_price,
                title_snapshot,
                image_url_snapshot
            ) VALUES (
                v_order_id,
                v_cart_item.id,
                v_cart_item.quantity,
                v_cart_item.price,
                v_cart_item.title,
                v_cart_item.img_url
            );
        END LOOP;

        -- Remove these items from cart
        DELETE FROM public.cart_items 
        WHERE user_id = v_uid 
        AND listing_id IN (
            SELECT id FROM public.listings WHERE seller_id = v_seller.seller_id
        );

        v_created_order_ids := array_append(v_created_order_ids, v_order_id);
    END LOOP;

    RETURN v_created_order_ids;
END;
$$;


-- Fix order cancellation notification (notify buyer if seller cancels, notify seller if buyer cancels)
-- Since we don't know the actor in the trigger directly, we infer it from standard patterns or notify the other party
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status_text VARCHAR;
  v_recipient_id UUID;
  v_link VARCHAR;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    IF NEW.status = 'CONFIRMED' THEN
      v_status_text := 'Заказ подтвержден продавцом';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'REJECTED' THEN
      v_status_text := 'Заказ отклонен продавцом';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'CANCELLED' THEN
      IF auth.uid() IS NULL OR auth.uid() = NEW.seller_id THEN
          v_recipient_id := NEW.buyer_id;
          v_link := '/orders/' || NEW.id;
      ELSE
          v_recipient_id := NEW.seller_id;
          v_link := '/seller/orders/' || NEW.id;
      END IF;
      v_status_text := 'Заказ отменен';
    ELSIF NEW.status = 'EXPIRED' THEN
      v_status_text := 'Время подтверждения заказа истекло';
      v_recipient_id := NEW.buyer_id;
      v_link := '/orders/' || NEW.id;
    ELSIF NEW.status = 'COMPLETED' THEN
      v_status_text := 'Сделка завершена';
      v_recipient_id := NEW.seller_id; 
      v_link := '/seller/orders/' || NEW.id;
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
      v_recipient_id,
      'ORDER_STATUS',
      v_status_text,
      v_link
    );
  END IF;

  RETURN NEW;
END;
$$;


-- A5: Fix privilege escalation trigger
CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_service_role BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' OR current_user = 'supabase_admin' THEN
        v_is_service_role := TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        BEGIN
            SELECT (role IN ('ADMIN', 'SUPER_ADMIN')) INTO v_is_admin 
            FROM public.profiles 
            WHERE id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_is_admin := FALSE;
        END;

        IF NEW.role IS DISTINCT FROM OLD.role AND NOT v_is_admin THEN
            RAISE EXCEPTION 'Only administrators can change user roles';
        END IF;

        IF NEW.is_banned IS DISTINCT FROM OLD.is_banned AND NOT v_is_admin THEN
            RAISE EXCEPTION 'Only administrators can ban/unban users';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


COMMIT;


-- 20260930000001_package_a_security_patch.sql
BEGIN;

-- Fix the privilege escalation vulnerability where an ADMIN could promote themselves or others to SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.protect_profile_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_is_service_role BOOLEAN := FALSE;
    v_current_role VARCHAR;
BEGIN
    -- Check if executing as service_role or direct DB connection (no JWT claims)
    IF current_setting('role', true) = 'service_role' THEN
        v_is_service_role := TRUE;
    ELSIF current_setting('request.jwt.claims', true) IS NULL OR current_setting('request.jwt.claims', true) = '' THEN
        v_is_service_role := TRUE;
    END IF;

    IF NOT v_is_service_role THEN
        -- Get the current role of the executor from the database
        BEGIN
            SELECT role INTO v_current_role 
            FROM public.profiles 
            WHERE id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_current_role := 'USER';
        END;

        -- Role changes
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            -- Only ADMIN or SUPER_ADMIN can change roles
            IF v_current_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
                RAISE EXCEPTION 'Only administrators can change user roles';
            END IF;

            -- Only SUPER_ADMIN can grant SUPER_ADMIN
            IF NEW.role = 'SUPER_ADMIN' AND v_current_role != 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Only SUPER_ADMIN can grant SUPER_ADMIN privileges';
            END IF;
            
            -- Only SUPER_ADMIN can revoke SUPER_ADMIN
            IF OLD.role = 'SUPER_ADMIN' AND v_current_role != 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Only SUPER_ADMIN can revoke SUPER_ADMIN privileges';
            END IF;
        END IF;

        -- Banning users
        IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
            IF v_current_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
                RAISE EXCEPTION 'Only administrators can ban/unban users';
            END IF;
            
            -- ADMIN cannot ban SUPER_ADMIN
            IF OLD.role = 'SUPER_ADMIN' AND v_current_role != 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Only SUPER_ADMIN can ban other SUPER_ADMINs';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;


-- 20260930000002_package_b_admin_roles.sql
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_change_user_role(
    p_actor_id UUID,
    p_target_user_id UUID,
    p_new_role VARCHAR,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_role VARCHAR;
    v_target_old_role VARCHAR;
    v_audit_id UUID;
BEGIN
    -- 1. Check actor role
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Unauthorized: only ADMIN or SUPER_ADMIN can change roles';
    END IF;

    -- 2. Get target old role
    SELECT role INTO v_target_old_role FROM public.profiles WHERE id = p_target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    -- 3. Check hierarchy
    IF p_new_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: only SUPER_ADMIN can grant SUPER_ADMIN role';
    END IF;

    IF v_target_old_role = 'SUPER_ADMIN' AND v_actor_role != 'SUPER_ADMIN' THEN
        RAISE EXCEPTION 'Unauthorized: only SUPER_ADMIN can change a SUPER_ADMIN role';
    END IF;

    -- 4. Update role
    UPDATE public.profiles
    SET role = p_new_role
    WHERE id = p_target_user_id;

    -- 5. Audit log
    INSERT INTO public.admin_audit_logs (
        actor_id,
        action_type,
        target_type,
        target_id,
        old_state,
        new_state,
        reason
    ) VALUES (
        p_actor_id,
        'CHANGE_ROLE',
        'USER',
        p_target_user_id,
        jsonb_build_object('role', v_target_old_role),
        jsonb_build_object('role', p_new_role),
        p_reason
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_change_user_role FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_change_user_role TO service_role;

COMMIT;


-- 20260930000003_stage10_reviews_reputation.sql
-- Migration: Reviews & Reputation System
-- Description: Adds tables and logic for leaving reviews on completed/cancelled orders.

-- 1. Create review_status enum
CREATE TYPE public.review_status AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- 2. Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    target_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    reply TEXT,
    status public.review_status DEFAULT 'PUBLISHED' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Ensure one review per order by a reviewer
    UNIQUE (reviewer_id, order_id)
);

-- Index for quickly fetching user or store reviews
CREATE INDEX idx_reviews_target_user ON public.reviews(target_user_id) WHERE status = 'PUBLISHED';
CREATE INDEX idx_reviews_target_store ON public.reviews(target_store_id) WHERE status = 'PUBLISHED';
CREATE INDEX idx_reviews_order ON public.reviews(order_id);

-- 3. Update Profiles and Stores with cached rating
ALTER TABLE public.profiles 
  ADD COLUMN rating NUMERIC(3, 2) DEFAULT 0.00,
  ADD COLUMN reviews_count INTEGER DEFAULT 0;

ALTER TABLE public.stores 
  ADD COLUMN rating NUMERIC(3, 2) DEFAULT 0.00,
  ADD COLUMN reviews_count INTEGER DEFAULT 0;

-- 4. RPC to calculate and update rating
CREATE OR REPLACE FUNCTION public.update_entity_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update User Rating
    IF NEW.target_user_id IS NOT NULL THEN
        WITH stats AS (
            SELECT 
                COUNT(*) as cnt,
                COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews
            WHERE target_user_id = NEW.target_user_id AND status = 'PUBLISHED'
        )
        UPDATE public.profiles
        SET rating = ROUND((SELECT avg_rating FROM stats), 2),
            reviews_count = (SELECT cnt FROM stats)
        WHERE id = NEW.target_user_id;
    END IF;

    -- Update Store Rating
    IF NEW.target_store_id IS NOT NULL THEN
        WITH stats AS (
            SELECT 
                COUNT(*) as cnt,
                COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews
            WHERE target_store_id = NEW.target_store_id AND status = 'PUBLISHED'
        )
        UPDATE public.stores
        SET rating = ROUND((SELECT avg_rating FROM stats), 2),
            reviews_count = (SELECT cnt FROM stats)
        WHERE id = NEW.target_store_id;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger to auto-update rating on review changes
CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE OF rating, status ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_entity_rating();

-- Handle deletes
CREATE OR REPLACE FUNCTION public.update_entity_rating_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.target_user_id IS NOT NULL THEN
        WITH stats AS (
            SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews WHERE target_user_id = OLD.target_user_id AND status = 'PUBLISHED'
        )
        UPDATE public.profiles SET rating = ROUND((SELECT avg_rating FROM stats), 2), reviews_count = (SELECT cnt FROM stats) WHERE id = OLD.target_user_id;
    END IF;
    IF OLD.target_store_id IS NOT NULL THEN
        WITH stats AS (
            SELECT COUNT(*) as cnt, COALESCE(AVG(rating), 0) as avg_rating
            FROM public.reviews WHERE target_store_id = OLD.target_store_id AND status = 'PUBLISHED'
        )
        UPDATE public.stores SET rating = ROUND((SELECT avg_rating FROM stats), 2), reviews_count = (SELECT cnt FROM stats) WHERE id = OLD.target_store_id;
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_update_rating_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_entity_rating_on_delete();

-- 5. RLS for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read PUBLISHED reviews
CREATE POLICY "Public can read published reviews"
ON public.reviews FOR SELECT
USING (status = 'PUBLISHED');

-- Reviewers can read their own reviews regardless of status
CREATE POLICY "Users can read own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (reviewer_id = auth.uid());

-- Target users can read their own reviews regardless of status
CREATE POLICY "Targets can read own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (target_user_id = auth.uid());

-- 6. Secure RPC for submitting a review
-- This RPC checks order ownership, status, and prevents spoofing.
CREATE OR REPLACE FUNCTION public.submit_review(
    p_order_id UUID,
    p_rating INTEGER,
    p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_review_id UUID;
    v_reviewer_id UUID;
    v_target_user_id UUID;
    v_target_store_id UUID;
BEGIN
    v_reviewer_id := auth.uid();
    IF v_reviewer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;

    -- Fetch order and verify participation
    SELECT id, buyer_id, seller_id, store_id, status 
    INTO v_order 
    FROM public.orders 
    WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Reviews can only be left on completed orders. For issues with cancelled orders, please submit a report.';
    END IF;

    -- Determine target and verify reviewer was part of the transaction
    IF v_reviewer_id = v_order.buyer_id THEN
        v_target_user_id := v_order.seller_id;
        v_target_store_id := v_order.store_id;
    ELSIF v_reviewer_id = v_order.seller_id THEN
        -- Sellers can review buyers too (reputation goes both ways)
        v_target_user_id := v_order.buyer_id;
        v_target_store_id := NULL;
    ELSE
        RAISE EXCEPTION 'You are not part of this order';
    END IF;

    -- Insert review (unique constraint will throw if already reviewed)
    INSERT INTO public.reviews (
        reviewer_id, target_user_id, target_store_id, order_id, rating, comment
    ) VALUES (
        v_reviewer_id, v_target_user_id, v_target_store_id, p_order_id, p_rating, p_comment
    ) RETURNING id INTO v_review_id;

    RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_review(UUID, INTEGER, TEXT) TO authenticated;

-- 7. Secure RPC for replying to a review
CREATE OR REPLACE FUNCTION public.reply_to_review(
    p_review_id UUID,
    p_reply TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_user_id UUID;
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT target_user_id INTO v_target_user_id FROM public.reviews WHERE id = p_review_id;

    IF v_target_user_id IS NULL THEN
        RAISE EXCEPTION 'Review not found';
    END IF;

    IF v_target_user_id != v_uid THEN
        RAISE EXCEPTION 'You can only reply to reviews directed at you';
    END IF;

    UPDATE public.reviews
    SET reply = p_reply, updated_at = NOW()
    WHERE id = p_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_review(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reply_to_review(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.reply_to_review(UUID, TEXT) TO authenticated;


-- 20260930000004_stage10_b2b_listings.sql
-- Migration: B2B Listings Fields
-- Description: Adds wholesale price and min order quantity for B2B transactions.

ALTER TABLE public.listings 
  ADD COLUMN is_b2b BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN wholesale_price NUMERIC(12, 2),
  ADD COLUMN min_order_quantity INTEGER DEFAULT 1;

-- Add check constraint to ensure wholesale_price makes sense if provided
ALTER TABLE public.listings
  ADD CONSTRAINT check_wholesale_price CHECK (wholesale_price IS NULL OR wholesale_price > 0),
  ADD CONSTRAINT check_min_order_qty CHECK (min_order_quantity >= 1);


-- 20260930000005_stage11_b2b_moderation.sql
-- Migration: B2B Application Moderation RPC
-- Description: Allows admins to safely approve or reject B2B applications and log the action.

ALTER TABLE public.b2b_applications ADD COLUMN admin_comment TEXT;

CREATE OR REPLACE FUNCTION public.admin_moderate_b2b(
    p_actor_id UUID,
    p_app_id UUID,
    p_new_status public.b2b_application_status,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_role public.user_role;
    v_audit_id UUID;
    v_target_user_id UUID;
BEGIN
    -- Verify actor privileges
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
    IF v_actor_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Unauthorized: insufficient privileges to moderate B2B applications';
    END IF;

    -- Fetch app info
    SELECT user_id INTO v_target_user_id FROM public.b2b_applications WHERE id = p_app_id;
    IF v_target_user_id IS NULL THEN
         RAISE EXCEPTION 'Application not found';
    END IF;

    -- Update application status
    UPDATE public.b2b_applications
    SET status = p_new_status,
        admin_comment = p_reason,
        updated_at = NOW()
    WHERE id = p_app_id;

    -- Log action
    INSERT INTO public.audit_logs (actor_id, target_user_id, action, details)
    VALUES (
        p_actor_id,
        v_target_user_id,
        'B2B_APP_MODERATE',
        jsonb_build_object(
            'application_id', p_app_id,
            'new_status', p_new_status,
            'reason', p_reason
        )
    ) RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;


-- 20261001000000_stage12_b2b_offers.sql
-- Migration: B2B Offers and Negotiations
-- Description: Adds tables and logic for B2B wholesale negotiations

CREATE TYPE public.b2b_offer_status AS ENUM ('PENDING', 'COUNTER_OFFER', 'ACCEPTED', 'REJECTED');

CREATE TABLE public.b2b_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
    
    -- Buyer's original request
    requested_quantity INTEGER NOT NULL,
    requested_price NUMERIC(12, 2) NOT NULL,
    buyer_message TEXT,
    
    -- Seller's counter offer (if any)
    offered_quantity INTEGER,
    offered_price NUMERIC(12, 2),
    seller_message TEXT,
    
    status public.b2b_offer_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.b2b_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own offers"
ON public.b2b_offers FOR SELECT TO authenticated
USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view received offers"
ON public.b2b_offers FOR SELECT TO authenticated
USING (seller_id = auth.uid());

-- RPC to create a B2B offer
CREATE OR REPLACE FUNCTION public.create_b2b_offer(
    p_listing_id UUID,
    p_quantity INTEGER,
    p_price NUMERIC(12, 2),
    p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_listing RECORD;
    v_seller_id UUID;
    v_offer_id UUID;
    v_buyer_id UUID;
    v_chat_id UUID;
BEGIN
    v_buyer_id := auth.uid();
    IF v_buyer_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify listing is B2B
    SELECT id, seller_id, is_b2b, min_order_quantity INTO v_listing
    FROM public.listings
    WHERE id = p_listing_id;

    IF v_listing IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF NOT v_listing.is_b2b THEN
        RAISE EXCEPTION 'This listing is not a B2B offer';
    END IF;

    IF p_quantity < COALESCE(v_listing.min_order_quantity, 1) THEN
        RAISE EXCEPTION 'Quantity is below minimum order quantity';
    END IF;

    v_seller_id := v_listing.seller_id;
    IF v_buyer_id = v_seller_id THEN
        RAISE EXCEPTION 'Cannot make an offer on your own listing';
    END IF;

    -- Ensure chat exists between buyer and seller for this listing
    SELECT id INTO v_chat_id FROM public.chats 
    WHERE listing_id = p_listing_id AND buyer_id = v_buyer_id;

    IF v_chat_id IS NULL THEN
        INSERT INTO public.chats (listing_id, buyer_id, seller_id)
        VALUES (p_listing_id, v_buyer_id, v_seller_id)
        RETURNING id INTO v_chat_id;
    END IF;

    INSERT INTO public.b2b_offers (
        listing_id, buyer_id, seller_id, chat_id, requested_quantity, requested_price, buyer_message
    ) VALUES (
        p_listing_id, v_buyer_id, v_seller_id, v_chat_id, p_quantity, p_price, p_message
    ) RETURNING id INTO v_offer_id;

    -- Send notification to seller
    INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (
        v_seller_id, 
        'NEW_B2B_OFFER', 
        'Новый запрос на оптовую закупку', 
        '/messages/' || v_chat_id
    );

    RETURN v_offer_id;
END;
$$;

-- RPC to update B2B offer status (seller counter, accept, reject)
CREATE OR REPLACE FUNCTION public.respond_b2b_offer(
    p_offer_id UUID,
    p_status public.b2b_offer_status,
    p_quantity INTEGER DEFAULT NULL,
    p_price NUMERIC(12, 2) DEFAULT NULL,
    p_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offer RECORD;
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_offer FROM public.b2b_offers WHERE id = p_offer_id;
    IF v_offer IS NULL THEN
        RAISE EXCEPTION 'Offer not found';
    END IF;

    IF v_offer.status IN ('ACCEPTED', 'REJECTED') THEN
        RAISE EXCEPTION 'Cannot modify a closed offer';
    END IF;

    -- Seller responding
    IF v_uid = v_offer.seller_id THEN
        IF p_status = 'COUNTER_OFFER' THEN
            UPDATE public.b2b_offers
            SET status = 'COUNTER_OFFER',
                offered_quantity = p_quantity,
                offered_price = p_price,
                seller_message = p_message,
                updated_at = NOW()
            WHERE id = p_offer_id;

            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.buyer_id, 'B2B_COUNTER_OFFER', 'Поставщик предложил новые условия', '/messages/' || v_offer.chat_id);
            
        ELSIF p_status = 'ACCEPTED' THEN
            UPDATE public.b2b_offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.buyer_id, 'B2B_OFFER_ACCEPTED', 'Ваш запрос на закупку принят!', '/messages/' || v_offer.chat_id);
        ELSIF p_status = 'REJECTED' THEN
            UPDATE public.b2b_offers SET status = 'REJECTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.buyer_id, 'B2B_OFFER_REJECTED', 'Ваш запрос на закупку отклонен', '/messages/' || v_offer.chat_id);
        ELSE
            RAISE EXCEPTION 'Invalid status transition for seller';
        END IF;
    
    -- Buyer responding to a counter offer
    ELSIF v_uid = v_offer.buyer_id THEN
        IF v_offer.status != 'COUNTER_OFFER' THEN
            RAISE EXCEPTION 'No counter offer to respond to';
        END IF;
        
        IF p_status = 'ACCEPTED' THEN
            UPDATE public.b2b_offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.seller_id, 'B2B_OFFER_ACCEPTED', 'Покупатель принял встречные условия', '/messages/' || v_offer.chat_id);
        ELSIF p_status = 'REJECTED' THEN
            UPDATE public.b2b_offers SET status = 'REJECTED', updated_at = NOW() WHERE id = p_offer_id;
            INSERT INTO public.notifications (user_id, type, message, link)
            VALUES (v_offer.seller_id, 'B2B_OFFER_REJECTED', 'Покупатель отклонил встречные условия', '/messages/' || v_offer.chat_id);
        ELSE
            RAISE EXCEPTION 'Invalid status transition for buyer';
        END IF;
    ELSE
        RAISE EXCEPTION 'Not a participant of this offer';
    END IF;
END;
$$;


-- 20261001000001_stage13_b2b_checkout.sql
-- Migration: B2B Offer to Order Conversion
-- Description: Creates an RPC to convert an ACCEPTED B2B offer into a real PENDING order, with stock checks

-- Add an optional b2b_offer_id to orders table to link them
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS b2b_offer_id UUID REFERENCES public.b2b_offers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.create_order_from_b2b_offer(
    p_offer_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_offer RECORD;
    v_listing RECORD;
    v_order_id UUID;
    v_total_amount DECIMAL(12,2);
    v_active_reserved INTEGER;
    v_img_url TEXT;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock the offer to prevent concurrent creations
    SELECT * INTO v_offer 
    FROM public.b2b_offers 
    WHERE id = p_offer_id 
    FOR UPDATE;

    IF v_offer IS NULL THEN
        RAISE EXCEPTION 'Offer not found';
    END IF;

    IF v_uid != v_offer.buyer_id THEN
        RAISE EXCEPTION 'Only the buyer can create an order from this offer';
    END IF;

    IF v_offer.status != 'ACCEPTED' THEN
        RAISE EXCEPTION 'Only ACCEPTED offers can be converted to orders';
    END IF;

    -- Check if an order already exists for this offer
    IF EXISTS (SELECT 1 FROM public.orders WHERE b2b_offer_id = p_offer_id) THEN
        RAISE EXCEPTION 'An order has already been created for this offer';
    END IF;

    -- Lock the listing to check stock
    SELECT l.id, l.title, l.status, l.quantity as stock, l.store_id, l.listing_type
    INTO v_listing
    FROM public.listings l
    WHERE l.id = v_offer.listing_id
    FOR UPDATE;

    IF v_listing IS NULL THEN
        RAISE EXCEPTION 'Listing not found';
    END IF;

    IF v_listing.status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Listing is no longer active';
    END IF;

    -- Get first image
    SELECT url INTO v_img_url FROM public.listing_images WHERE listing_id = v_listing.id ORDER BY order_index ASC LIMIT 1;

    -- Determine agreed price and quantity (fallback to requested if no counter offer was made)
    DECLARE
        v_final_quantity INTEGER := COALESCE(v_offer.offered_quantity, v_offer.requested_quantity);
        v_final_price NUMERIC(12,2) := COALESCE(v_offer.offered_price, v_offer.requested_price);
    BEGIN
        -- Calculate currently reserved stock in PENDING/CONFIRMED orders
        SELECT COALESCE(SUM(oi.quantity), 0) INTO v_active_reserved
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.listing_id = v_listing.id 
        AND o.status IN ('PENDING', 'CONFIRMED');

        -- B2B usually requires multiple items, but we use the same stock logic
        IF v_active_reserved + v_final_quantity > COALESCE(v_listing.stock, 0) THEN
            RAISE EXCEPTION 'Item does not have enough available stock (Available: %, Requested: %)', 
                COALESCE(v_listing.stock, 0) - v_active_reserved, 
                v_final_quantity;
        END IF;

        v_total_amount := v_final_price * v_final_quantity;

        -- Create the order
        INSERT INTO public.orders (
            buyer_id,
            seller_id,
            store_id,
            total_amount,
            status,
            payment_status,
            delivery_type,
            notes,
            b2b_offer_id
        ) VALUES (
            v_uid,
            v_offer.seller_id,
            v_listing.store_id,
            v_total_amount,
            'PENDING',
            'PENDING',
            'PICKUP', -- Or negotiate this later
            'Created from B2B Offer',
            p_offer_id
        ) RETURNING id INTO v_order_id;

        -- Insert order items
        INSERT INTO public.order_items (
            order_id,
            listing_id,
            quantity,
            unit_price,
            title_snapshot,
            image_url_snapshot
        ) VALUES (
            v_order_id,
            v_listing.id,
            v_final_quantity,
            v_final_price,
            v_listing.title,
            v_img_url
        );

        -- Send notification to seller
        INSERT INTO public.notifications (user_id, type, message, link)
        VALUES (
            v_offer.seller_id, 
            'NEW_ORDER', 
            'Покупатель оформил B2B-заказ!', 
            '/seller/orders/' || v_order_id
        );

        RETURN v_order_id;
    END;
END;
$$;


-- 20261001000002_stage13_order_management.sql
-- Migration: Stage 13 Order Management Fixes
-- Description: Fix complete_order signature to match frontend and use auth.uid()

DROP FUNCTION IF EXISTS public.complete_order(UUID, UUID);
DROP FUNCTION IF EXISTS public.complete_order(UUID);

CREATE OR REPLACE FUNCTION public.complete_order(order_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_listing RECORD;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    -- Get order and lock it for update to prevent concurrent completions
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_param FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Security check: only the seller can complete (Wait, complete is usually done by seller to indicate they handed it over? Or buyer?)
    -- The frontend has "COMPLETED" available for seller in order-actions.tsx!
    -- Yes, `isSeller` branch has `COMPLETED`.
    IF v_order.seller_id != v_uid THEN
        RAISE EXCEPTION 'Unauthorized: only seller can complete this order';
    END IF;

    -- Idempotency and State Machine check
    IF v_order.status = 'COMPLETED' THEN
        RETURN TRUE;
    END IF;

    IF v_order.status != 'CONFIRMED' THEN
        RAISE EXCEPTION 'Order must be CONFIRMED to complete';
    END IF;

    -- Loop through items
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = order_id_param LOOP
        -- Lock listing
        SELECT * INTO v_listing FROM public.listings WHERE id = v_item.listing_id FOR UPDATE;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Listing % not found', v_item.listing_id;
        END IF;

        IF v_listing.status != 'ACTIVE' THEN
            RAISE EXCEPTION 'Listing is no longer ACTIVE';
        END IF;

        IF v_listing.listing_type = 'SINGLE' THEN
            UPDATE public.listings SET status = 'SOLD' WHERE id = v_listing.id;
        ELSIF v_listing.listing_type = 'INVENTORY' THEN
            IF v_listing.quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Недостаточно товара в наличии для завершения этой сделки.';
            END IF;
            
            UPDATE public.listings SET quantity = quantity - v_item.quantity WHERE id = v_listing.id;
            
            IF (v_listing.quantity - v_item.quantity) = 0 THEN
                UPDATE public.listings SET status = 'OUT_OF_STOCK' WHERE id = v_listing.id;
            END IF;
        END IF;
    END LOOP;

    -- Mark order as completed
    UPDATE public.orders 
    SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() 
    WHERE id = order_id_param;
    
    RETURN TRUE;
END;
$$;


