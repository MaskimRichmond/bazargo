-- Add ARCHIVED status to listing_status enum
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'ARCHIVED';
