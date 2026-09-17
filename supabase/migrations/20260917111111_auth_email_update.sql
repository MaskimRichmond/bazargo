-- Add email to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Update trigger to handle email and phone gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.phone,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
