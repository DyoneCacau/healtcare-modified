import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  SmartHubLayout,
  SmartHubImageUpload,
  ColorField,
  FieldHelpLabel,
  FieldHint,
  TipCallout,
  FormSection,
  ButtonEditorPreview,
  ContrastPairAlert,
} from '@/components/smart-hub';
import {
  BUTTON_FIELD_HELP,
  CLICK_ACTION_HELP,
  VARIANT_HELP,
  formFlowSteps,
} from '@/components/smart-hub/buttonEditorCopy';
import {
  TYPE_ACTION_BRIDGE_HINT,
  getCompatibleActions,
  getRecommendedAction,
  isActionCompatible,
} from '@/components/smart-hub/buttonTypeActionMap';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubButtons } from '@/hooks/useHubButtons';
import { useClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AssetService,
  buildDestinationUrl,
  resolveClickAction,
  validateSocialDomain,
  buildButtonCaptureConfig,
  resolveCaptureConfig,
  assertValidOwnerInput,
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
import { cn } from '@/lib/utils';

const BUTTON_TYPES = Object.keys(SMART_HUB_BUTTON_TYPE_LABELS) as SmartHubButtonType[];
const VARIANT_KEYS = Object.keys(SMART_HUB_VARIANT_LABELS) as SmartHubButtonVisualVariant[];

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
  click_action: 'link' as SmartHubClickAction,
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
  capture_wa_phone: '',
  capture_wa_message: '',
  capture_use_hub_defaults: true,
  open_in_new_tab: true,
  email_subject: '',
};

