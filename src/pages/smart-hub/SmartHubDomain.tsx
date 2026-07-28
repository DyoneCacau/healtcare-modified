import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { Badge } from '@/components/ui/badge';

/** Domínio customizado — estrutura pronta; verificação DNS na próxima fase. */
export default function SmartHubDomain() {
  const { hub, domains, isLoading, publicUrl } = useSmartHub();

  return (
    <SmartHubLayout
      title="Domínio"
      description="Configure domínio personalizado para o Smart Hub."
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !hub ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Crie um Smart Hub no Dashboard para configurar domínio.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">URL padrão</p>
            <p className="font-mono text-sm">{publicUrl}</p>
          </div>

          {domains.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium">{d.domain}</p>
                <p className="text-sm text-muted-foreground">SSL: {d.ssl_status}</p>
              </div>
              <div className="flex gap-2">
                {d.is_primary && <Badge>Primário</Badge>}
                <Badge variant={d.is_verified ? 'default' : 'secondary'}>
                  {d.is_verified ? 'Verificado' : d.status}
                </Badge>
              </div>
            </div>
          ))}

          {!domains.length && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum domínio customizado. A verificação DNS/SSL será implementada na próxima fase.
            </div>
          )}
        </div>
      )}
    </SmartHubLayout>
  );
}
