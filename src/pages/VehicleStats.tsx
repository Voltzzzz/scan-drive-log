import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Car, TrendingUp, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface VehicleStat {
  vehicle_id: string;
  vehicle_name: string;
  license_plate: string;
  total_trips: number;
  total_km: number;
  avg_km_per_trip: number;
  active_issues: number;
}

export default function VehicleStats() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<VehicleStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchStats();
  }, [user, navigate]);

  const fetchStats = async () => {
    try {
      // Fetch trips data
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select(`
          vehicle_id,
          start_mileage,
          end_mileage,
          vehicles!trips_vehicle_id_fkey (
            name,
            license_plate
          )
        `)
        .not("end_mileage", "is", null);

      if (tripsError) throw tripsError;

      // Fetch observations (issues) data
      const { data: issuesData, error: issuesError } = await supabase
        .from("vehicle_observations")
        .select("vehicle_id")
        .eq("observation_type", "issue")
        .eq("is_resolved", false);

      if (issuesError) throw issuesError;

      // Count issues per vehicle
      const issuesMap = new Map<string, number>();
      issuesData?.forEach((issue) => {
        issuesMap.set(issue.vehicle_id, (issuesMap.get(issue.vehicle_id) || 0) + 1);
      });

      // Aggregate data by vehicle
      const vehicleMap = new Map<string, VehicleStat>();
      
      tripsData?.forEach((trip: any) => {
        const distance = (trip.end_mileage || 0) - trip.start_mileage;
        const existing = vehicleMap.get(trip.vehicle_id);
        
        if (existing) {
          existing.total_km += distance;
          existing.total_trips += 1;
        } else {
          vehicleMap.set(trip.vehicle_id, {
            vehicle_id: trip.vehicle_id,
            vehicle_name: trip.vehicles?.name || "Veículo",
            license_plate: trip.vehicles?.license_plate || "N/A",
            total_km: distance,
            total_trips: 1,
            avg_km_per_trip: 0,
            active_issues: issuesMap.get(trip.vehicle_id) || 0,
          });
        }
      });

      // Calculate averages
      const statsArray = Array.from(vehicleMap.values()).map((stat) => ({
        ...stat,
        avg_km_per_trip: stat.total_km / stat.total_trips,
      })).sort((a, b) => b.total_km - a.total_km);

      setStats(statsArray);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    total_km: {
      label: "Total KM",
      color: "hsl(var(--chart-1))",
    },
    total_trips: {
      label: "Total Viagens",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Estatísticas de Veículos</h1>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">A carregar...</p>
        ) : stats.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                Sem dados de viagens disponíveis
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Utilização por Veículo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="vehicle_name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="total_km"
                        fill="var(--color-total_km)"
                        name="Total KM"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="total_trips"
                        fill="var(--color-total_trips)"
                        name="Total Viagens"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.map((stat) => (
                <Card key={stat.vehicle_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        {stat.vehicle_name}
                      </div>
                      {stat.active_issues > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">{stat.active_issues}</span>
                        </div>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {stat.license_plate}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total de viagens:
                      </span>
                      <span className="font-semibold">{stat.total_trips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total de KM:
                      </span>
                      <span className="font-semibold">
                        {stat.total_km.toLocaleString()} km
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Média por viagem:
                      </span>
                      <span className="font-semibold">
                        {stat.avg_km_per_trip.toFixed(1)} km
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
