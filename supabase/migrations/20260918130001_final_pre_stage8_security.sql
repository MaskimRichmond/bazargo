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
