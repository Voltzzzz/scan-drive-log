import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import VehicleQRCodesDialog from '@/components/VehicleQRCodesDialog';
import { toast } from 'sonner';
import { Car, LogOut, TrendingUp, Users, Route, QrCode } from 'lucide-react';
import { format } from 'date-fns';

interface TripData {
  id: string;
  destination: string;
  start_mileage: number;
  end_mileage: number | null;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  profiles: {
    full_name: string;
  };
  vehicles: {
    name: string;
    license_plate: string;
  };
}

const AdminDashboard = () => {
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    totalMileage: 0,
  });
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!profile?.is_admin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    fetchTrips();
  }, [user, profile, navigate]);

  const fetchTrips = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trips')
      .select(`
        id,
        destination,
        start_mileage,
        end_mileage,
        start_time,
        end_time,
        is_active,
        profiles (
          full_name
        ),
        vehicles (
          name,
          license_plate
        )
      `)
      .order('start_time', { ascending: false })
      .limit(50);
    
    if (data) {
      setTrips(data as any);
      
      // Calculate stats
      const activeTrips = data.filter(t => t.is_active).length;
      const totalMileage = data.reduce((sum, trip) => {
        if (trip.end_mileage) {
          return sum + (trip.end_mileage - trip.start_mileage);
        }
        return sum;
      }, 0);
      
      setStats({
        totalTrips: data.length,
        activeTrips,
        totalMileage,
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Fleet Tracker - Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && <span className="text-sm text-muted-foreground">{profile.full_name}</span>}
            <Button variant="outline" size="sm" onClick={() => setQrDialogOpen(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              View QR Codes
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Back to App
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 py-8">
        <h2 className="mb-6 text-3xl font-bold">Dashboard Overview</h2>
        
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
              <Route className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeTrips}</div>
              <p className="text-xs text-muted-foreground">Currently in progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Mileage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMileage.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Kilometers tracked</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Trips</CardTitle>
            <CardDescription>Overview of all fleet vehicle usage</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center text-muted-foreground">Loading trips...</div>
            ) : trips.length === 0 ? (
              <div className="text-center text-muted-foreground">No trips recorded yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell className="font-medium">{trip.profiles.full_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{trip.vehicles.name}</p>
                            <p className="text-xs text-muted-foreground">{trip.vehicles.license_plate}</p>
                          </div>
                        </TableCell>
                        <TableCell>{trip.destination}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(trip.start_time), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                          {trip.end_mileage 
                            ? `${(trip.end_mileage - trip.start_mileage).toLocaleString()} km`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {trip.is_active ? (
                            <Badge className="bg-accent">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Completed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <VehicleQRCodesDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} />
    </div>
  );
};

export default AdminDashboard;
