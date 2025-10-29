-- Add DELETE policy for vehicles (admins only)
CREATE POLICY "Admins can delete vehicles"
ON public.vehicles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));