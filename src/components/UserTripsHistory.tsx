import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface User {
  id: string;
  full_name: string;
}

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

const UserTripsHistory = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserTrips(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');

    if (error) {
      toast.error('Erro ao carregar utilizadores');
    } else {
      setUsers(data || []);
    }
  };

  const fetchUserTrips = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        vehicle:vehicles(name, license_plate)
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar viagens');
    } else {
      setTrips(data || []);
    }
    setLoading(false);
  };

  const calculateDistance = (trip: Trip) => {
    if (trip.end_mileage && trip.start_mileage) {
      return trip.end_mileage - trip.start_mileage;
    }
    return null;
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Viagens por Utilizador</CardTitle>
        <CardDescription>
          Selecione um utilizador para ver o seu histórico completo
        </CardDescription>
        <div className="mt-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Selecione um utilizador" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedUserId ? (
          <div className="py-8 text-center text-muted-foreground">
            Selecione um utilizador para ver as viagens
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-muted-foreground">
            A carregar histórico...
          </div>
        ) : trips.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {selectedUser?.full_name} ainda não tem viagens registadas
          </div>
        ) : (
          <div>
            <div className="mb-4 rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Utilizador</p>
              <p className="text-lg font-semibold">{selectedUser?.full_name}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Total de viagens: <span className="font-semibold">{trips.length}</span>
              </p>
            </div>
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
                                  {trip.range_remaining} km
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserTripsHistory;
