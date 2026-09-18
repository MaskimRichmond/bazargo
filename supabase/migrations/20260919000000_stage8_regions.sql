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
