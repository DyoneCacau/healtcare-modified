import { useState } from 'react';
import { Wallet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const CATEGORY_SANGRIA = 'Sangria / Recolhimento para cofre';

interface SangriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number, notes: string) => void;
  maxCash?: number;
}

export function SangriaDialog({
  open,
  onOpenChange,
  onConfirm,
  maxCash = 0,
}: SangriaDialogProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(/,/g, '.').replace(/\s/g, ''));
    if (isNaN(value) || value <= 0) return;
    if (maxCash > 0 && value > maxCash) return;
    onConfirm(value, notes.trim());
    setAmount('');
    setNotes('');
    onOpenChange(false);
  };

  const numAmount = parseFloat(amount.replace(/,/g, '.').replace(/\s/g, '')) || 0;
  const isValid = numAmount > 0 && (maxCash <= 0 || numAmount <= maxCash);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600" />
            Sangria / Recolhimento para cofre
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Registre o valor recolhido do caixa para guardar no cofre. O valor continua sendo da clínica, apenas sai do caixa.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sangria-amount">Valor (R$)</Label>
            <Input
              id="sangria-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
            />
            {maxCash > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Disponível em caixa: R$ {maxCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="sangria-notes">Observação (opcional)</Label>
            <Textarea
              id="sangria-notes"
              placeholder="Ex: Recolhimento para cofre, fim do turno..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid}>
              Registrar sangria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { CATEGORY_SANGRIA };
