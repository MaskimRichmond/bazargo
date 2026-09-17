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
