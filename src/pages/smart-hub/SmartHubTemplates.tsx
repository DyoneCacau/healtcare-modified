import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { Badge } from '@/components/ui/badge';

export default function SmartHubTemplates() {
  const { templates, hub, isLoading } = useSmartHub();

  return (
    <SmartHubLayout
      title="Templates"
      description="Escolha um template base para a página pública."
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="rounded-lg border bg-card p-4 shadow-card">
              <div className="mb-3 flex h-28 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                {tpl.thumbnail ? (
                  <img src={tpl.thumbnail} alt={tpl.name} className="h-full w-full rounded-md object-cover" />
                ) : (
                  'Prévia'
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{tpl.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{tpl.description}</p>
                </div>
                {tpl.is_default && <Badge>Padrão</Badge>}
              </div>
              {!hub && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Crie o hub no Dashboard para aplicar templates.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </SmartHubLayout>
  );
}
