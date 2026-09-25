ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read search synonyms" ON public.search_synonyms FOR SELECT USING (true);
