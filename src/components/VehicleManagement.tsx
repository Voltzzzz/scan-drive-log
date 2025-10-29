import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Car, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  qr_code: string;
  created_at: string;
}

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    license_plate: '',
    qr_code: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar veículos');
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.license_plate || !formData.qr_code) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (editingVehicle) {
      const { error } = await supabase
        .from('vehicles')
        .update(formData)
        .eq('id', editingVehicle.id);

      if (error) {
        toast.error('Erro ao atualizar veículo');
      } else {
        toast.success('Veículo atualizado com sucesso');
        setDialogOpen(false);
        fetchVehicles();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('vehicles')
        .insert([formData]);

      if (error) {
        toast.error('Erro ao adicionar veículo');
      } else {
        toast.success('Veículo adicionado com sucesso');
        setDialogOpen(false);
        fetchVehicles();
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', license_plate: '', qr_code: '' });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      license_plate: vehicle.license_plate,
      qr_code: vehicle.qr_code,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (vehicleId: string) => {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      toast.error('Erro ao eliminar veículo');
    } else {
      toast.success('Veículo eliminado com sucesso');
      fetchVehicles();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestão de Veículos</CardTitle>
            <CardDescription>Adicione e edite os veículos da frota</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Veículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? 'Editar Veículo' : 'Adicionar Novo Veículo'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do veículo
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Veículo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Carrinha Branca"
                  />
                </div>
                <div>
                  <Label htmlFor="license_plate">Matrícula</Label>
                  <Input
                    id="license_plate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                    placeholder="Ex: AB-12-CD"
                  />
                </div>
                <div>
                  <Label htmlFor="qr_code">Código QR</Label>
                  <Input
                    id="qr_code"
                    value={formData.qr_code}
                    onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                    placeholder="Ex: VEH001"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingVehicle ? 'Atualizar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">A carregar veículos...</div>
        ) : vehicles.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum veículo registado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Código QR</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{vehicle.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{vehicle.license_plate}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-2 py-1 text-sm">{vehicle.qr_code}</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser revertida. O veículo será eliminado permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default VehicleManagement;
