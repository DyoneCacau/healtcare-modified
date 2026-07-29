import { HubButton } from './HubButton';
import {
  previewBehaviorDescription,
  previewBehaviorTitle,
} from './buttonEditorCopy';
import { resolveClickAction } from '@/services/smartHub/captureDefaults';
import {
  SMART_HUB_BUTTON_TYPE_LABELS,
  SMART_HUB_CLICK_ACTION_LABELS,
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
}

interface ButtonEditorPreviewProps {
  model: ButtonEditorPreviewModel;
  className?: string;
  /** Na edição, mostra as cores escolhidas (mesmo com contraste ruim). */
  showActualColors?: boolean;
}

export function ButtonEditorPreview({
  model,
  className,
  showActualColors = true,
}: ButtonEditorPreviewProps) {
  const action = resolveClickAction(model.click_action, model.type);
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

      <div className="space-y-3 rounded-lg border bg-background px-3 py-3 text-sm">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tipo
          </p>
          <p className="font-medium">{SMART_HUB_BUTTON_TYPE_LABELS[model.type] || model.type}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ação
          </p>
          <p className="font-medium">
            {SMART_HUB_CLICK_ACTION_LABELS[action] || action}
          </p>
        </div>
        <div className="space-y-1 border-t pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {previewBehaviorTitle()}
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {previewBehaviorDescription(action, {
              redirectWhatsapp: Boolean(model.redirect_whatsapp),
            })}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Aparência: {SMART_HUB_VARIANT_LABELS[model.visual_variant] || model.visual_variant}
        </p>
      </div>
    </div>
  );
}
