import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { z } from 'zod';
import { Car, LogOut, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const mileageSchema = z.coerce.number().int().min(0, 'Mileage must be a positive number').max(999999);

interface Trip {
  id: string;
  destination: string;
  purpose: string | null;
  start_mileage: number;
  start_time: string;
  vehicles: {
    name: string;
    license_plate: string;
  };
}

const ActiveTrips = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [endMileage, setEndMileage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchActiveTrips();
  }, [user, navigate]);

  const fetchActiveTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select(`
        id,
        destination,
        purpose,
        start_mileage,
        start_time,
        vehicles (
          name,
          license_plate
        )
      `)
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('start_time', { ascending: false });
    
    if (data) {
      setTrips(data as any);
    }
    setLoading(false);
  };

  const handleEndTrip = async () => {
    if (!selectedTrip) return;
    
    setSubmitting(true);
    try {
      mileageSchema.parse(endMileage);
      
      const endMileageNum = parseInt(endMileage);
      if (endMileageNum < selectedTrip.start_mileage) {
        toast.error('End mileage cannot be less than start mileage');
        return;
      }

      const { error } = await supabase
        .from('trips')
        .update({
          end_mileage: endMileageNum,
          end_time: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', selectedTrip.id);

      if (error) {
        toast.error('Failed to end trip');
      } else {
        toast.success('Trip ended successfully!');
        setSelectedTrip(null);
        setEndMileage('');
        fetchActiveTrips();
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Fleet Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && <span className="text-sm text-muted-foreground">{profile.full_name}</span>}
            {profile?.is_admin && (
              <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
                Admin Dashboard
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl p-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Active Trips</h2>
            <p className="text-muted-foreground">Select a trip to end it</p>
          </div>
          <Button onClick={() => navigate('/')}>
            Start New Trip
          </Button>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Loading trips...</div>
        ) : trips.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No active trips</p>
              <p className="text-sm text-muted-foreground">Start a new trip to begin tracking</p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Start Trip
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <Card key={trip.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setSelectedTrip(trip)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {trip.vehicles.name}
                        <Badge variant="secondary">{trip.vehicles.license_plate}</Badge>
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {trip.destination}
                      </CardDescription>
                    </div>
                    <Badge className="bg-accent">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(trip.start_time), 'MMM d, h:mm a')}
                    </div>
                    <div>Start: {trip.start_mileage.toLocaleString()} km</div>
                    {trip.purpose && <div className="truncate">Purpose: {trip.purpose}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Trip</DialogTitle>
            <DialogDescription>
              Enter the ending mileage to complete this trip
            </DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="font-medium">{selectedTrip.vehicles.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTrip.destination}</p>
                <p className="mt-2 text-sm">Starting mileage: {selectedTrip.start_mileage.toLocaleString()} km</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_mileage">Ending Mileage</Label>
                <Input
                  id="end_mileage"
                  type="number"
                  placeholder="Enter current mileage"
                  value={endMileage}
                  onChange={(e) => setEndMileage(e.target.value)}
                  min={selectedTrip.start_mileage}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleEndTrip}
                  disabled={!endMileage || submitting}
                  className="flex-1"
                >
                  {submitting ? 'Ending Trip...' : 'End Trip'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTrip(null);
                    setEndMileage('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActiveTrips;
