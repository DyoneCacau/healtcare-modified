import { MessageCircle, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { readSuriConfig } from '@/lib/suriConfig';
import type { Integration } from '@/types/integration';

interface SuriCardProps {
  connection: Integration | null;
  canCreate: boolean;
  canEdit: boolean;
  onOpen: () => void;
}

export function SuriCard({ connection, canCreate, canEdit, onOpen }: SuriCardProps) {
  const config = connection ? readSuriConfig(connection.config) : null;
  const hour = config ? `${String(config.send_hour).padStart(2, '0')}:00` : null;

  return (
    <Card className="flex h-full flex-col border-primary/25 bg-gradient-to-br from-background to-emerald-500/5">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Suri
            </h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[11px]">
                WhatsApp
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                Templates
              </Badge>
            </div>
          </div>
          {connection && <IntegrationStatusBadge status={connection.status} />}
        </div>

        <p className="text-sm text-muted-foreground">
          Envia a confirmação de consultas e exames no dia do procedimento usando os templates
          aprovados na sua Suri. A resposta do paciente atualiza a agenda.
        </p>

        {connection && config ? (
          <div className="space-y-1 rounded-md border bg-background/80 px-3 py-2 text-sm">
            <p className="font-medium">
              {config.reminders_enabled ? `Envio automático às ${hour}` : 'Envio automático desligado'}
            </p>
            <p className="text-muted-foreground">
              Consulta: {config.consultation_template?.title || 'template não escolhido'}
            </p>
            <p className="text-muted-foreground">
              Exame: {config.exam_template?.title || 'usa o template de consulta'}
            </p>
            {connection.last_error && (
              <p className="text-xs text-destructive">{connection.last_error}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma conta Suri conectada nesta clínica.</p>
        )}

        <div className="mt-auto pt-1">
          <Button
            type="button"
            size="sm"
            className="w-full"
            variant={connection ? 'outline' : 'default'}
            disabled={connection ? !canEdit : !canCreate}
            onClick={onOpen}
          >
            {connection ? (
              <>
                <Settings2 className="mr-1 h-3.5 w-3.5" />
                Configurar confirmações
              </>
            ) : (
              <>
                <MessageCircle className="mr-1 h-3.5 w-3.5" />
                Conectar Suri
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
