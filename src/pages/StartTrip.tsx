import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OnboardingTour } from '@/components/OnboardingTour';
import { toast } from 'sonner';
import { z } from 'zod';
import { Car, LogOut, History, Menu, Calendar, TrendingUp, FileText, BookOpen } from 'lucide-react';
import { Step } from 'react-joyride';

const destinationSchema = z.string().trim().min(3, 'Destination must be at least 3 characters').max(200);
const mileageSchema = z.coerce.number().int().min(0, 'Mileage must be a positive number').max(999999);

const StartTrip = () => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Array<{ id: string; name: string; license_plate: string; range_remaining: number | null }>>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [runTour, setRunTour] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);

  const tourSteps: Step[] = [
    {
      target: 'body',
      content: 'Bem-vindo ao Fleet Tracker! Vou mostrar-te como usar a aplicação 🚗',
      placement: 'center',
    },
    {
      target: '[id="vehicle"]',
      content: 'Aqui podes escolher o veículo que vais usar para a tua viagem',
    },
    {
      target: '[id="destination"]',
      content: 'Preenche o destino da viagem',
    },
    {
      target: '[id="start_mileage"]',
      content: 'Insere a quilometragem inicial do veículo',
    },
    {
      target: '.menu-dropdown',
      content: 'Acede aqui às reservas, rankings, histórico e observações',
    },
    {
      target: '.start-trip-button',
      content: 'Quando estiveres pronto, clica aqui para começar a viagem!',
    },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchVehicles();
    
    // Check if QR code was scanned
    const vehicleCode = searchParams.get('vehicle');
    if (vehicleCode) {
      // Find vehicle by QR code
      supabase
        .from('vehicles')
        .select('id')
        .eq('qr_code', vehicleCode)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedVehicle(data.id);
          }
        });
    }

    // Check if user needs onboarding tour
    if (profile && !profile.has_completed_tour) {
      setTimeout(() => setRunTour(true), 1000);
    }
  }, [user, navigate, searchParams, profile]);

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('id, name, license_plate')
      .order('name');
    
    if (data) {
      // Fetch range_remaining for each vehicle from latest active trip
      const vehiclesWithRange = await Promise.all(
        data.map(async (vehicle) => {
          const { data: tripData } = await supabase
            .from('trips')
            .select('range_remaining')
            .eq('vehicle_id', vehicle.id)
            .order('start_time', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          return {
            ...vehicle,
            range_remaining: tripData?.range_remaining || null,
          };
        })
      );
      
      setVehicles(vehiclesWithRange);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const destination = formData.get('destination') as string;
    const purpose = formData.get('purpose') as string;
    const startMileage = formData.get('start_mileage') as string;

    try {
      destinationSchema.parse(destination);
      mileageSchema.parse(startMileage);

      if (!selectedVehicle) {
        toast.error('Please select a vehicle');
        return;
      }

      const { error } = await supabase
        .from('trips')
        .insert({
          user_id: user!.id,
          vehicle_id: selectedVehicle,
          destination: destination.trim(),
          purpose: purpose.trim() || null,
          start_mileage: parseInt(startMileage),
          is_active: true,
        });

      if (error) {
        toast.error('Failed to start trip');
      } else {
        toast.success('Trip started successfully!');
        navigate('/trips');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTourFinish = async () => {
    setRunTour(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({ has_completed_tour: true })
        .eq('id', user.id);
    }
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
            <h1 className="text-xl font-bold">Fleet Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && <span className="text-sm text-muted-foreground">{profile.full_name}</span>}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="menu-dropdown">
                  <Menu className="mr-2 h-4 w-4" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/trips')}>
                  <Car className="mr-2 h-4 w-4" />
                  Viagens Ativas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/history')}>
                  <History className="mr-2 h-4 w-4" />
                  Histórico
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/reservations')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Reservas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/rankings')}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Rankings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/observations')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Observações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={restartTour}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Rever Tour
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ThemeToggle />
            
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl p-4 py-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Start New Trip</CardTitle>
            <CardDescription>
              Enter your trip details to begin tracking vehicle usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Select Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle} required>
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Choose a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.license_plate})
                        {vehicle.range_remaining && vehicle.range_remaining < 130 && (
                          <span className="ml-2 text-xs text-destructive">⚠️ Bateria baixa ({vehicle.range_remaining}km)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicleData?.range_remaining && selectedVehicleData.range_remaining < 130 && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    ⚠️ <strong>Aviso:</strong> Este veículo tem apenas {selectedVehicleData.range_remaining}km de autonomia restante. Considere carregar antes de iniciar a viagem.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="e.g., Downtown Office, Client Site"
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose (Optional)</Label>
                <Textarea
                  id="purpose"
                  name="purpose"
                  placeholder="e.g., Client meeting, Delivery"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_mileage">Starting Mileage</Label>
                <Input
                  id="start_mileage"
                  name="start_mileage"
                  type="number"
                  placeholder="12345"
                  required
                  min="0"
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full start-trip-button" disabled={loading}>
                  {loading ? 'A iniciar viagem...' : 'Iniciar Viagem'}
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/trips')}
                  >
                    Ver Viagens Ativas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate('/history')}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Histórico
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <OnboardingTour run={runTour} steps={tourSteps} onFinish={handleTourFinish} />
    </div>
  );
};

export default StartTrip;
