-- Add parking and range information to trips table
ALTER TABLE public.trips 
ADD COLUMN range_remaining integer,
ADD COLUMN parking_floor integer CHECK (parking_floor >= 0 AND parking_floor <= 7),
ADD COLUMN parking_spot text;