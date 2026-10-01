-- Migration: B2B Listings Fields
-- Description: Adds wholesale price and min order quantity for B2B transactions.

ALTER TABLE public.listings 
  ADD COLUMN is_b2b BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN wholesale_price NUMERIC(12, 2),
  ADD COLUMN min_order_quantity INTEGER DEFAULT 1;

-- Add check constraint to ensure wholesale_price makes sense if provided
ALTER TABLE public.listings
  ADD CONSTRAINT check_wholesale_price CHECK (wholesale_price IS NULL OR wholesale_price > 0),
  ADD CONSTRAINT check_min_order_qty CHECK (min_order_quantity >= 1);
