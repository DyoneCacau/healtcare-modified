import { Package } from 'lucide-react';
import { useProcedureMaterials } from '@/hooks/useProcedureMaterials';
import { formatQuantity } from '@/lib/quantityInput';

interface ProcedureMaterialsPreviewProps {
  procedureId?: string | null;
  procedureName?: string;
}

/** Prévia somente leitura dos materiais sugeridos do procedimento (confirmação na finalização). */
export function ProcedureMaterialsPreview({
  procedureId,
  procedureName,
}: ProcedureMaterialsPreviewProps) {
  const { materials, isLoading } = useProcedureMaterials(procedureId);

  if (!procedureId) return null;

  if (isLoading) {
    return (
      <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
        Carregando materiais sugeridos…
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5 font-medium text-foreground/80">
          <Package className="h-3.5 w-3.5" />
          Materiais
        </p>
        <p className="mt-1">
          Este procedimento ainda não tem composição cadastrada. Na finalização será possível
          informar os materiais usados{procedureName ? ` em “${procedureName}”` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1.5">
      <p className="flex items-center gap-1.5 font-medium">
        <Package className="h-3.5 w-3.5 text-primary" />
        Prévia dos materiais (confirmados na finalização)
      </p>
      <ul className="space-y-0.5 text-muted-foreground">
        {materials.map((m) => (
          <li key={m.id}>
            {m.product_name || 'Material'}: {formatQuantity(m.default_quantity)} {m.product_unit || 'un'}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground pt-0.5">
        A recepção pode alterar quantidade e itens ao finalizar o atendimento.
      </p>
    </div>
  );
}
