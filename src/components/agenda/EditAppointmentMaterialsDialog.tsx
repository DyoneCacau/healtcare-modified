import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { AppointmentMaterialsEditor } from '@/components/agenda/AppointmentMaterialsEditor';
import { AgendaAppointment } from '@/types/agenda';
import {
  useAppointmentMaterials,
  useProcedureMaterialMutations,
} from '@/hooks/useProcedureMaterials';
import { useInventoryProducts } from '@/hooks/useInventory';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { parseQuantityInput } from '@/lib/quantityInput';
import type { AppointmentMaterialUsageInput, ProcedureMaterialDraft } from '@/types/procedureMaterial';
import { toast } from 'sonner';

interface EditAppointmentMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment | null;
}

export function EditAppointmentMaterialsDialog({
  open,
  onOpenChange,
  appointment,
}: EditAppointmentMaterialsDialogProps) {
  const { isSuperAdmin } = useAuth();
  const { can } = usePermissions();
  const canOverrideStock = isSuperAdmin || can('estoque_liberar', 'can_edit');
  const { activeProducts } = useInventoryProducts();
  const { materials } = useAppointmentMaterials(appointment ? [appointment.id] : []);
  const { updateAppointmentMaterials } = useProcedureMaterialMutations();

  const [drafts, setDrafts] = useState<ProcedureMaterialDraft[]>([]);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    if (!open || !appointment) return;
    setOverrideEnabled(false);
    setOverrideReason('');
    setEditReason('');

    if (materials.length > 0) {
      setDrafts(
        materials.map((m) => {
          const product = activeProducts.find((p) => p.id === m.product_id);
          return {
            key: m.id,
            productId: m.product_id,
            productName: m.product_name,
            productUnit: m.product_unit || 'un',
            quantity: String(m.quantity).replace('.', ','),
            currentStock: Number(product?.current_stock) || 0,
            fromTemplate: false,
          };
        }),
      );
    } else {
      setDrafts([
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
    }
  }, [open, appointment, materials, activeProducts]);

  const handleSave = async () => {
    if (!appointment) return;
    if (!editReason.trim()) {
      toast.error('Informe o motivo da alteração (vai para a auditoria)');
      return;
    }

    const usage: AppointmentMaterialUsageInput[] = [];
    for (const draft of drafts) {
      if (!draft.productId && !draft.quantity.trim()) continue;
      if (!draft.productId) {
        toast.error('Selecione o material em todas as linhas preenchidas');
        return;
      }
      const qty = parseQuantityInput(draft.quantity);
      if (qty == null) {
        toast.error(`Quantidade inválida em ${draft.productName || 'material'}`);
        return;
      }
      // Na edição, o estoque já pode incluir o que será estornado; usamos saldo atual + qty antiga do mesmo produto
      const previousQty = materials
        .filter((m) => m.product_id === draft.productId)
        .reduce((sum, m) => sum + Number(m.quantity), 0);
      const effectiveStock = draft.currentStock + previousQty;
      const insufficient = qty > effectiveStock;
      if (insufficient && !(canOverrideStock && overrideEnabled)) {
        toast.error('Há material sem estoque suficiente. Libere com permissão ou ajuste a quantidade.');
        return;
      }
      usage.push({
        productId: draft.productId,
        productName: draft.productName,
        productUnit: draft.productUnit,
        quantity: qty,
        overridden: insufficient,
        overrideReason: insufficient ? (overrideReason.trim() || 'Liberado sem saldo') : undefined,
      });
    }

    await updateAppointmentMaterials.mutateAsync({
      appointmentId: appointment.id,
      patientName: appointment.patientName,
      procedureName: appointment.procedure,
      items: usage,
      reason: editReason.trim(),
    });
    onOpenChange(false);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar materiais do atendimento</DialogTitle>
          <DialogDescription>
            {appointment.patientName} — {appointment.procedure}. Alterações ajustam o estoque e ficam registradas na auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <AppointmentMaterialsEditor
            drafts={drafts}
            products={activeProducts.map((p) => ({
              id: p.id,
              name: p.name,
              unit: p.unit,
              current_stock: Number(p.current_stock) || 0,
            }))}
            canOverride={canOverrideStock}
            overrideEnabled={overrideEnabled}
            overrideReason={overrideReason}
            procedureLabel={appointment.procedure}
            onOverrideEnabledChange={setOverrideEnabled}
            onOverrideReasonChange={setOverrideReason}
            onChange={setDrafts}
          />

          <div className="space-y-2">
            <Label>Motivo da alteração (auditoria) *</Label>
            <Textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Ex.: profissional informou marca diferente / correção de quantidade em ml"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateAppointmentMaterials.isPending}>
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
