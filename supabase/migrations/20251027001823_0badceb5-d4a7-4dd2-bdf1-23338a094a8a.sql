-- Add approved status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved boolean DEFAULT false;

-- Update RLS policies for profiles to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update profiles (for approval/store assignment)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update user_roles RLS to allow admins to manage roles for all users
CREATE POLICY "Admins can insert any user role"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any user role"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any user role"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));