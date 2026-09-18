CREATE TYPE public.b2b_application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE public.b2b_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    categories TEXT,
    description TEXT,
    status public.b2b_application_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.b2b_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own b2b applications" 
ON public.b2b_applications FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can insert their own b2b applications" 
ON public.b2b_applications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- We won't allow users to update their applications for MVP, only admins can update (which implies service_role or admin RLS in the future)
