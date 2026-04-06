
-- Create driver_schedules table
CREATE TABLE public.driver_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  day_of_week TEXT NOT NULL,
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (driver_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.driver_schedules ENABLE ROW LEVEL SECURITY;

-- Dispatchers can do everything on driver_schedules
CREATE POLICY "Dispatchers can manage driver schedules"
ON public.driver_schedules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'))
WITH CHECK (public.has_role(auth.uid(), 'dispecer'));

-- Drivers can view their own schedule
CREATE POLICY "Drivers can view own schedule"
ON public.driver_schedules
FOR SELECT
TO authenticated
USING (auth.uid() = driver_id);

-- Allow dispatchers to update partner_applications
CREATE POLICY "Dispatchers can update partner applications"
ON public.partner_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'))
WITH CHECK (public.has_role(auth.uid(), 'dispecer'));

-- Allow dispatchers to manage user_roles (for assigning roles)
CREATE POLICY "Dispatchers can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'dispecer'));

CREATE POLICY "Dispatchers can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'))
WITH CHECK (public.has_role(auth.uid(), 'dispecer'));

-- Allow dispatchers to view all profiles
CREATE POLICY "Dispatchers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'));

-- Allow dispatchers to view all user roles
CREATE POLICY "Dispatchers can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'));

-- Allow dispatchers to view all subscriptions
CREATE POLICY "Dispatchers can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'));

-- Allow dispatchers to view all orders
CREATE POLICY "Dispatchers can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'dispecer'));

-- Trigger for updated_at on driver_schedules
CREATE TRIGGER update_driver_schedules_updated_at
BEFORE UPDATE ON public.driver_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
