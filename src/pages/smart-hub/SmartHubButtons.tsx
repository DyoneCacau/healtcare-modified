import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  SmartHubLayout,
  SmartHubImageUpload,
  ColorField,
} from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubButtons } from '@/hooks/useHubButtons';
import { useClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
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
  AssetService,
  buildDestinationUrl,
  validateSocialDomain,
} from '@/services/smartHub';
import {
  SMART_HUB_BUTTON_TYPE_LABELS,
  SMART_HUB_VARIANT_LABELS,
  SMART_HUB_CLICK_ACTION_LABELS,
  type SmartHubButton,
  type SmartHubButtonType,
  type SmartHubButtonVisualVariant,
  type SmartHubClickAction,
  type SmartHubButtonCaptureConfig,
} from '@/types/smartHub';
import { CRM_STAGES } from '@/types/crm';
import { useClinicStaffOptions } from '@/hooks/useClinicStaffOptions';
import { useSubscription } from '@/hooks/useSubscription';

const BUTTON_TYPES = Object.keys(SMART_HUB_BUTTON_TYPE_LABELS) as SmartHubButtonType[];
const VARIANT_KEYS = Object.keys(SMART_HUB_VARIANT_LABELS) as SmartHubButtonVisualVariant[];
const CLICK_ACTIONS = Object.keys(SMART_HUB_CLICK_ACTION_LABELS) as SmartHubClickAction[];

function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const clean = url.split('?')[0];
    const marker = '/smart-hub-assets/';
    const idx = clean.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(clean.slice(idx + marker.length));
  } catch {
    return null;
  }
}

const emptyForm = {
  title: '',
  subtitle: '',
  type: 'link' as SmartHubButtonType,
  url: '',
  whatsapp_message: '',
  visual_variant: 'simple' as SmartHubButtonVisualVariant,
  click_action: 'auto' as SmartHubClickAction,
  icon: '',
  image: '',
  image_alt: '',
  visible: true,
  order_index: 0,
  track_click: true,
  background_color: '',
  text_color: '',
  capture_interest: '',
  capture_stage: 'new' as string,
  capture_owner: '',
  capture_redirect_wa: false,
};

