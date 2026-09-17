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
