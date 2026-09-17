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
