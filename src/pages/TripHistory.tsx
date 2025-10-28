import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Car, LogOut, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Trip {
  id: string;
  destination: string;
  purpose: string | null;
  start_mileage: number;
  end_mileage: number | null;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  range_remaining: number | null;
  parking_floor: number | null;
  parking_spot: string | null;
  vehicle: {
    name: string;
    license_plate: string;
  };
}

const TripHistory = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchTrips();
  }, [user, navigate]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          *,
          vehicle:vehicles(name, license_plate)
        `)
        .eq('user_id', user!.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (error) {
      toast.error('Erro ao carregar histórico de viagens');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (trip: Trip) => {
    if (trip.end_mileage && trip.start_mileage) {
      return trip.end_mileage - trip.start_mileage;
    }
    return null;
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
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Histórico de Viagens</CardTitle>
            <CardDescription>
              Todas as suas viagens registadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                A carregar histórico...
              </div>
            ) : trips.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Ainda não tem viagens registadas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Distância</TableHead>
                      <TableHead>Estacionamento</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => {
                      const distance = calculateDistance(trip);
                      return (
                        <TableRow key={trip.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{trip.vehicle.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {trip.vehicle.license_plate}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{trip.destination}</div>
                              {trip.purpose && (
                                <div className="text-sm text-muted-foreground">
                                  {trip.purpose}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(trip.start_time), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell>
                            {trip.end_time ? (
                              <div className="text-sm">
                                {format(new Date(trip.end_time), 'dd/MM/yyyy HH:mm')}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {distance !== null ? (
                              <span>{distance} km</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {trip.parking_floor !== null && trip.parking_spot ? (
                              <div className="text-sm">
                                <div>Piso {trip.parking_floor}</div>
                                <div className="text-muted-foreground">Lugar {trip.parking_spot}</div>
                                {trip.range_remaining !== null && (
                                  <div className="text-muted-foreground">
                                    {trip.range_remaining} km autonomia
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={trip.is_active ? 'default' : 'secondary'}>
                              {trip.is_active ? 'Ativa' : 'Concluída'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TripHistory;
