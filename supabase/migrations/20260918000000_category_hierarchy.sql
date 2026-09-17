-- Create hierarchy for electronics
UPDATE public.categories 
SET parent_id = (SELECT id FROM public.categories WHERE slug = 'electronics') 
WHERE slug IN ('phones', 'computers');

-- Fix icons for electronics
UPDATE public.categories SET icon_name = 'Monitor' WHERE slug = 'electronics';
UPDATE public.categories SET icon_name = 'Smartphone' WHERE slug = 'phones';
UPDATE public.categories SET icon_name = 'Laptop' WHERE slug = 'computers';
