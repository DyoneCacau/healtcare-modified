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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TimeClockCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (correction: {
    date: string;
    entryType: string;
    time: string;
    reason: string;
  }) => void;
}

const ENTRY_TYPES = [
  { value: 'clock_in', label: 'Entrada' },
  { value: 'clock_out', label: 'Saída' },
  { value: 'lunch_start', label: 'Início do Intervalo' },
  { value: 'lunch_end', label: 'Fim do Intervalo' },
];

export function TimeClockCorrectionDialog({
  open,
  onOpenChange,
  onSubmit,
}: TimeClockCorrectionDialogProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryType, setEntryType] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !entryType || !time || !reason) {
      return;
    }

    onSubmit({ date, entryType, time, reason });
    
    setDate(new Date().toISOString().split('T')[0]);
    setEntryType('');
    setTime('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Correção de Ponto
          </DialogTitle>
          <DialogDescription>
            Solicite correção de um registro de ponto esquecido ou incorreto
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Esta solicitação ficará pendente até aprovação do administrador.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryType">Tipo de Registro *</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Correção *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique o motivo da correção (ex: esqueci de registrar entrada)"
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!date || !entryType || !time || !reason}>
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
