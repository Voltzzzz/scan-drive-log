import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OnboardingTour } from '@/components/OnboardingTour';
import VehicleQRCodesDialog from '@/components/VehicleQRCodesDialog';
import VehicleManagement from '@/components/VehicleManagement';
import UserTripsHistory from '@/components/UserTripsHistory';
import { toast } from 'sonner';
import { Car, LogOut, TrendingUp, Users, Route, QrCode, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Step } from 'react-joyride';

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
  const [runTour, setRunTour] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    activeTrips: 0,
    totalMileage: 0,
  });
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const adminTourSteps: Step[] = [
    {
      target: 'body',
      content: 'Bem-vindo ao Painel de Administração! Como admin, tens acesso a funcionalidades especiais 👨‍💼',
      placement: 'center',
    },
    {
      target: '[role="tablist"]',
      content: 'Explora as diferentes secções: Resumo, Veículos, Análises, Histórico e Viagens Recentes',
    },
    {
      target: '.qr-button',
      content: 'Gera códigos QR para facilitar o check-in dos veículos',
    },
    {
      target: '[data-state="active"]',
      content: 'Aqui tens estatísticas importantes sobre a frota e utilização',
    },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
      return;
    }

    fetchTrips();

    // Check if admin needs onboarding tour (first time in admin panel)
    const hasSeenAdminTour = localStorage.getItem('hasSeenAdminTour');
    if (!hasSeenAdminTour) {
      setTimeout(() => setRunTour(true), 1000);
    }
  }, [user, isAdmin, navigate]);

  const fetchTrips = async () => {
    setLoading(true);
    
    // Fetch all trips for accurate stats
    const { data: allTrips } = await supabase
      .from('trips')
      .select('id, end_mileage, start_mileage, is_active');
    
    // Fetch recent trips with details
    const { data: recentTrips, error: tripsError } = await supabase
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
    
    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
      toast.error('Erro ao carregar viagens recentes');
    }
    
    if (recentTrips) {
      setTrips(recentTrips as any);
    }
    
    if (allTrips) {
      // Calculate stats from all trips
      const activeTrips = allTrips.filter(t => t.is_active).length;
      const totalMileage = allTrips.reduce((sum, trip) => {
        if (trip.end_mileage) {
          return sum + (trip.end_mileage - trip.start_mileage);
        }
        return sum;
      }, 0);
      
      setStats({
        totalTrips: allTrips.length,
        activeTrips,
        totalMileage,
      });
    }
    
    setLoading(false);
  };

  const handleTourFinish = () => {
    setRunTour(false);
    localStorage.setItem('hasSeenAdminTour', 'true');
  };

  const restartTour = () => {
    setRunTour(true);
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
            <Button variant="outline" size="sm" onClick={restartTour}>
              <BookOpen className="mr-2 h-4 w-4" />
              Tour
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQrDialogOpen(true)} className="qr-button">
              <QrCode className="mr-2 h-4 w-4" />
              View QR Codes
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Back to App
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 py-8">
        <h2 className="mb-6 text-3xl font-bold">Painel de Administração</h2>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="vehicles">Veículos</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
            <TabsTrigger value="user-history">Histórico</TabsTrigger>
            <TabsTrigger value="recent">Viagens Recentes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total de Viagens</CardTitle>
                  <Route className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTrips}</div>
                  <p className="text-xs text-muted-foreground">Todas as viagens</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Viagens Ativas</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeTrips}</div>
                  <p className="text-xs text-muted-foreground">Em curso</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Quilometragem Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMileage.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Quilómetros registados</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vehicles">
            <VehicleManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/rankings')}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rankings de Utilizadores
                  </CardTitle>
                  <CardDescription>Ver top condutores por quilómetros percorridos</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/vehicle-stats')}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Estatísticas de Veículos
                  </CardTitle>
                  <CardDescription>Utilização e performance de cada veículo</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/reservations')}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Reservas de Veículos
                  </CardTitle>
                  <CardDescription>Gerir reservas e disponibilidade</CardDescription>
                </CardHeader>
              </Card>
              
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/observations')}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Observações de Veículos
                  </CardTitle>
                  <CardDescription>Ver problemas e observações reportadas</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="user-history">
            <UserTripsHistory />
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Viagens Recentes</CardTitle>
                <CardDescription>Últimas 50 viagens de todos os veículos</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center text-muted-foreground">A carregar viagens...</div>
                ) : trips.length === 0 ? (
                  <div className="text-center text-muted-foreground">Ainda não há viagens registadas</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Condutor</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead>Início</TableHead>
                          <TableHead>Distância</TableHead>
                          <TableHead>Estado</TableHead>
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
                              {format(new Date(trip.start_time), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              {trip.end_mileage 
                                ? `${(trip.end_mileage - trip.start_mileage).toLocaleString()} km`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {trip.is_active ? (
                                <Badge>Ativa</Badge>
                              ) : (
                                <Badge variant="secondary">Concluída</Badge>
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
          </TabsContent>
        </Tabs>
      </main>

      <VehicleQRCodesDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} />
      <OnboardingTour run={runTour} steps={adminTourSteps} onFinish={handleTourFinish} />
    </div>
  );
};

export default AdminDashboard;
