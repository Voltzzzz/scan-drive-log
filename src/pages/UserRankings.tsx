import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, ArrowLeft, Medal } from "lucide-react";

interface UserRanking {
  user_id: string;
  full_name: string;
  total_km: number;
  total_trips: number;
}

export default function UserRankings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRankings();
  }, [user, navigate]);

  const fetchRankings = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          user_id,
          start_mileage,
          end_mileage,
          profiles!trips_user_id_fkey (
            full_name
          )
        `)
        .not("end_mileage", "is", null);

      if (error) throw error;

      // Aggregate data by user
      const userMap = new Map<string, UserRanking>();
      
      data?.forEach((trip: any) => {
        const distance = (trip.end_mileage || 0) - trip.start_mileage;
        const existing = userMap.get(trip.user_id);
        
        if (existing) {
          existing.total_km += distance;
          existing.total_trips += 1;
        } else {
          userMap.set(trip.user_id, {
            user_id: trip.user_id,
            full_name: trip.profiles?.full_name || "Utilizador",
            total_km: distance,
            total_trips: 1,
          });
        }
      });

      // Convert to array and sort by total km
      const rankingsArray = Array.from(userMap.values()).sort(
        (a, b) => b.total_km - a.total_km
      );

      setRankings(rankingsArray);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Medal className="h-6 w-6 text-orange-600" />;
    return <span className="text-muted-foreground">#{position}</span>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Rankings de Utilizadores</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top Condutores por Quilómetros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">A carregar...</p>
            ) : rankings.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Sem dados de viagens disponíveis
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Posição</TableHead>
                    <TableHead>Utilizador</TableHead>
                    <TableHead className="text-right">Total KM</TableHead>
                    <TableHead className="text-right">Viagens</TableHead>
                    <TableHead className="text-right">Média KM/Viagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankings.map((ranking, index) => (
                    <TableRow
                      key={ranking.user_id}
                      className={
                        ranking.user_id === user?.id
                          ? "bg-accent/50 font-semibold"
                          : ""
                      }
                    >
                      <TableCell className="flex items-center justify-center">
                        {getMedalIcon(index + 1)}
                      </TableCell>
                      <TableCell>
                        {ranking.full_name}
                        {ranking.user_id === user?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Você)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ranking.total_km.toLocaleString()} km
                      </TableCell>
                      <TableCell className="text-right">
                        {ranking.total_trips}
                      </TableCell>
                      <TableCell className="text-right">
                        {(ranking.total_km / ranking.total_trips).toFixed(1)} km
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
