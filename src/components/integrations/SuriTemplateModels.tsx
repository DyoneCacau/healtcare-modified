import { useMemo } from 'react';
import { format } from 'date-fns';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useClinic } from '@/hooks/useClinic';
import {
  SURI_TEMPLATE_STATUS_LABELS,
  SURI_VARIABLE_LABELS,
  type SuriTemplateOption,
  type SuriVariableField,
} from '@/lib/suriConfig';
import {
  fillModelBody,
  findTemplatesForModel,
  modelFields,
  modelSuriBody,
  SURI_TEMPLATE_MODELS,
  type SuriModelKind,
  type SuriTemplateModel,
} from '@/lib/suriTemplateModels';
import type { TemplateSelectionState } from './SuriTemplatePicker';

interface SuriTemplateModelsProps {
  templates: SuriTemplateOption[];
  templatesLoading: boolean;
  canEdit: boolean;
  consultationTemplateId: string | null;
  examTemplateId: string | null;
  onApply: (kind: SuriModelKind, selection: TemplateSelectionState) => void;
}

const KIND_LABEL: Record<SuriModelKind, string> = {
  consultation: 'Consulta',
  exam: 'Exame',
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado');
  } catch {
    toast.error('Não foi possível copiar. Selecione e copie manualmente.');
  }
}

function clinicAddress(clinic: Record<string, unknown> | null | undefined): string {
  if (!clinic) return '';
  const first = [clinic.address, clinic.address_number ? `nº ${clinic.address_number}` : null]
    .filter(Boolean)
    .join(', ');
  const second = [clinic.neighborhood, clinic.city, clinic.state].filter(Boolean).join(' - ');
  return [first, second].filter(Boolean).join(' - ');
}

export function SuriTemplateModels({
  templates,
  templatesLoading,
  canEdit,
  consultationTemplateId,
  examTemplateId,
  onApply,
}: SuriTemplateModelsProps) {
  const { clinic } = useClinic();

  const sampleValues = useMemo(() => {
    const record = (clinic ?? null) as Record<string, unknown> | null;
    const base: Record<SuriVariableField, string> = {
      patient_first_name: 'Maria',
      patient_name: 'Maria Oliveira',
      date: format(new Date(), 'dd/MM/yyyy'),
      time: '14:30',
      professional: 'Dra. Ana Souza',
      procedure: 'Limpeza',
      clinic_name: String(record?.name || 'Clínica Sorriso'),
      clinic_address: clinicAddress(record) || 'Rua das Flores, nº 100 - Centro - São Paulo - SP',
      clinic_phone: String(record?.phone || '(11) 3333-4444'),
    };
    return {
      consultation: base,
      exam: { ...base, procedure: 'Radiografia panorâmica' },
    } satisfies Record<SuriModelKind, Record<SuriVariableField, string>>;
  }, [clinic]);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="space-y-1 text-sm">
          <p>
            Modelos prontos com as variáveis já mapeadas para os dados do paciente, da agenda e
            da clínica.
          </p>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
            <li>
              No Portal Suri, abra Mensagens Templates → novo <strong>Modelo de mensagem</strong>.
            </li>
            <li>
              <strong>Título</strong>: cole o nome do modelo (o título é único na Suri e não pode
              ser reaproveitado, mesmo apagando o template).
            </li>
            <li>
              <strong>Corpo da mensagem</strong>: cole o texto; os <code>{'{{1}}'}</code>,{' '}
              <code>{'{{2}}'}</code>… viram as variáveis.
            </li>
            <li>
              Marque <strong>Mensagem Template do WhatsApp</strong>, escolha o canal, Tipo{' '}
              <strong>Normal</strong> e Categoria <strong>Utilidade</strong> (não use Marketing).
            </li>
            <li>
              <strong>Exemplos de preenchimento</strong>: preencha cada variável com o exemplo
              indicado abaixo.
            </li>
            <li>
              <strong>Continuar</strong> → aba Ações → <strong>Resposta rápida</strong>: digite
              cada botão e clique em <strong>+ Resposta</strong>.
            </li>
            <li>
              <strong>Salvar</strong> e depois <strong>Aplicar</strong> para enviar à análise do
              WhatsApp. Quando aparecer “Aprovado na Suri” aqui, clique em <strong>Usar</strong>.
            </li>
          </ol>
        </AlertDescription>
      </Alert>

      {SURI_TEMPLATE_MODELS.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          values={sampleValues[model.kind]}
          matches={findTemplatesForModel(model, templates)}
          templatesLoading={templatesLoading}
          canEdit={canEdit}
          inUseId={model.kind === 'exam' ? examTemplateId : consultationTemplateId}
          onApply={onApply}
        />
      ))}
    </div>
  );
}

