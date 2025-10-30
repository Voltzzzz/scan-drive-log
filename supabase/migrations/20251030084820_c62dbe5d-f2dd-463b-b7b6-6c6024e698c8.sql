-- Create enum for reservation status
CREATE TYPE public.reservation_status AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- Create enum for observation type
CREATE TYPE public.observation_type AS ENUM ('issue', 'note', 'maintenance');

-- Create vehicle_reservations table
CREATE TABLE public.vehicle_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_observations table
CREATE TABLE public.vehicle_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  observation_type observation_type NOT NULL,
  description TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_observations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vehicle_reservations
CREATE POLICY "Users can view their own reservations"
ON public.vehicle_reservations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations"
ON public.vehicle_reservations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
ON public.vehicle_reservations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reservations"
ON public.vehicle_reservations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all reservations"
ON public.vehicle_reservations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reservations"
ON public.vehicle_reservations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for vehicle_observations
CREATE POLICY "Users can view their own observations"
ON public.vehicle_observations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create observations"
ON public.vehicle_observations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all observations"
ON public.vehicle_observations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all observations"
ON public.vehicle_observations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for better performance
CREATE INDEX idx_reservations_vehicle_time ON public.vehicle_reservations(vehicle_id, start_time, end_time);
CREATE INDEX idx_reservations_user ON public.vehicle_reservations(user_id);
CREATE INDEX idx_observations_vehicle ON public.vehicle_observations(vehicle_id);
CREATE INDEX idx_observations_trip ON public.vehicle_observations(trip_id);

-- Trigger for updated_at on reservations
CREATE TRIGGER update_vehicle_reservations_updated_at
BEFORE UPDATE ON public.vehicle_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();