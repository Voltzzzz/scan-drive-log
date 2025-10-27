import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  name: string;
  license_plate: string;
  qr_code: string;
}

interface VehicleQRCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VehicleQRCodesDialog = ({ open, onOpenChange }: VehicleQRCodesDialogProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Failed to load vehicles');
    } else if (data) {
      setVehicles(data);
    }
    setLoading(false);
  };

  const getQRCodeURL = (qrCode: string) => {
    return `${window.location.origin}/?vehicle=${qrCode}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vehicle QR Codes</DialogTitle>
          <DialogDescription>
            Scan these QR codes to quickly start trips for each vehicle
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button onClick={handlePrint} variant="outline" className="w-full print:hidden">
            Print All QR Codes
          </Button>

          {loading ? (
            <div className="text-center text-muted-foreground">Loading vehicles...</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id} className="break-inside-avoid">
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="rounded-lg bg-white p-4">
                      <QRCodeSVG
                        value={getQRCodeURL(vehicle.qr_code)}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Code: {vehicle.qr_code}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleQRCodesDialog;
