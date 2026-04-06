CREATE POLICY "Drivers can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'vozac'::app_role));

CREATE POLICY "Drivers can view all orders"
ON public.orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'vozac'::app_role));