type FormState = typeof emptyForm;

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editing, setEditing] = useState<SmartHubButton | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  /** Usuário alterou a ação manualmente — não sobrescrever ao mudar o tipo. */
  const [actionManuallySet, setActionManuallySet] = useState(false);
  /** Libera todas as ações (combinações avançadas). */
  const [customActions, setCustomActions] = useState(false);

  const effectiveAction = resolveClickAction(form.click_action, form.type);
  const availableActions = useMemo(() => {
    const list = getCompatibleActions(form.type, customActions);
    return hasCrm ? list : list.filter((a) => a !== 'form');
  }, [form.type, customActions, hasCrm]);
  const actionIsSuggested =
    !actionManuallySet &&
    !customActions &&
    form.click_action === getRecommendedAction(form.type);
  const actionHelp = CLICK_ACTION_HELP[effectiveAction] || CLICK_ACTION_HELP.auto;
  const variantHelp = VARIANT_HELP[form.visual_variant] || VARIANT_HELP.simple;
  const isFormAction = effectiveAction === 'form' && hasCrm;
  const isWhatsApp = effectiveAction === 'whatsapp';
  const isLink = effectiveAction === 'link';
  const isPhone = effectiveAction === 'phone';
  const isEmail = effectiveAction === 'email';
  const isMap = effectiveAction === 'map';
  const isInfo = effectiveAction === 'info';
  const showFallbackDestination =
    !isFormAction && !isWhatsApp && !isLink && !isPhone && !isEmail && !isMap && !isInfo;

  const hubResolvedCapture = useMemo(
    () =>
      resolveCaptureConfig(hub?.capture_config, {
        use_hub_defaults: form.capture_use_hub_defaults,
        interest: form.capture_interest || null,
        initial_stage: form.capture_stage as SmartHubButtonCaptureConfig['initial_stage'],
        owner_user_id: form.capture_owner || null,
        redirect_whatsapp_after_submit: form.capture_redirect_wa,
        whatsapp_phone: form.capture_wa_phone || null,
        whatsapp_message: form.capture_wa_message || null,
      }),
    [
      hub?.capture_config,
      form.capture_use_hub_defaults,
      form.capture_interest,
      form.capture_stage,
      form.capture_owner,
      form.capture_redirect_wa,
      form.capture_wa_phone,
      form.capture_wa_message,
    ]
  );

  const ownerLabel = useMemo(() => {
    if (!hubResolvedCapture.owner_user_id) return 'Sem responsável';
    return staff.find((s) => s.id === hubResolvedCapture.owner_user_id)?.name || 'Responsável definido';
  }, [hubResolvedCapture.owner_user_id, staff]);

  const stageLabel =
    CRM_STAGES.find((s) => s.id === hubResolvedCapture.initial_stage)?.label ||
    hubResolvedCapture.initial_stage;

  const openCreate = () => {
    setEditing(null);
    setActionManuallySet(false);
    setCustomActions(false);
    setForm({
      ...emptyForm,
      order_index: buttons.length,
      type: 'link',
      click_action: getRecommendedAction('link'),
    });
    setPreviewOpen(false);
    setSummaryOpen(false);
    setOpen(true);
  };

  const openEdit = (btn: SmartHubButton) => {
    setEditing(btn);
    const cap = (btn.capture_config || {}) as SmartHubButtonCaptureConfig;
    const rawAction = (btn.click_action as SmartHubClickAction) || 'auto';
    const type = btn.type as SmartHubButtonType;
    const concrete =
      rawAction === 'auto' ? getRecommendedAction(type) : rawAction;
    const unlocked =
      rawAction !== 'auto' && !isActionCompatible(type, concrete);
    setCustomActions(unlocked);
    setActionManuallySet(
      rawAction !== 'auto' && concrete !== getRecommendedAction(type)
    );
    setForm({
      title: btn.title,
      subtitle: btn.subtitle || '',
      type,
      url: btn.url || '',
      whatsapp_message: btn.whatsapp_message || '',
      visual_variant: (btn.visual_variant as SmartHubButtonVisualVariant) || 'simple',
      click_action: concrete,
      icon: btn.icon || '',
      image: btn.image || '',
      image_alt: btn.image_alt || '',
      visible: btn.visible,
      order_index: btn.order_index,
      track_click: btn.track_click,
      background_color: btn.background_color || '',
      text_color: btn.text_color || '',
      capture_interest: cap.interest || '',
      capture_stage: cap.initial_stage || hub?.capture_config?.initial_stage || 'new',
      capture_owner: cap.owner_user_id || '',
      capture_redirect_wa: Boolean(
        cap.redirect_whatsapp_after_submit ?? hub?.capture_config?.redirect_whatsapp_after_submit
      ),
      capture_wa_phone: cap.whatsapp_phone || hub?.capture_config?.whatsapp_phone || '',
      capture_wa_message:
        cap.whatsapp_message ||
        hub?.capture_config?.whatsapp_followup_message ||
        hub?.capture_config?.whatsapp_message ||
        '',
      capture_use_hub_defaults: resolveCaptureConfig(hub?.capture_config, cap).using_hub_defaults,
      open_in_new_tab: cap.open_in_new_tab !== false,
      email_subject: cap.email_subject || '',
    });
    setPreviewOpen(false);
    setSummaryOpen(false);
    setOpen(true);
  };

  const handleDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setPreviewOpen(false);
      setSummaryOpen(false);
    }
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      toast.error('Informe o título do botão.');
      return false;
    }

    if (isFormAction) {
      if (
        !form.capture_use_hub_defaults &&
        form.capture_redirect_wa &&
        !form.capture_wa_phone.trim() &&
        !hub?.whatsapp_number
      ) {
        toast.error('Informe o telefone do WhatsApp após o envio.');
        return false;
      }
      return true;
    }

    if (isInfo) return true;

    const destinationValue = form.url.trim();
    if (isWhatsApp || isPhone || isEmail || isLink || isMap) {
      if (!destinationValue) {
        toast.error(
          isWhatsApp || isPhone
            ? 'Informe o telefone.'
            : isEmail
              ? 'Informe o e-mail.'
              : isMap
                ? 'Informe a URL do mapa ou o endereço.'
                : 'Informe a URL.'
        );
        return false;
      }
    }

    const typeForUrl =
      isWhatsApp ? 'whatsapp' : isPhone ? 'phone' : isEmail ? 'email' : isMap ? 'map' : form.type;
    const socialError = validateSocialDomain(typeForUrl, form.url);
    if (socialError) {
      toast.error(socialError);
      return false;
    }

    if (destinationValue) {
      const href = buildDestinationUrl(
        typeForUrl,
        form.url,
        form.whatsapp_message,
        form.email_subject
      );
      if (!href) {
        toast.error('Informe um destino válido para o botão.');
        return false;
      }
    }

    if (
      ['whatsapp', 'phone', 'email', 'link'].includes(form.type) &&
      form.click_action === 'auto' &&
      !form.url.trim()
    ) {
      toast.error('Informe a URL ou destino do botão.');
      return false;
    }

    return true;
  };

  const save = async () => {
    if (!validateForm()) return;

    if (effectiveAction === 'form' && !hasCrm) {
      toast.error('O formulário de captação exige o módulo CRM no plano.');
      return;
    }

    const ownerCheck = assertValidOwnerInput(
      form.capture_use_hub_defaults ? null : form.capture_owner
    );
    if (ownerCheck.ok === false) {
      toast.error(ownerCheck.message);
      return;
    }
    const ownerId = ownerCheck.owner;

    const capture_config = buildButtonCaptureConfig({
      interest: isFormAction ? form.capture_interest || null : null,
      useHubDefaults: isFormAction ? form.capture_use_hub_defaults : true,
      initial_stage: form.capture_stage,
      owner_user_id: ownerId,
      redirect_whatsapp_after_submit: form.capture_redirect_wa,
      whatsapp_phone: isFormAction
        ? form.capture_wa_phone || null
        : isWhatsApp
          ? form.url || null
          : null,
      whatsapp_message: isFormAction
        ? form.capture_wa_message || null
        : isWhatsApp
          ? form.whatsapp_message || null
          : null,
      open_in_new_tab: isWhatsApp || isLink ? form.open_in_new_tab : undefined,
      email_subject: isEmail ? form.email_subject || null : null,
      use_hub_form: isFormAction,
    });

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle || null,
      type: form.type,
      url: isFormAction ? null : form.url || null,
      whatsapp_message: isWhatsApp ? form.whatsapp_message || null : null,
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
    setPreviewOpen(false);
    setSummaryOpen(false);
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

  const fixContrast = (nextTextColor: string) => {
    setForm((f) => ({ ...f, text_color: nextTextColor }));
    toast.message('Contraste ajustado', {
      description: 'A cor do texto foi atualizada para melhorar a leitura. Salve para aplicar.',
    });
  };

  const previewModel = {
    title: form.title,
    subtitle: form.subtitle,
    type: form.type,
    click_action: form.click_action,
    visual_variant: form.visual_variant,
    url: form.url,
    whatsapp_message: isFormAction ? form.capture_wa_message : form.whatsapp_message,
    icon: form.icon,
    image: form.image,
    image_alt: form.image_alt,
    background_color: form.background_color || '#0F766E',
    text_color: form.text_color || '#FFFFFF',
    redirect_whatsapp: isFormAction && hubResolvedCapture.redirect_whatsapp_after_submit,
    email_subject: form.email_subject,
    open_in_new_tab: form.open_in_new_tab,
  };

  const destinationSummary = (() => {
    if (isFormAction) {
      return form.capture_redirect_wa
        ? form.capture_wa_phone || hub?.whatsapp_number || 'WhatsApp da clínica'
        : 'Formulário → CRM';
    }
    if (isWhatsApp || isPhone) return form.url || '—';
    if (isEmail) return form.url || '—';
    if (isInfo) return 'Exibição na página';
    return form.url || '—';
  })();

  const formFields = (
    <div className="space-y-5 pb-2">
      <FormSection
        title="Informações do botão"
        description="O que o visitante vê e o que acontece ao tocar."
      >
        <div className="space-y-2">
          <FieldHelpLabel htmlFor="btn-title" label="Título" help={BUTTON_FIELD_HELP.title} />
          <Input
            id="btn-title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex.: Agendar consulta"
          />
        </div>

        {!isInfo ? (
          <div className="space-y-2">
            <FieldHelpLabel
              htmlFor="btn-subtitle"
              label="Subtítulo"
              help={BUTTON_FIELD_HELP.subtitle}
            />
            <Input
              id="btn-subtitle"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Ex.: Resposta em poucos minutos"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <FieldHelpLabel label="Tipo" help={BUTTON_FIELD_HELP.type_tooltip} />
          <Select
            value={form.type}
            onValueChange={(v) => {
              const nextType = v as SmartHubButtonType;
              const keepAction =
                customActions ||
                (actionManuallySet && isActionCompatible(nextType, form.click_action));
              const nextAction = keepAction
                ? form.click_action
                : getRecommendedAction(nextType);
              if (!keepAction && actionManuallySet) {
                setActionManuallySet(false);
              }
              setForm((f) => ({ ...f, type: nextType, click_action: nextAction }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {BUTTON_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {SMART_HUB_BUTTON_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>{BUTTON_FIELD_HELP.type}</FieldHint>
          {form.type === 'internal' ? (
            <FieldHint>{BUTTON_FIELD_HELP.type_internal}</FieldHint>
          ) : null}
        </div>

        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {TYPE_ACTION_BRIDGE_HINT}
        </p>

        <div className="space-y-2">
          <FieldHelpLabel label="Ação ao clicar" help={BUTTON_FIELD_HELP.click_action} />
          <Select
            value={
              availableActions.includes(form.click_action)
                ? form.click_action
                : availableActions[0] || form.click_action
            }
            onValueChange={(v) => {
              setActionManuallySet(true);
              setForm((f) => ({ ...f, click_action: v as SmartHubClickAction }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {availableActions.map((a) => (
                <SelectItem key={a} value={a} disabled={a === 'form' && !hasCrm}>
                  {SMART_HUB_CLICK_ACTION_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actionIsSuggested ? (
            <FieldHint>{BUTTON_FIELD_HELP.action_suggested}</FieldHint>
          ) : (
            <FieldHint>{actionHelp.description}</FieldHint>
          )}
          <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">Configuração personalizada</p>
              <p className="text-xs text-muted-foreground">{BUTTON_FIELD_HELP.action_custom}</p>
            </div>
            <Switch
              checked={customActions}
              onCheckedChange={(v) => {
                setCustomActions(v);
                if (!v && !isActionCompatible(form.type, form.click_action)) {
                  setActionManuallySet(false);
                  setForm((f) => ({
                    ...f,
                    click_action: getRecommendedAction(f.type),
                  }));
                }
              }}
            />
          </div>
          {actionHelp.badge && !customActions ? (
            <TipCallout badge={actionHelp.badge}>
              {effectiveAction === 'form'
                ? 'Use quando quiser captar nome e telefone no CRM.'
                : effectiveAction === 'whatsapp'
                  ? 'Melhor opção para resposta imediata da clínica.'
                  : actionHelp.description}
            </TipCallout>
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="Destino e comportamento"
        description="Campos conforme a ação escolhida."
      >
        {isFormAction ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldHelpLabel
                htmlFor="capture-interest"
                label="Serviço ou interesse"
                help={BUTTON_FIELD_HELP.capture_interest}
              />
              <Input
                id="capture-interest"
                value={form.capture_interest}
                onChange={(e) => setForm((f) => ({ ...f, capture_interest: e.target.value }))}
                placeholder="Ex.: Clareamento, Ortodontia…"
              />
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Usar configuração padrão do Hub</p>
                <p className="text-xs text-muted-foreground">
                  Etapa, responsável e WhatsApp vêm de Configurações → Formulário e CRM.
                </p>
              </div>
              <Switch
                checked={form.capture_use_hub_defaults}
                onCheckedChange={(v) => setForm((f) => ({ ...f, capture_use_hub_defaults: v }))}
              />
            </div>

            <div className="rounded-md border bg-muted/30 px-3 py-3 text-xs leading-relaxed">
              <p className="font-medium text-foreground">Este formulário enviará o contato para:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>Etapa: {stageLabel}</li>
                <li>Responsável: {ownerLabel}</li>
                <li>
                  Após o envio:{' '}
                  {hubResolvedCapture.redirect_whatsapp_after_submit
                    ? 'Abrir WhatsApp'
                    : 'Sem redirecionamento'}
                </li>
              </ul>
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-muted-foreground">
                {formFlowSteps(hubResolvedCapture.redirect_whatsapp_after_submit).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-md border px-3 py-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-sm font-medium"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    capture_use_hub_defaults: false,
                  }))
                }
              >
                Personalizar somente este botão
                <Switch
                  checked={!form.capture_use_hub_defaults}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, capture_use_hub_defaults: !v }))
                  }
                />
              </button>
              {!form.capture_use_hub_defaults ? (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <FieldHelpLabel
                      label="Etapa inicial no CRM"
                      help={BUTTON_FIELD_HELP.capture_stage}
                    />
                    <Select
                      value={form.capture_stage}
                      onValueChange={(v) => setForm((f) => ({ ...f, capture_stage: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {CRM_STAGES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldHelpLabel
                      label="Quem receberá este lead"
                      help={BUTTON_FIELD_HELP.capture_owner}
                    />
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
                        <SelectValue placeholder="Sem responsável" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="__none__">Sem responsável</SelectItem>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <FieldHelpLabel
                      label="Abrir WhatsApp depois do formulário"
                      help={BUTTON_FIELD_HELP.capture_redirect_wa}
                    />
                    <Switch
                      checked={form.capture_redirect_wa}
                      onCheckedChange={(v) =>
                        setForm((f) => ({ ...f, capture_redirect_wa: v }))
                      }
                    />
                  </div>
                  {form.capture_redirect_wa ? (
                    <>
                      <div className="space-y-2">
                        <FieldHelpLabel
                          htmlFor="capture-wa-phone"
                          label="Telefone do WhatsApp após envio"
                          help={BUTTON_FIELD_HELP.capture_wa_phone}
                        />
                        <Input
                          id="capture-wa-phone"
                          value={form.capture_wa_phone}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, capture_wa_phone: e.target.value }))
                          }
                          placeholder={hub?.whatsapp_number || '5511999999999'}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldHelpLabel
                          htmlFor="capture-wa-msg"
                          label="Mensagem após envio"
                          help={BUTTON_FIELD_HELP.capture_wa_message}
                        />
                        <Input
                          id="capture-wa-msg"
                          value={form.capture_wa_message}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, capture_wa_message: e.target.value }))
                          }
                          placeholder="Olá! Acabei de enviar o formulário pelo site."
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {isWhatsApp ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldHelpLabel htmlFor="btn-phone" label="Telefone" help={BUTTON_FIELD_HELP.phone} />
              <Input
                id="btn-phone"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="5511999999999"
              />
            </div>
            <div className="space-y-2">
              <FieldHelpLabel
                htmlFor="wa-msg"
                label="Mensagem inicial"
                help={BUTTON_FIELD_HELP.whatsapp_message}
              />
              <Input
                id="wa-msg"
                value={form.whatsapp_message}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp_message: e.target.value }))}
                placeholder="Olá! Gostaria de agendar uma consulta."
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <FieldHelpLabel
                label="Abrir em nova aba"
                help={BUTTON_FIELD_HELP.open_in_new_tab}
              />
              <Switch
                checked={form.open_in_new_tab}
                onCheckedChange={(v) => setForm((f) => ({ ...f, open_in_new_tab: v }))}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <FieldHelpLabel label="Rastrear cliques" help={BUTTON_FIELD_HELP.track_click} />
              <Switch
                checked={form.track_click}
                onCheckedChange={(v) => setForm((f) => ({ ...f, track_click: v }))}
              />
            </div>
          </div>
        ) : null}

        {isLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldHelpLabel htmlFor="btn-url" label="URL" help={BUTTON_FIELD_HELP.url} />
              <Input
                id="btn-url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <FieldHelpLabel
                label="Abrir em nova aba"
                help={BUTTON_FIELD_HELP.open_in_new_tab}
              />
              <Switch
                checked={form.open_in_new_tab}
                onCheckedChange={(v) => setForm((f) => ({ ...f, open_in_new_tab: v }))}
              />
            </div>
          </div>
        ) : null}

        {isPhone ? (
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="btn-tel" label="Telefone" help={BUTTON_FIELD_HELP.phone} />
            <Input
              id="btn-tel"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="5511999999999"
            />
          </div>
        ) : null}

        {isEmail ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldHelpLabel htmlFor="btn-email" label="E-mail" help={BUTTON_FIELD_HELP.email} />
              <Input
                id="btn-email"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="contato@clinica.com"
              />
            </div>
            <div className="space-y-2">
              <FieldHelpLabel
                htmlFor="email-subject"
                label="Assunto (opcional)"
                help={BUTTON_FIELD_HELP.email_subject}
              />
              <Input
                id="email-subject"
                value={form.email_subject}
                onChange={(e) => setForm((f) => ({ ...f, email_subject: e.target.value }))}
                placeholder="Agendamento pelo site"
              />
            </div>
          </div>
        ) : null}

        {isMap ? (
          <div className="space-y-2">
            <FieldHelpLabel
              htmlFor="btn-map"
              label="URL do mapa ou endereço"
              help={BUTTON_FIELD_HELP.map_url}
            />
            <Input
              id="btn-map"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://maps.google.com/… ou Rua Exemplo, 123"
            />
          </div>
        ) : null}

        {isInfo ? (
          <div className="space-y-2">
            <FieldHelpLabel
              htmlFor="info-content"
              label="Conteúdo informativo"
              help={BUTTON_FIELD_HELP.info_content}
            />
            <Textarea
              id="info-content"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Horário de atendimento, formas de pagamento…"
              rows={4}
            />
          </div>
        ) : null}

        {showFallbackDestination ? (
          <div className="space-y-2">
            <FieldHelpLabel htmlFor="btn-url-auto" label="URL / destino" help={BUTTON_FIELD_HELP.url} />
            <Input
              id="btn-url-auto"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        ) : null}

        {!isWhatsApp ? (
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldHelpLabel
                htmlFor="btn-order"
                label="Ordem"
                help={BUTTON_FIELD_HELP.order_index}
              />
              <Input
                id="btn-order"
                type="number"
                value={form.order_index}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order_index: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2 sm:pt-6">
              <FieldHelpLabel label="Visível" help={BUTTON_FIELD_HELP.visible} />
              <Switch
                checked={form.visible}
                onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))}
              />
            </div>
            {!isWhatsApp ? (
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <FieldHelpLabel label="Rastrear cliques" help={BUTTON_FIELD_HELP.track_click} />
                <Switch
                  checked={form.track_click}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, track_click: v }))}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldHelpLabel
                htmlFor="btn-order-wa"
                label="Ordem"
                help={BUTTON_FIELD_HELP.order_index}
              />
              <Input
                id="btn-order-wa"
                type="number"
                value={form.order_index}
                onChange={(e) =>
                  setForm((f) => ({ ...f, order_index: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-2 sm:pt-6">
              <FieldHelpLabel label="Visível" help={BUTTON_FIELD_HELP.visible} />
              <Switch
                checked={form.visible}
                onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))}
              />
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="Aparência" description="Como o botão aparece na página pública.">
        <div className="space-y-2">
          <FieldHelpLabel label="Variante visual" help={BUTTON_FIELD_HELP.visual_variant} />
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
            <SelectContent position="popper" className="max-h-72">
              {VARIANT_KEYS.map((v) => (
                <SelectItem key={v} value={v}>
                  {SMART_HUB_VARIANT_LABELS[v]}
                  {VARIANT_HELP[v].badge ? ` · ${VARIANT_HELP[v].badge}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>{variantHelp.description}</FieldHint>
          {variantHelp.badge &&
          (form.visual_variant === 'featured_card' || form.visual_variant === 'simple') ? (
            <TipCallout badge={variantHelp.badge}>
              {form.visual_variant === 'featured_card'
                ? 'Reserve para a ação principal da página.'
                : 'Formato limpo e direto para a maioria dos botões.'}
            </TipCallout>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            id="btn_bg"
            label="Cor de fundo"
            help={BUTTON_FIELD_HELP.background_color}
            value={form.background_color || '#0F766E'}
            fallback="#0F766E"
            onChange={(v) => setForm((f) => ({ ...f, background_color: v }))}
          />
          <ColorField
            id="btn_text"
            label="Cor do texto"
            help={BUTTON_FIELD_HELP.text_color}
            value={form.text_color || '#FFFFFF'}
            fallback="#FFFFFF"
            onChange={(v) => setForm((f) => ({ ...f, text_color: v }))}
          />
        </div>
        <ContrastPairAlert
          backgroundColor={form.background_color || '#0F766E'}
          textColor={form.text_color || '#FFFFFF'}
          onFix={fixContrast}
        />

        <div className="space-y-2">
          <FieldHelpLabel htmlFor="btn-icon" label="Ícone" help={BUTTON_FIELD_HELP.icon} />
          <Input
            id="btn-icon"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="message-circle, calendar, phone…"
          />
        </div>

        {editing?.id ? (
          <div className="space-y-2">
            <FieldHelpLabel label="Imagem do botão" help={BUTTON_FIELD_HELP.image} />
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
              <FieldHelpLabel
                htmlFor="img-alt"
                label="Texto alternativo da imagem"
                help={BUTTON_FIELD_HELP.image_alt}
              />
              <Input
                id="img-alt"
                value={form.image_alt}
                onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <FieldHelpLabel
              htmlFor="img-url"
              label="URL da imagem (opcional)"
              help={BUTTON_FIELD_HELP.image}
            />
            <Input
              id="img-url"
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://… ou envie após salvar"
            />
            <FieldHint>Após criar o botão, edite-o para enviar pelo upload.</FieldHint>
          </div>
        )}
      </FormSection>
    </div>
  );

  const saveSummary = (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left font-medium text-foreground"
        onClick={() => setSummaryOpen((v) => !v)}
        aria-expanded={summaryOpen}
      >
        Resumo antes de salvar
        {summaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {summaryOpen ? (
        <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wide opacity-70">Ação</dt>
            <dd>{SMART_HUB_CLICK_ACTION_LABELS[effectiveAction]}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide opacity-70">Destino</dt>
            <dd className="truncate">{destinationSummary}</dd>
          </div>
          {isFormAction ? (
            <>
              <div>
                <dt className="text-[11px] uppercase tracking-wide opacity-70">Etapa no CRM</dt>
                <dd>{stageLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide opacity-70">Responsável</dt>
                <dd>{ownerLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide opacity-70">Redirecionamento</dt>
                <dd>
                  {hubResolvedCapture.redirect_whatsapp_after_submit
                    ? 'WhatsApp após envio'
                    : 'Sem redirecionamento'}
                </dd>
              </div>
            </>
          ) : null}
          <div>
            <dt className="text-[11px] uppercase tracking-wide opacity-70">Aparência</dt>
            <dd>{SMART_HUB_VARIANT_LABELS[form.visual_variant]}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );

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
                  ] ||
                    btn.visual_variant ||
                    'Simples'}
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

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={cn(
            'flex max-h-[min(92vh,100dvh)] flex-col gap-0 overflow-hidden p-0',
            'w-[calc(100vw-1.5rem)] sm:max-w-3xl lg:max-w-5xl'
          )}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b px-4 py-3 text-left sm:px-6 sm:py-4">
            <DialogTitle>{editing ? 'Editar botão' : 'Novo botão'}</DialogTitle>
            <DialogDescription>
              Os campos mudam conforme a ação escolhida. A prévia mostra aparência e
              comportamento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              {formFields}
            </div>
            <aside className="hidden min-h-0 overflow-y-auto border-l bg-muted/20 p-4 lg:block">
              <div className="sticky top-0">
                <ButtonEditorPreview model={previewModel} showActualColors />
              </div>
            </aside>
          </div>

          <DialogFooter
            className={cn(
              'shrink-0 flex-col gap-3 border-t bg-background px-4 py-3 sm:px-6 sm:py-4',
              'pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            )}
          >
            {saveSummary}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="w-full lg:hidden sm:w-auto"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver prévia
              </Button>
              <div className="flex w-full flex-col-reverse gap-2 sm:ml-auto sm:w-auto sm:flex-row">
                <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={
                    !form.title.trim() || createButton.isPending || updateButton.isPending
                  }
                  onClick={save}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Prévia do botão</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ButtonEditorPreview model={previewModel} showActualColors />
          </div>
        </SheetContent>
      </Sheet>
    </SmartHubLayout>
  );
}
