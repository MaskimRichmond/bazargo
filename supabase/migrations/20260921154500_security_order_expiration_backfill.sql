-- ==========================================
-- STAGE 4.1: Corrective Order Expiration Backfill
-- ==========================================

-- Problem: The previous migration used `DEFAULT (NOW() + INTERVAL '24 hours')` 
-- which filled all existing orders (both pending and terminal) with `migration_time + 24h`.
-- We need to correct existing PENDING orders to use their actual `created_at`,
-- and optionally clear expires_at for non-pending orders for semantic correctness.

-- 1. Correct existing PENDING orders to expire based on their actual creation time
UPDATE public.orders
SET expires_at = created_at + INTERVAL '24 hours'
WHERE status = 'PENDING';

-- 2. Clear expires_at for already confirmed or terminal orders to avoid confusion.
-- (They will never be expired anyway because the RPC strictly checks status = 'PENDING')
UPDATE public.orders
SET expires_at = NULL
WHERE status != 'PENDING';

-- Note: The pg_cron block from the previous migration might have failed gracefully
-- if pg_cron was unavailable. The Vercel Cron API route will take over execution.
