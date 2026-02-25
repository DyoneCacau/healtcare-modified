import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgendaAppointment } from '@/types/agenda';
import { PaymentMethod } from '@/types/financial';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credit', label: 'Cartão Crédito' },
  { value: 'debit', label: 'Cartão Débito' },
];

interface NoShowFeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment | null;
  onConfirm: (appointment: AgendaAppointment, paymentMethod: PaymentMethod) => void;
}

export function NoShowFeeDialog({
  open,
  onOpenChange,
  appointment,
  onConfirm,
}: NoShowFeeDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  const handleConfirm = () => {
    if (appointment) {
      onConfirm(appointment, paymentMethod);
      onOpenChange(false);
    }
  };

  if (!appointment) return null;

  const fee = appointment.bookingFee ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Taxa de agendamento</DialogTitle>
          <DialogDescription>
            Como o paciente pagou os R$ {fee.toFixed(2)} da taxa de agendamento?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          <Label>Forma de pagamento</Label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar e registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
