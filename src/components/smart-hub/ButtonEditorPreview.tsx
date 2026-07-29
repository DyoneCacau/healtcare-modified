import { HubButton } from './HubButton';
import { Badge } from '@/components/ui/badge';
import { previewActionHint, CLICK_ACTION_HELP, VARIANT_HELP } from './buttonEditorCopy';
import { resolveClickAction } from '@/services/smartHub/captureDefaults';
import {
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
}

interface ButtonEditorPreviewProps {
  model: ButtonEditorPreviewModel;
  className?: string;
}

export function ButtonEditorPreview({ model, className }: ButtonEditorPreviewProps) {
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
    capture_config: {},
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

  const actionMeta = CLICK_ACTION_HELP[action] || CLICK_ACTION_HELP.auto;
  const variantMeta = VARIANT_HELP[model.visual_variant] || VARIANT_HELP.simple;

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <p className="text-sm font-semibold">Prévia do botão</p>
        <p className="text-xs text-muted-foreground">
          Atualiza conforme você edita. Ação real só ocorre na página pública.
        </p>
      </div>

      <div className="rounded-2xl border bg-muted/40 p-4">
        <div className="mx-auto max-w-sm space-y-3">
          <HubButton
            button={previewButton}
            onClick={() => undefined}
            defaultBg={model.background_color || '#0F766E'}
            defaultFg={model.text_color || '#FFFFFF'}
          />
          <div className="rounded-lg border border-dashed bg-background/80 px-3 py-2 text-center text-xs text-muted-foreground">
            {previewActionHint(action)}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            {SMART_HUB_CLICK_ACTION_LABELS[action] || action}
          </Badge>
          <Badge variant="outline">
            {SMART_HUB_VARIANT_LABELS[model.visual_variant] || model.visual_variant}
          </Badge>
          {actionMeta.badge && <Badge>{actionMeta.badge}</Badge>}
          {variantMeta.badge && <Badge variant="outline">{variantMeta.badge}</Badge>}
        </div>
        <p className="text-muted-foreground leading-relaxed">{actionMeta.description}</p>
        <p className="text-muted-foreground leading-relaxed">{variantMeta.description}</p>
      </div>
    </div>
  );
}
