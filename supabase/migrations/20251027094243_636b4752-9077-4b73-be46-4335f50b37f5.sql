-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Drop old recursive policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new non-recursive policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Drop old recursive policies on trips
DROP POLICY IF EXISTS "Admins can view all trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can create their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;

-- Create new policies for trips
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trips"
  ON public.trips FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Drop old recursive policies on vehicles
DROP POLICY IF EXISTS "Admins can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins can update vehicles" ON public.vehicles;

-- Create new policies for vehicles
CREATE POLICY "Admins can insert vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Remove is_admin column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- Insert admin role for the specified user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'jose.sousa@reckon.ai'
ON CONFLICT (user_id, role) DO NOTHING;

-- Also insert 'user' role for all existing users who don't have it
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = 'user')
ON CONFLICT (user_id, role) DO NOTHING;