import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SURI_TEMPLATE_STATUS_LABELS,
  SURI_VARIABLE_FIELDS,
  SURI_VARIABLE_LABELS,
  type SuriTemplateOption,
  type SuriVariableField,
} from '@/lib/suriConfig';
import { findModelForTemplate, modelFields } from '@/lib/suriTemplateModels';

const NONE = '__none__';

/** Ordem sugerida ao escolher um template: o usuário ajusta depois. */
const DEFAULT_FIELD_ORDER: SuriVariableField[] = [
  'patient_first_name',
  'date',
  'time',
  'professional',
  'procedure',
  'clinic_name',
  'clinic_address',
  'clinic_phone',
  'patient_name',
];

export interface TemplateSelectionState {
  template_id: string;
  parameters: SuriVariableField[];
}

interface SuriTemplatePickerProps {
  label: string;
  templates: SuriTemplateOption[];
  value: TemplateSelectionState | null;
  /** Título salvo, exibido quando a lista da Suri não carregou. */
  savedTitle?: string | null;
  allowNone?: boolean;
  noneLabel?: string;
  disabled?: boolean;
  onChange: (value: TemplateSelectionState | null) => void;
}

export function SuriTemplatePicker({
  label,
  templates,
  value,
  savedTitle,
  allowNone = false,
  noneLabel = 'Nenhum',
  disabled = false,
  onChange,
}: SuriTemplatePickerProps) {
  const selected = value ? templates.find((t) => t.message_id === value.template_id) : undefined;
  const model = selected ? findModelForTemplate(selected) : null;

  const handleTemplate = (templateId: string) => {
    if (templateId === NONE) {
      onChange(null);
      return;
    }
    const template = templates.find((t) => t.message_id === templateId);
    const model = template ? findModelForTemplate(template) : null;
    if (model) {
      onChange({ template_id: templateId, parameters: modelFields(model) });
      return;
    }
    const count = template?.parameters ?? 0;
    onChange({
      template_id: templateId,
      parameters: Array.from({ length: count }, (_, i) => DEFAULT_FIELD_ORDER[i] ?? 'patient_first_name'),
    });
  };

  const handleParameter = (index: number, field: SuriVariableField) => {
    if (!value) return;
    const parameters = [...value.parameters];
    parameters[index] = field;
    onChange({ ...value, parameters });
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Select
          value={value?.template_id || NONE}
          onValueChange={handleTemplate}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Escolha um template" />
          </SelectTrigger>
          <SelectContent>
            {allowNone && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
            {!allowNone && !value && (
              <SelectItem value={NONE} disabled>
                Escolha um template
              </SelectItem>
            )}
            {value && !selected && (
              <SelectItem value={value.template_id}>
                {savedTitle || 'Template salvo'} (não listado pela Suri)
              </SelectItem>
            )}
            {templates.map((template) => (
              <SelectItem
                key={template.message_id}
                value={template.message_id}
                disabled={template.status !== null && template.status !== 0}
              >
                {template.title}
                {template.status !== null && template.status !== 0
                  ? ` — ${SURI_TEMPLATE_STATUS_LABELS[template.status] || 'indisponível'}`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected && (
        <div className="space-y-2">
          {model && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Modelo “{model.title}” reconhecido: variáveis preenchidas automaticamente.
            </p>
          )}
          <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 font-sans text-xs text-muted-foreground">
            {selected.body}
          </pre>
          {selected.quick_replies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Botões:
              {selected.quick_replies.map((reply) => (
                <Badge key={reply} variant="outline" className="text-[11px]">
                  {reply}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {value && value.parameters.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {value.parameters.map((field, index) => (
            <div key={index} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{`Variável {{${index + 1}}}`}</Label>
              <Select
                value={field}
                onValueChange={(next) => handleParameter(index, next as SuriVariableField)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SURI_VARIABLE_FIELDS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {SURI_VARIABLE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
