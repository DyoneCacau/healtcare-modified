import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScheduleBlocks, useScheduleBlockMutations } from '@/hooks/useScheduleBlocks';
import {
  SCHEDULE_BLOCK_TYPES,
  SCHEDULE_BLOCK_TYPE_LABELS,
  type ScheduleBlock,
  type ScheduleBlockType,
} from '@/types/schedule';

interface ProfessionalOption {
  id: string;
  name: string;
}

interface ScheduleBlocksPanelProps {
  clinicId: string;
  professionals: ProfessionalOption[];
}

const emptyForm = {
  professionalId: 'all',
  blockDate: '',
  allDay: false,
  startTime: '08:00',
  endTime: '12:00',
  blockType: 'other' as ScheduleBlockType,
  reason: '',
};

export function ScheduleBlocksPanel({ clinicId, professionals }: ScheduleBlocksPanelProps) {
  const { blocks, isLoading } = useScheduleBlocks({
    clinicId,
    futureOnly: true,
    activeOnly: true,
  });
  const { createBlock, updateBlock, deactivateBlock, deleteBlock } =
    useScheduleBlockMutations();

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const professionalName = useMemo(() => {
    const map = new Map(professionals.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? map.get(id) || 'Profissional' : 'Toda a clínica');
  }, [professionals]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (block: ScheduleBlock) => {
    setEditingId(block.id);
    setForm({
      professionalId: block.professional_id || 'all',
      blockDate: block.block_date,
      allDay: block.all_day,
      startTime: block.start_time || '08:00',
      endTime: block.end_time || '12:00',
      blockType: block.block_type,
      reason: block.reason || '',
    });
  };

  const handleSubmit = async () => {
    const payload = {
      clinic_id: clinicId,
      professional_id: form.professionalId === 'all' ? null : form.professionalId,
      block_date: form.blockDate,
      all_day: form.allDay,
      start_time: form.allDay ? null : form.startTime,
      end_time: form.allDay ? null : form.endTime,
      block_type: form.blockType,
      reason: form.reason || null,
    };

    if (editingId) {
      await updateBlock.mutateAsync({ id: editingId, ...payload });
    } else {
      await createBlock.mutateAsync(payload);
    }
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-md border p-3">
        <h4 className="text-sm font-medium">
          {editingId ? 'Editar bloqueio' : 'Novo bloqueio'}
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Escopo</Label>
            <Select
              value={form.professionalId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, professionalId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toda a clínica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda a clínica</SelectItem>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Data</Label>
            <Input
              type="date"
              value={form.blockDate}
              onChange={(e) => setForm((prev) => ({ ...prev, blockDate: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={form.blockType}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, blockType: value as ScheduleBlockType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_BLOCK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {SCHEDULE_BLOCK_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 sm:col-span-2 rounded-md border px-3 py-2">
            <Label htmlFor="all-day">Dia inteiro</Label>
            <Switch
              id="all-day"
              checked={form.allDay}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, allDay: checked }))
              }
            />
          </div>

          {!form.allDay && (
            <>
              <div className="space-y-1">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </>
          )}

          <div className="space-y-1 sm:col-span-2">
            <Label>Motivo</Label>
            <Textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Feriado, folga, manutenção…"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              !form.blockDate ||
              createBlock.isPending ||
              updateBlock.isPending
            }
          >
            {editingId ? 'Salvar alterações' : 'Adicionar bloqueio'}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancelar edição
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Bloqueios futuros</h4>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && blocks.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum bloqueio futuro ativo.</p>
        )}
        {blocks.map((block) => (
          <div
            key={block.id}
            className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-sm space-y-1">
              <p className="font-medium">{professionalName(block.professional_id)}</p>
              <p className="text-muted-foreground">
                {format(parseISO(block.block_date), "dd/MM/yyyy", { locale: ptBR })}
                {' · '}
                {SCHEDULE_BLOCK_TYPE_LABELS[block.block_type]}
                {' · '}
                {block.all_day
                  ? 'Dia inteiro'
                  : `${block.start_time}–${block.end_time}`}
              </p>
              {block.reason && (
                <p className="text-xs text-muted-foreground">{block.reason}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => startEdit(block)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => deactivateBlock.mutate(block.id)}
                disabled={deactivateBlock.isPending}
              >
                Desativar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteBlock.mutate(block.id)}
                disabled={deleteBlock.isPending}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
