-- Change default status from ACTIVE to OPEN
ALTER TABLE public.requests ALTER COLUMN status SET DEFAULT 'OPEN';

-- If there are any 'ACTIVE' rows, change them to 'OPEN'
UPDATE public.requests SET status = 'OPEN' WHERE status = 'ACTIVE';
