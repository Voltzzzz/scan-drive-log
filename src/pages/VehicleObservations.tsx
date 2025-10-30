import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, AlertCircle, FileText, Wrench, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Observation {
  id: string;
  vehicle_id: string;
  observation_type: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  vehicles: {
    name: string;
    license_plate: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function VehicleObservations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchObservations();
  }, [user, navigate, filterResolved]);

  const fetchObservations = async () => {
    try {
      let query = supabase
        .from("vehicle_observations")
        .select(`
          *,
          vehicles (name, license_plate),
          profiles!vehicle_observations_user_id_fkey (full_name)
        `)
        .order("created_at", { ascending: false });

      if (filterResolved !== null) {
        query = query.eq("is_resolved", filterResolved);
      }

      const { data, error } = await query;

      if (error) throw error;
      setObservations(data || []);
    } catch (error) {
      console.error("Error fetching observations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "issue":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-warning" />;
      case "note":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      issue: "Problema",
      maintenance: "Manutenção",
      note: "Nota",
    };
    return labels[type] || type;
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      issue: "destructive",
      maintenance: "secondary",
      note: "outline",
    };
    return variants[type] || "default";
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
          <h1 className="text-3xl font-bold">Observações de Veículos</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico de Observações
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={filterResolved === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterResolved(null)}
                >
                  Todas
                </Button>
                <Button
                  variant={filterResolved === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterResolved(false)}
                >
                  Pendentes
                </Button>
                <Button
                  variant={filterResolved === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterResolved(true)}
                >
                  Resolvidas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground">A carregar...</p>
            ) : observations.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Sem observações registadas
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Reportado por</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {observations.map((obs) => (
                    <TableRow key={obs.id}>
                      <TableCell>
                        {format(new Date(obs.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{obs.vehicles.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {obs.vehicles.license_plate}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(obs.observation_type)}
                          <Badge variant={getTypeBadgeVariant(obs.observation_type)}>
                            {getTypeLabel(obs.observation_type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2">{obs.description}</p>
                      </TableCell>
                      <TableCell>{obs.profiles.full_name}</TableCell>
                      <TableCell>
                        {obs.is_resolved ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Resolvida</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
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
