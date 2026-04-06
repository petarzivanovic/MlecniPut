
-- Allow drivers to read approved partner applications (supplies)
CREATE POLICY "Drivers can view approved applications"
ON public.partner_applications
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'vozac'::app_role)
  AND status = 'approved'
);