export default function SmartHubButtons() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const { hasFeature } = useSubscription();
  const hasCrm = hasFeature('crm');
  const { staff } = useClinicStaffOptions();
  const { hub, isLoading } = useSmartHub();
  const { buttons, isLoading: loadingButtons, createButton, updateButton, deleteButton } =
    useHubButtons(hub?.id);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmartHubButton | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    const cap = (btn.capture_config || {}) as SmartHubButtonCaptureConfig;
    setForm({
      title: btn.title,
      subtitle: btn.subtitle || '',
      type: btn.type,
      url: btn.url || '',
      whatsapp_message: btn.whatsapp_message || '',
      visual_variant: (btn.visual_variant as SmartHubButtonVisualVariant) || 'simple',
      click_action: (btn.click_action as SmartHubClickAction) || 'auto',
      icon: btn.icon || '',
      image: btn.image || '',
      image_alt: btn.image_alt || '',
      visible: btn.visible,
      order_index: btn.order_index,
      track_click: btn.track_click,
      background_color: btn.background_color || '',
      text_color: btn.text_color || '',
      capture_interest: cap.interest || '',
      capture_stage: cap.initial_stage || 'new',
      capture_owner: cap.owner_user_id || '',
      capture_redirect_wa: Boolean(cap.redirect_whatsapp_after_submit),
    });
    setOpen(true);
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      toast.error('Informe o título do botão.');
      return false;
    }

    const socialError = validateSocialDomain(form.type, form.url);
    if (socialError) {
      toast.error(socialError);
      return false;
    }

    if (form.type !== 'info' && form.url.trim()) {
      const href = buildDestinationUrl(form.type, form.url, form.whatsapp_message);
      if (!href) {
        toast.error('Informe um destino válido para o botão.');
        return false;
      }
    }

    if (
      ['whatsapp', 'phone', 'email', 'link', 'site', 'map', 'appointment', 'procedure'].includes(
        form.type
      ) &&
      !form.url.trim() &&
      form.type !== 'info'
    ) {
      // allow empty for some types but warn for conversion-critical ones
      if (['whatsapp', 'phone', 'email', 'link'].includes(form.type)) {
        toast.error('Informe a URL ou destino do botão.');
        return false;
      }
    }

    return true;
  };

  const save = async () => {
    if (!validateForm()) return;

    if (form.click_action === 'form' && !hasCrm) {
      toast.error('O formulário de captação exige o módulo CRM no plano.');
      return;
    }

    const capture_config: SmartHubButtonCaptureConfig = {
      interest: form.capture_interest || null,
      initial_stage: (form.capture_stage as SmartHubButtonCaptureConfig['initial_stage']) || 'new',
      owner_user_id: form.capture_owner || null,
      redirect_whatsapp_after_submit: form.capture_redirect_wa,
      use_hub_form: true,
    };

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      type: form.type,
      url: form.url || null,
      whatsapp_message:
        form.type === 'whatsapp' || form.click_action === 'whatsapp'
          ? form.whatsapp_message || null
          : null,
      visual_variant: form.visual_variant,
      click_action: form.click_action,
      capture_config,
      icon: form.icon || null,
      image: form.image || null,
      image_alt: form.image_alt || null,
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

  const handleButtonImageUpload = async (file: File) => {
    if (!clinicId || !hub?.id || !editing?.id) {
      toast.error('Salve o botão antes de enviar a imagem.');
      return;
    }
    setUploadingImage(true);
    try {
      const asset = await AssetService.upload(clinicId, hub.id, file, {
        userId: user?.id,
        kind: 'button',
        buttonId: editing.id,
        previousStoragePath: storagePathFromPublicUrl(form.image),
      });
      const url = asset.public_url || '';
      setForm((f) => ({ ...f, image: url }));
      await updateButton.mutateAsync({ id: editing.id, image: url || null });
      setEditing((prev) => (prev ? { ...prev, image: url || null } : prev));
      toast.success('Imagem enviada com sucesso.');
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Não foi possível enviar a imagem.';
      toast.error(message);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleButtonImageRemove = async () => {
    setForm((f) => ({ ...f, image: '' }));
    if (editing?.id) {
      await updateButton.mutateAsync({ id: editing.id, image: null });
      setEditing((prev) => (prev ? { ...prev, image: null } : prev));
    }
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
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {btn.image ? (
                  <img
                    src={btn.image}
                    alt={btn.image_alt || btn.title}
                    className="h-12 w-12 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium">{btn.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {SMART_HUB_BUTTON_TYPE_LABELS[btn.type] || btn.type}
                    {btn.url ? ` · ${btn.url}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">#{btn.order_index}</Badge>
                <Badge variant="secondary">
                  {SMART_HUB_VARIANT_LABELS[
                    btn.visual_variant as SmartHubButtonVisualVariant
                  ] || btn.visual_variant || 'Simples'}
                </Badge>
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
              <p className="font-medium text-foreground">Nenhum botão ainda</p>
              <p className="mt-1 text-sm">
                Crie o primeiro botão (WhatsApp, agendamento, redes sociais…) para ativar a
                conversão na página pública.
              </p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro botão
              </Button>
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
              <Label>Ação ao clicar</Label>
              <Select
                value={form.click_action}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, click_action: v as SmartHubClickAction }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLICK_ACTIONS.map((a) => (
                    <SelectItem
                      key={a}
                      value={a}
                      disabled={a === 'form' && !hasCrm}
                    >
                      {SMART_HUB_CLICK_ACTION_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.click_action === 'whatsapp' && (
                <p className="text-xs text-muted-foreground">
                  O clique abre o WhatsApp e é registrado no Analytics. Lead não é criado
                  automaticamente.
                </p>
              )}
            </div>
            {(form.click_action === 'form' || form.type === 'form') && hasCrm && (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-xs font-medium">Destino do formulário</p>
                <div className="space-y-2">
                  <Label>Serviço / interesse</Label>
                  <Input
                    value={form.capture_interest}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, capture_interest: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coluna inicial</Label>
                  <Select
                    value={form.capture_stage}
                    onValueChange={(v) => setForm((f) => ({ ...f, capture_stage: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select
                    value={form.capture_owner || '__none__'}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        capture_owner: v === '__none__' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Padrão do Hub" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Padrão do Hub</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label>WhatsApp após envio</Label>
                  <Switch
                    checked={form.capture_redirect_wa}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, capture_redirect_wa: v }))
                    }
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>URL / destino</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder={
                  form.type === 'whatsapp' || form.click_action === 'whatsapp'
                    ? '5511999999999'
                    : form.type === 'email'
                      ? 'contato@clinica.com'
                      : 'https://...'
                }
              />
            </div>
            {(form.type === 'whatsapp' || form.click_action === 'whatsapp') && (
              <div className="space-y-2">
                <Label>Mensagem pré-preenchida do WhatsApp</Label>
                <Input
                  value={form.whatsapp_message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, whatsapp_message: e.target.value }))
                  }
                  placeholder="Olá! Gostaria de agendar uma consulta."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Variante visual</Label>
              <Select
                value={form.visual_variant}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    visual_variant: v as SmartHubButtonVisualVariant,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_KEYS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {SMART_HUB_VARIANT_LABELS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ícone (nome opcional)</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="message-circle, calendar, phone…"
              />
            </div>

            {editing?.id ? (
              <div className="space-y-2">
                <Label>Imagem do botão</Label>
                {clinicId && hub && (
                  <SmartHubImageUpload
                    kind="button"
                    currentUrl={form.image || null}
                    clinicId={clinicId}
                    hubId={hub.id}
                    disabled={uploadingImage || updateButton.isPending}
                    onUpload={handleButtonImageUpload}
                    onRemove={handleButtonImageRemove}
                  />
                )}
                <div className="space-y-2">
                  <Label>Texto alternativo da imagem</Label>
                  <Input
                    value={form.image_alt}
                    onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>URL da imagem (opcional)</Label>
                <Input
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  placeholder="https://… ou envie após salvar"
                />
                <p className="text-xs text-muted-foreground">
                  Após criar o botão, edite-o para enviar uma imagem pelo upload.
                </p>
                <div className="space-y-2">
                  <Label>Texto alternativo da imagem</Label>
                  <Input
                    value={form.image_alt}
                    onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
                  />
                </div>
              </div>
            )}

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
              <ColorField
                id="btn_bg"
                label="Cor de fundo"
                value={form.background_color || '#0F766E'}
                fallback="#0F766E"
                onChange={(v) => setForm((f) => ({ ...f, background_color: v }))}
              />
              <ColorField
                id="btn_text"
                label="Cor do texto"
                value={form.text_color || '#FFFFFF'}
                fallback="#FFFFFF"
                contrastAgainst={form.background_color || '#0F766E'}
                onChange={(v) => setForm((f) => ({ ...f, text_color: v }))}
              />
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
