-- Add has_completed_tour field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN has_completed_tour BOOLEAN NOT NULL DEFAULT false;