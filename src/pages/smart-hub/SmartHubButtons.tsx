import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubButtons } from '@/hooks/useHubButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SMART_HUB_BUTTON_TYPE_LABELS,
  type SmartHubButton,
  type SmartHubButtonType,
} from '@/types/smartHub';

const BUTTON_TYPES = Object.keys(SMART_HUB_BUTTON_TYPE_LABELS) as SmartHubButtonType[];

const emptyForm = {
  title: '',
  subtitle: '',
  type: 'link' as SmartHubButtonType,
  url: '',
  visible: true,
  order_index: 0,
  track_click: true,
  background_color: '',
  text_color: '',
};

export default function SmartHubButtons() {
  const { hub, isLoading } = useSmartHub();
  const { buttons, isLoading: loadingButtons, createButton, updateButton, deleteButton } =
    useHubButtons(hub?.id);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmartHubButton | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      order_index: buttons.length,
    });
    setOpen(true);
  };

  const openEdit = (btn: SmartHubButton) => {
    setEditing(btn);
    setForm({
      title: btn.title,
      subtitle: btn.subtitle || '',
      type: btn.type,
      url: btn.url || '',
      visible: btn.visible,
      order_index: btn.order_index,
      track_click: btn.track_click,
      background_color: btn.background_color || '',
      text_color: btn.text_color || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      type: form.type,
      url: form.url || null,
      visible: form.visible,
      order_index: Number(form.order_index) || 0,
      track_click: form.track_click,
      background_color: form.background_color || null,
      text_color: form.text_color || null,
      status: 'active' as const,
    };

    if (editing) {
      await updateButton.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createButton.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <SmartHubLayout
      title="Botões"
      description="Gerencie os botões de conversão da página pública."
      actions={
        hub ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo botão
          </Button>
        ) : undefined
      }
    >
      {isLoading || loadingButtons ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !hub ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Crie um Smart Hub no Dashboard para gerenciar botões.
        </div>
      ) : (
        <div className="space-y-3">
          {buttons.map((btn) => (
            <div
              key={btn.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{btn.title}</p>
                <p className="text-sm text-muted-foreground">
                  {SMART_HUB_BUTTON_TYPE_LABELS[btn.type] || btn.type}
                  {btn.url ? ` · ${btn.url}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{btn.order_index}</Badge>
                <Badge variant={btn.visible ? 'default' : 'secondary'}>
                  {btn.visible ? 'Visível' : 'Oculto'}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => openEdit(btn)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm('Remover este botão?')) deleteButton.mutate(btn.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {!buttons.length && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum botão cadastrado. Crie o primeiro para habilitar a publicação.
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar botão' : 'Novo botão'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as SmartHubButtonType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUTTON_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SMART_HUB_BUTTON_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL / destino</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.order_index}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, order_index: Number(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-6">
                <Label htmlFor="visible">Visível</Label>
                <Switch
                  id="visible"
                  checked={form.visible}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="track">Rastrear cliques</Label>
              <Switch
                id="track"
                checked={form.track_click}
                onCheckedChange={(v) => setForm((f) => ({ ...f, track_click: v }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cor de fundo</Label>
                <Input
                  type="color"
                  value={form.background_color || '#0F766E'}
                  onChange={(e) => setForm((f) => ({ ...f, background_color: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor do texto</Label>
                <Input
                  type="color"
                  value={form.text_color || '#ffffff'}
                  onChange={(e) => setForm((f) => ({ ...f, text_color: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.title.trim() || createButton.isPending || updateButton.isPending}
              onClick={save}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SmartHubLayout>
  );
}
