-- 1. Апгрейд таблицы запросов (requests) под AI-снабженца BazaarOS
ALTER TABLE public.requests 
  ALTER COLUMN category_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NOT NULL DEFAULT 'шт',
  ADD COLUMN IF NOT EXISTS specs VARCHAR(255),
  ADD COLUMN IF NOT EXISTS max_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS deadline_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS raw_ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS category_tag VARCHAR(100) DEFAULT 'packaging';

-- RLS: Покупатель может менять статус предложения (принять/отклонить) по своей заявке
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Buyers can update offers on their requests.') THEN
    CREATE POLICY "Buyers can update offers on their requests." 
      ON public.request_offers FOR UPDATE 
      USING (auth.uid() = (SELECT buyer_id FROM public.requests WHERE id = request_id))
      WITH CHECK (auth.uid() = (SELECT buyer_id FROM public.requests WHERE id = request_id));
  END IF;
END $$;

-- 2. Апгрейд таблицы ответов поставщиков (request_offers) для расчета полной стоимости
ALTER TABLE public.request_offers
  ALTER COLUMN message DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS offered_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS moq INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(14, 2) GENERATED ALWAYS AS (
    (COALESCE(unit_price, 0) * COALESCE(offered_quantity, 1)) + COALESCE(delivery_cost, 0)
  ) STORED,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING';

-- Индекс для быстрой сортировки лучших предложений по полной цене и сроку
CREATE INDEX IF NOT EXISTS idx_request_offers_ranking 
  ON public.request_offers (request_id, total_cost ASC, lead_time_days ASC);
