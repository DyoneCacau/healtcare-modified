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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyBRL } from '@/lib/currency';

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
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    if (maxCash > 0 && amount > maxCash) return;
    onConfirm(amount, notes.trim());
    setAmount(0);
    setNotes('');
    onOpenChange(false);
  };

  const isValid = amount > 0 && (maxCash <= 0 || amount <= maxCash);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Sangria / Recolhimento
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Registre o valor recolhido do caixa para guardar no cofre. O valor continua sendo da clínica, apenas sai do caixa.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="sangria-amount">Valor (R$)</Label>
            <CurrencyInput
              id="sangria-amount"
              value={amount}
              onValueChange={setAmount}
            />
            {maxCash > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Disponível em caixa: R$ {formatCurrencyBRL(maxCash)}
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
