import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProcedureMaterialDraft } from '@/types/procedureMaterial';
import { formatQuantity, parseQuantityInput } from '@/lib/quantityInput';

interface ProductOption {
  id: string;
  name: string;
  unit: string | null;
  current_stock: number;
}

interface AppointmentMaterialsEditorProps {
  drafts: ProcedureMaterialDraft[];
  products: ProductOption[];
  canOverride: boolean;
  overrideEnabled: boolean;
  overrideReason: string;
  onOverrideEnabledChange: (value: boolean) => void;
  onOverrideReasonChange: (value: string) => void;
  onChange: (drafts: ProcedureMaterialDraft[]) => void;
}

export function AppointmentMaterialsEditor({
  drafts,
  products,
  canOverride,
  overrideEnabled,
  overrideReason,
  onOverrideEnabledChange,
  onOverrideReasonChange,
  onChange,
}: AppointmentMaterialsEditorProps) {
  const updateDraft = (key: string, patch: Partial<ProcedureMaterialDraft>) => {
    onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  const addLine = () => {
    onChange([
      ...drafts,
      {
        key: crypto.randomUUID(),
        productId: '',
        productName: '',
        productUnit: 'un',
        quantity: '',
        currentStock: 0,
        fromTemplate: false,
      },
    ]);
  };

  const removeLine = (key: string) => {
    onChange(drafts.filter((d) => d.key !== key));
  };

  const insufficient = drafts.filter((d) => {
    const qty = parseQuantityInput(d.quantity);
    return d.productId && qty != null && qty > d.currentStock;
  });

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-medium">Materiais utilizados</Label>
          <p className="text-xs text-muted-foreground">
            Digite a quantidade real (ex.: 0,2 ml). Pode incluir ou trocar itens.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Incluir
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum material sugerido. Inclua manualmente o que foi usado no procedimento.
        </p>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => {
            const qty = parseQuantityInput(draft.quantity);
            const over = qty != null && qty > draft.currentStock;
            return (
              <div key={draft.key} className="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-[1.4fr_0.7fr_auto]">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Material / marca</Label>
                  <Select
                    value={draft.productId || undefined}
                    onValueChange={(productId) => {
                      const product = products.find((p) => p.id === productId);
                      updateDraft(draft.key, {
                        productId,
                        productName: product?.name || '',
                        productUnit: product?.unit || 'un',
                        currentStock: Number(product?.current_stock) || 0,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o material" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({formatQuantity(Number(p.current_stock) || 0)} {p.unit || 'un'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Qtd ({draft.productUnit || 'un'})
                  </Label>
                  <Input
                    inputMode="decimal"
                    value={draft.quantity}
                    onChange={(e) => updateDraft(draft.key, { quantity: e.target.value })}
                    placeholder="Ex.: 0,2"
                    className={over ? 'border-amber-500' : undefined}
                  />
                  {draft.productId && (
                    <p className="text-[11px] text-muted-foreground">
                      Estoque: {formatQuantity(draft.currentStock)} {draft.productUnit || 'un'}
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(draft.key)}
                    aria-label="Remover material"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {insufficient.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Estoque insuficiente em {insufficient.length} item(ns)</p>
              <p className="text-xs">
                Se pegaram de outra unidade ou o produto ainda vai chegar, libere com permissão e informe o motivo.
              </p>
            </div>
          </div>
          {canOverride ? (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="override-stock"
                  checked={overrideEnabled}
                  onCheckedChange={(checked) => onOverrideEnabledChange(checked === true)}
                />
                <label htmlFor="override-stock" className="text-sm cursor-pointer">
                  Liberar mesmo assim
                </label>
              </div>
              {overrideEnabled && (
                <Textarea
                  value={overrideReason}
                  onChange={(e) => onOverrideReasonChange(e.target.value)}
                  placeholder="Motivo (ex.: emprestado da outra clínica / aguardando fornecedor)"
                  rows={2}
                />
              )}
            </>
          ) : (
            <p className="text-xs font-medium">
              Você não tem permissão para liberar. Peça ao administrador ou ajuste as quantidades.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
