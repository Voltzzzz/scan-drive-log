import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Plus, Play, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, isSameDay, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
}

interface Reservation {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  vehicles: {
    name: string;
    license_plate: string;
  };
}

export default function VehicleReservations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isStartTripDialogOpen, setIsStartTripDialogOpen] = useState(false);
  const [startMileage, setStartMileage] = useState("");
  
  // Form state
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Fetch user's reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("vehicle_reservations")
        .select(`
          *,
          vehicles (name, license_plate)
        `)
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });

      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (vehicleId: string, start: string, end: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("vehicle_reservations")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .in("status", ["pending", "active"])
      .or(`start_time.lte.${end},end_time.gte.${start}`);

    if (error) {
      console.error("Error checking availability:", error);
      return false;
    }

    return data.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedVehicle || !startDate || !startTime || !endDate || !endTime) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      toast.error("A data de início deve ser anterior à data de fim");
      return;
    }

    // Check availability
    const isAvailable = await checkAvailability(selectedVehicle, startDateTime, endDateTime);
    
    if (!isAvailable) {
      toast.error("Veículo não disponível no período selecionado");
      return;
    }

    try {
      const { error } = await supabase.from("vehicle_reservations").insert({
        user_id: user!.id,
        vehicle_id: selectedVehicle,
        start_time: startDateTime,
        end_time: endDateTime,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success("Reserva criada com sucesso");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating reservation:", error);
      toast.error("Erro ao criar reserva");
    }
  };

  const resetForm = () => {
    setSelectedVehicle("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setNotes("");
  };

  const cancelReservation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vehicle_reservations")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Reserva cancelada");
      fetchData();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      toast.error("Erro ao cancelar reserva");
    }
  };

  const startTripFromReservation = async () => {
    if (!selectedReservation || !startMileage) {
      toast.error("Preencha a quilometragem inicial");
      return;
    }

    try {
      // Create trip
      const { error: tripError } = await supabase.from("trips").insert({
        user_id: user!.id,
        vehicle_id: selectedReservation.vehicle_id,
        start_mileage: parseInt(startMileage),
        destination: selectedReservation.notes || "Reserva",
        start_time: new Date().toISOString(),
      });

      if (tripError) throw tripError;

      // Update reservation status
      const { error: updateError } = await supabase
        .from("vehicle_reservations")
        .update({ status: "active" })
        .eq("id", selectedReservation.id);

      if (updateError) throw updateError;

      toast.success("Viagem iniciada com sucesso");
      setIsStartTripDialogOpen(false);
      setSelectedReservation(null);
      setStartMileage("");
      fetchData();
      navigate("/trips");
    } catch (error) {
      console.error("Error starting trip:", error);
      toast.error("Erro ao iniciar viagem");
    }
  };

  const filteredReservations = selectedDate
    ? reservations.filter((r) =>
        isSameDay(new Date(r.start_time), selectedDate)
      )
    : reservations;

  const reservationDates = reservations.map((r) =>
    startOfDay(new Date(r.start_time))
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      active: "default",
      completed: "outline",
      cancelled: "destructive",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      active: "Ativa",
      completed: "Concluída",
      cancelled: "Cancelada",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Reservas de Veículos</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Reserva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Reserva</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Veículo</Label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um veículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} - {vehicle.license_plate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Data Início</Label>
                    <Input
                      id="start-date"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Hora Início</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Data Fim</Label>
                    <Input
                      id="end-date"
                      type="date"
                      min={startDate || new Date().toISOString().split('T')[0]}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Hora Fim</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Motivo da reserva, notas adicionais..."
                  />
                </div>

                <Button type="submit" className="w-full">
                  Criar Reserva
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário de Reservas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={pt}
                modifiers={{
                  reserved: reservationDates,
                }}
                modifiersStyles={{
                  reserved: {
                    fontWeight: "bold",
                    textDecoration: "underline",
                  },
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate
                  ? `Reservas - ${format(selectedDate, "dd/MM/yyyy", { locale: pt })}`
                  : "Todas as Reservas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground">A carregar...</p>
              ) : filteredReservations.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  {selectedDate
                    ? "Sem reservas neste dia"
                    : "Ainda não tem reservas"}
                </p>
              ) : (
              <div className="space-y-4">
                  {filteredReservations.map((reservation) => (
                    <Card key={reservation.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {reservation.vehicles.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {reservation.vehicles.license_plate}
                          </p>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Início:</span>
                          <span className="font-medium">
                            {format(new Date(reservation.start_time), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Fim:</span>
                          <span className="font-medium">
                            {format(new Date(reservation.end_time), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>
                        {reservation.notes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Observações:</strong> {reservation.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {reservation.status === "pending" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedReservation(reservation);
                                setIsStartTripDialogOpen(true);
                              }}
                              className="gap-2 flex-1"
                            >
                              <Play className="h-4 w-4" />
                              Iniciar Viagem
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelReservation(reservation.id)}
                              className="gap-2"
                            >
                              <X className="h-4 w-4" />
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isStartTripDialogOpen} onOpenChange={setIsStartTripDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Viagem</DialogTitle>
            </DialogHeader>
            {selectedReservation && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Veículo</p>
                  <p className="font-medium">
                    {selectedReservation.vehicles.name} -{" "}
                    {selectedReservation.vehicles.license_plate}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start-mileage">Quilometragem Inicial</Label>
                  <Input
                    id="start-mileage"
                    type="number"
                    placeholder="Ex: 15000"
                    value={startMileage}
                    onChange={(e) => setStartMileage(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsStartTripDialogOpen(false);
                  setSelectedReservation(null);
                  setStartMileage("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={startTripFromReservation}>
                Iniciar Viagem
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
