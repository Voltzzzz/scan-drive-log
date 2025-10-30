import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface AddObservationDialogProps {
  vehicleId: string;
  tripId?: string;
  onSuccess?: () => void;
}

export default function AddObservationDialog({
  vehicleId,
  tripId,
  onSuccess,
}: AddObservationDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [observationType, setObservationType] = useState<string>("note");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Adicione uma descrição");
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("vehicle_observations").insert({
        vehicle_id: vehicleId,
        user_id: user!.id,
        trip_id: tripId || null,
        observation_type: observationType as "issue" | "note" | "maintenance",
        description: description.trim(),
      });

      if (error) throw error;

      toast.success("Observação registada com sucesso");
      setIsOpen(false);
      setDescription("");
      setObservationType("note");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error adding observation:", error);
      toast.error("Erro ao registar observação");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Adicionar Observação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Observação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Observação</Label>
            <Select value={observationType} onValueChange={setObservationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Nota</SelectItem>
                <SelectItem value="issue">Problema</SelectItem>
                <SelectItem value="maintenance">Necessita Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a observação, problema ou necessidade de manutenção..."
              rows={4}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
