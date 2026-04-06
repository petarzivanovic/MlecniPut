
CREATE TABLE public.partner_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bpg TEXT NOT NULL,
  jmbg TEXT NOT NULL,
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  capacity_liters_per_day NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit partner application"
ON public.partner_applications
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Only admins can view applications"
ON public.partner_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'));
