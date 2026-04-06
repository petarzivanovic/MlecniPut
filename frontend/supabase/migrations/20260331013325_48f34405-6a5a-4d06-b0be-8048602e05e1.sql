
-- Add user_id column to partner_applications to link applicants to auth users
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add email column to partner_applications for display purposes
ALTER TABLE public.partner_applications ADD COLUMN IF NOT EXISTS email text;
