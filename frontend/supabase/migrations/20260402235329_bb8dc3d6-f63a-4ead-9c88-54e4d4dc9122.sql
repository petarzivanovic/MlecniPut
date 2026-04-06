CREATE POLICY "Drivers can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'vozac'::app_role));