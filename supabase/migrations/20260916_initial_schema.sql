-- Initial Schema for BazarGo MVP

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

