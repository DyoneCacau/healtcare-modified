import { HubButton } from './HubButton';
import {
  previewAttendanceTitle,
  previewBehaviorLines,
  previewBehaviorTitle,
  previewIntentTitle,
} from './buttonEditorCopy';
import {
  contactMethodLabel,
  inferButtonIntent,
  previewIntentHeadline,
  type ButtonIntentId,
  type ContactMethodId,
  type SocialNetworkId,
} from './buttonIntentOptions';
import { resolveClickAction } from '@/services/smartHub/captureDefaults';
import {
  SMART_HUB_VARIANT_LABELS,
  type SmartHubButton,
  type SmartHubButtonType,
  type SmartHubButtonVisualVariant,
  type SmartHubClickAction,
} from '@/types/smartHub';
import { cn } from '@/lib/utils';

export interface ButtonEditorPreviewModel {
  title: string;
  subtitle: string;
  type: SmartHubButtonType;
  click_action: SmartHubClickAction;
  visual_variant: SmartHubButtonVisualVariant;
  url: string;
  whatsapp_message: string;
  icon: string;
  image: string;
  image_alt: string;
  background_color: string;
  text_color: string;
  redirect_whatsapp?: boolean;
  email_subject?: string;
  open_in_new_tab?: boolean;
  /** Resumo amigável (formulário / CRM) */
  interest?: string | null;
  stage_label?: string | null;
  owner_label?: string | null;
  has_owner?: boolean;
  show_crm_summary?: boolean;
  /** Intenção amigável (opcional; inferida se ausente) */
  intent?: ButtonIntentId;
  social_network?: SocialNetworkId | null;
  contact_method?: ContactMethodId | null;
  /** Resumo do formulário padrão do Hub */
  form_source_label?: string | null;
  using_hub_form?: boolean;
}

interface ButtonEditorPreviewProps {
  model: ButtonEditorPreviewModel;
  className?: string;
  /** Na edição, mostra as cores escolhidas (mesmo com contraste ruim). */
  showActualColors?: boolean;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
}

export function ButtonEditorPreview({
  model,
  className,
  showActualColors = true,
}: ButtonEditorPreviewProps) {
  const action = resolveClickAction(model.click_action, model.type);
  const inferred = inferButtonIntent(model.type, model.click_action);
  const intent = model.intent || inferred.intent;
  const socialNetwork = model.social_network ?? inferred.socialNetwork;
  const contactMethod = model.contact_method ?? inferred.contactMethod;
  const isAppointmentFlow = intent === 'appointment' || intent === 'procedure';
  const intentHeadline = previewIntentHeadline({
    intent,
    socialNetwork,
    type: model.type,
    contactMethod,
  });

  const previewButton = {
    id: 'preview-button',
    clinic_id: '',
    hub_id: '',
    title: model.title.trim() || 'Título do botão',
    subtitle: model.subtitle.trim() || null,
    icon: model.icon || null,
    type: model.type,
    url: model.url || '#',
    image: model.image || null,
    image_alt: model.image_alt || null,
    visual_variant: model.visual_variant,
    image_position: 'left',
    whatsapp_message: model.whatsapp_message || null,
    click_action: model.click_action,
    capture_config: {
      email_subject: model.email_subject || null,
      open_in_new_tab: model.open_in_new_tab,
    },
    background_color: model.background_color || '#0F766E',
    text_color: model.text_color || '#FFFFFF',
    visible: true,
    order_index: 0,
    track_click: true,
    status: 'active',
    created_at: '',
    updated_at: '',
    created_by: null,
    updated_by: null,
    deleted_at: null,
  } as SmartHubButton;

  const ownerDisplay = model.has_owner
    ? model.owner_label || 'Responsável definido'
    : 'Equipe da clínica';

  const behaviorLines = previewBehaviorLines(action, {
    redirectWhatsapp: Boolean(model.redirect_whatsapp),
    stageLabel: model.stage_label || 'Novo',
    ownerName: model.has_owner ? model.owner_label || null : null,
    contactMethod,
    isAppointmentFlow,
  });

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="text-sm font-semibold">Prévia do botão</p>
        <p className="text-xs text-muted-foreground">Atualiza conforme você edita.</p>
      </div>

      <div className="rounded-2xl border bg-muted/40 p-4">
        <div className="mx-auto max-w-sm space-y-3">
          <HubButton
            button={previewButton}
            onClick={() => undefined}
            defaultBg={model.background_color || '#0F766E'}
            defaultFg={model.text_color || '#FFFFFF'}
            autoFixContrast={!showActualColors}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-background px-3 py-3">
        <p className="text-sm font-semibold">Configuração deste botão</p>

        <SummaryRow label={previewIntentTitle()} value={intentHeadline} />

        {isAppointmentFlow && contactMethod ? (
          <SummaryRow label={previewAttendanceTitle()} value={contactMethodLabel(contactMethod)} />
        ) : null}

        {model.show_crm_summary ? (
          <>
            <SummaryRow label="Responsável" value={ownerDisplay} />
            <SummaryRow label="Etapa no CRM" value={model.stage_label || 'Novo'} />
            {model.interest?.trim() ? (
              <SummaryRow label="Interesse registrado" value={model.interest.trim()} />
            ) : null}
            {model.using_hub_form ? (
              <div className="space-y-1 rounded-md border bg-muted/20 px-2.5 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Formulário utilizado
                </p>
                <p className="text-sm font-medium">
                  {model.form_source_label || 'Padrão do Smart Hub'}
                </p>
                <p className="text-xs text-muted-foreground">Responsável: {ownerDisplay}</p>
                <p className="text-xs text-muted-foreground">
                  Etapa inicial: {model.stage_label || 'Novo'}
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        <SummaryRow
          label="Aparência"
          value={SMART_HUB_VARIANT_LABELS[model.visual_variant] || model.visual_variant}
        />

        <div className="space-y-1.5 border-t pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {previewBehaviorTitle()}
          </p>
          <ul className="space-y-1 text-sm leading-relaxed text-muted-foreground">
            {behaviorLines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
