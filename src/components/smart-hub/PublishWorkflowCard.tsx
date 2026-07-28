import { Link } from 'react-router-dom';
import { CheckCircle2, Eye, PauseCircle, Rocket, FileEdit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SMART_HUB_STATUS_LABELS, type SmartHub, type SmartHubStatus } from '@/types/smartHub';
import { cn } from '@/lib/utils';

const STEPS: { key: string; label: string; statuses: SmartHubStatus[] }[] = [
  { key: 'draft', label: 'Rascunho', statuses: ['draft', 'published', 'offline', 'archived'] },
  { key: 'preview', label: 'Prévia', statuses: ['draft', 'published', 'offline', 'archived'] },
  { key: 'validate', label: 'Validação', statuses: ['draft', 'published', 'offline', 'archived'] },
  { key: 'publish', label: 'Publicação', statuses: ['published', 'offline'] },
  { key: 'pause', label: 'Pausa', statuses: ['offline'] },
];

function stepDone(stepKey: string, status: SmartHubStatus, validated: boolean): boolean {
  if (stepKey === 'draft') return true;
  if (stepKey === 'preview') return true;
  if (stepKey === 'validate') return validated || status === 'published' || status === 'offline';
  if (stepKey === 'publish') return status === 'published' || status === 'offline';
  if (stepKey === 'pause') return status === 'offline';
  return false;
}

function stepCurrent(stepKey: string, status: SmartHubStatus, validated: boolean): boolean {
  if (status === 'draft' && stepKey === 'draft') return !validated;
  if (status === 'draft' && stepKey === 'validate') return validated;
  if (status === 'published' && stepKey === 'publish') return true;
  if (status === 'offline' && stepKey === 'pause') return true;
  return false;
}

interface PublishWorkflowCardProps {
  hub: SmartHub;
  validating?: boolean;
  publishing?: boolean;
  pausing?: boolean;
  onValidate: () => void;
  onPublish: () => void;
  onPause: () => void;
  onRevertDraft?: () => void;
}

export function PublishWorkflowCard({
  hub,
  validating,
  publishing,
  pausing,
  onValidate,
  onPublish,
  onPause,
  onRevertDraft,
}: PublishWorkflowCardProps) {
  const validated = Boolean(hub.last_validated_at) && (hub.validation_errors?.length ?? 0) === 0;
  const errors = Array.isArray(hub.validation_errors) ? hub.validation_errors : [];

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Fluxo de publicação</p>
          <p className="text-xs text-muted-foreground">
            Rascunho → Prévia → Validação → Publicação → Pausa
          </p>
        </div>
        <Badge variant={hub.status === 'published' ? 'default' : 'secondary'}>
          {SMART_HUB_STATUS_LABELS[hub.status] || hub.status}
        </Badge>
      </div>

      <ol className="grid gap-2 sm:grid-cols-5">
        {STEPS.map((step) => {
          const done = stepDone(step.key, hub.status, validated);
          const current = stepCurrent(step.key, hub.status, validated);
          return (
            <li
              key={step.key}
              className={cn(
                'rounded-md border px-2 py-2 text-center text-xs',
                done && 'border-primary/40 bg-primary/5',
                current && 'ring-2 ring-primary'
              )}
            >
              {step.label}
            </li>
          );
        })}
      </ol>

      {errors.length > 0 && (
        <ul className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errors.map((err) => (
            <li key={typeof err === 'object' && err && 'code' in err ? String(err.code) : String(err)}>
              {typeof err === 'object' && err && 'message' in err ? String(err.message) : String(err)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/smart-hub/previa">
            <Eye className="mr-2 h-4 w-4" />
            Prévia
          </Link>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={validating}
          onClick={onValidate}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Validar
        </Button>
        <Button
          size="sm"
          disabled={publishing || hub.status === 'published'}
          onClick={onPublish}
        >
          <Rocket className="mr-2 h-4 w-4" />
          Publicar
        </Button>
        {(hub.status === 'published' || hub.status === 'offline') && (
          <Button
            variant="outline"
            size="sm"
            disabled={pausing || hub.status === 'offline'}
            onClick={onPause}
          >
            <PauseCircle className="mr-2 h-4 w-4" />
            Pausar
          </Button>
        )}
        {hub.status !== 'draft' && onRevertDraft && (
          <Button variant="ghost" size="sm" onClick={onRevertDraft}>
            <FileEdit className="mr-2 h-4 w-4" />
            Voltar a rascunho
          </Button>
        )}
      </div>

      {hub.published_at && (
        <p className="text-xs text-muted-foreground">
          Publicado em {new Date(hub.published_at).toLocaleString('pt-BR')}
          {hub.paused_at ? ` · Pausado em ${new Date(hub.paused_at).toLocaleString('pt-BR')}` : ''}
        </p>
      )}
    </div>
  );
}
