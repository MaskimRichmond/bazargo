DROP POLICY IF EXISTS "Stores are viewable by everyone." ON public.stores;
CREATE POLICY "Stores are viewable by everyone." 
ON public.stores FOR SELECT 
USING (status = 'APPROVED' OR auth.uid() = owner_id);
