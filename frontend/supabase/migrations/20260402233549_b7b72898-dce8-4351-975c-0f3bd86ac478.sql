
CREATE TABLE public.farmer_daily_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week text NOT NULL,
  liters numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_day UNIQUE (user_id, day_of_week)
);

ALTER TABLE public.farmer_daily_offers ENABLE ROW LEVEL SECURITY;

-- Farmers can read own offers
CREATE POLICY "Users can view own daily offers"
ON public.farmer_daily_offers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Farmers can insert own offers
CREATE POLICY "Users can insert own daily offers"
ON public.farmer_daily_offers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Farmers can update own offers
CREATE POLICY "Users can update own daily offers"
ON public.farmer_daily_offers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Dispatchers can view all offers
CREATE POLICY "Dispatchers can view all daily offers"
ON public.farmer_daily_offers FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'dispecer'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_farmer_daily_offers_updated_at
BEFORE UPDATE ON public.farmer_daily_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