interface ModelCardProps {
  model: SuriTemplateModel;
  values: Record<SuriVariableField, string>;
  matches: SuriTemplateOption[];
  templatesLoading: boolean;
  canEdit: boolean;
  inUseId: string | null;
  onApply: (kind: SuriModelKind, selection: TemplateSelectionState) => void;
}

function ModelCard({
  model,
  values,
  matches,
  templatesLoading,
  canEdit,
  inUseId,
  onApply,
}: ModelCardProps) {
  const fields = modelFields(model);
  const suriBody = modelSuriBody(model);
  const examples = fields.map((field, i) => `{{${i + 1}}} = ${values[field] || '-'}`).join('\n');

  const approved = matches.find((t) => t.status === 0 || t.status === null);
  const pending = matches[0];
  const inUse = Boolean(approved && inUseId === approved.message_id);

  let suriStatus: { label: string; className: string };
  if (templatesLoading) {
    suriStatus = { label: 'Verificando na Suri…', className: 'bg-muted text-muted-foreground' };
  } else if (approved) {
    suriStatus = {
      label: 'Aprovado na Suri',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  } else if (pending) {
    suriStatus = {
      label: `Na Suri: ${SURI_TEMPLATE_STATUS_LABELS[pending.status ?? 0] || 'indisponível'}`,
      className: 'bg-amber-100 text-amber-900 border-amber-200',
    };
  } else {
    suriStatus = { label: 'Ainda não criado na Suri', className: 'bg-muted text-muted-foreground' };
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{model.title}</p>
          <p className="text-xs text-muted-foreground">{model.description}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{KIND_LABEL[model.kind]}</Badge>
          <Badge variant="outline" className={suriStatus.className}>
            {suriStatus.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Prévia no WhatsApp</Label>
          <div className="rounded-lg bg-emerald-50 p-3 text-sm shadow-sm dark:bg-emerald-950/40">
            <p className="whitespace-pre-wrap">{fillModelBody(model, values)}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {model.buttons.map((button) => (
              <Badge key={button} variant="outline" className="text-[11px]">
                {button}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Nome do template</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => copyText(model.suggestedName)}
              >
                <Copy className="mr-1 h-3 w-3" /> Copiar
              </Button>
            </div>
            <code className="block rounded bg-muted/60 px-2 py-1 text-xs">{model.suggestedName}</code>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Texto para a Suri</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => copyText(suriBody)}
              >
                <Copy className="mr-1 h-3 w-3" /> Copiar
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 font-sans text-xs">
              {suriBody}
            </pre>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Variáveis (preenchidas automaticamente)
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => copyText(examples)}
              >
                <Copy className="mr-1 h-3 w-3" /> Exemplos
              </Button>
            </div>
            <ul className="space-y-0.5 text-xs">
              {fields.map((field, i) => (
                <li key={field} className="flex items-center justify-between gap-2">
                  <span>
                    <code className="font-semibold">{`{{${i + 1}}}`}</code>{' '}
                    {SURI_VARIABLE_LABELS[field]}
                    <span className="text-muted-foreground"> — ex.: {values[field] || '-'}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    aria-label={`Copiar exemplo da variável ${i + 1}`}
                    onClick={() => copyText(values[field] || '-')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Botões de resposta rápida (aba Ações): {model.buttons.join(' e ')}.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!canEdit || !approved || inUse}
          onClick={() =>
            approved && onApply(model.kind, { template_id: approved.message_id, parameters: fields })
          }
        >
          {inUse && <Check className="mr-1 h-4 w-4" />}
          {inUse
            ? `Em uso como template de ${KIND_LABEL[model.kind].toLowerCase()}`
            : `Usar como template de ${KIND_LABEL[model.kind].toLowerCase()}`}
        </Button>
        {!approved && !templatesLoading && (
          <p className="text-[11px] text-muted-foreground">
            Disponível quando o template “{model.suggestedName}” estiver aprovado na Suri.
          </p>
        )}
      </div>
    </div>
  );
}
