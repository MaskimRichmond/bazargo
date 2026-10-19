-- Migration: Add B2B company profile fields for BazaarOS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Grant permissions for authenticated users to view and update their own B2B profile details
GRANT SELECT (company_name, business_type, delivery_address, whatsapp, telegram_username) ON public.profiles TO authenticated;
GRANT UPDATE (company_name, business_type, delivery_address, whatsapp, telegram_username) ON public.profiles TO authenticated;
