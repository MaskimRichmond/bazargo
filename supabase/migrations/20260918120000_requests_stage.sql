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
