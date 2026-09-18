-- Add show_phone column to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS show_phone BOOLEAN NOT NULL DEFAULT false;
