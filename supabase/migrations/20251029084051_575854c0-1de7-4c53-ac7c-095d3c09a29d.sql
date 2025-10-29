-- Drop existing foreign key that references auth.users
ALTER TABLE public.trips
DROP CONSTRAINT IF EXISTS trips_user_id_fkey;

-- Add foreign key constraint to profiles table instead
ALTER TABLE public.trips
ADD CONSTRAINT trips_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;