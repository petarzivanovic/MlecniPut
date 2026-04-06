CREATE POLICY "Dispatchers can delete partner applications"
ON public.partner_applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'dispecer'::app_role));