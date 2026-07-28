import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SmartHubTemplates() {
  const { templates, hub, isLoading, applyTemplate } = useSmartHub();

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
          {templates.map((tpl) => {
            const selected = hub?.template_id === tpl.id;
            const blocks = Array.isArray(tpl.json_layout?.blocks)
              ? (tpl.json_layout.blocks as string[]).join(' · ')
              : 'Layout padrão';

            return (
              <div key={tpl.id} className="rounded-lg border bg-card p-4 shadow-card">
                <div className="mb-3 flex h-28 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                  {tpl.thumbnail ? (
                    <img
                      src={tpl.thumbnail}
                      alt={tpl.name}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    'Prévia do layout'
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tpl.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{blocks}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {tpl.is_default && <Badge>Padrão</Badge>}
                    {selected && <Badge variant="secondary">Aplicado</Badge>}
                  </div>
                </div>
                {!hub ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Crie o hub no Dashboard para aplicar templates.
                  </p>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    variant={selected ? 'secondary' : 'default'}
                    disabled={applyTemplate.isPending}
                    onClick={() => applyTemplate.mutate(tpl.id)}
                  >
                    {selected ? 'Reaplicar template' : 'Aplicar template'}
                  </Button>
                )}
              </div>
            );
          })}
          {!templates.length && (
            <div className="col-span-full rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum template disponível. Aplique a migration do Smart Hub.
            </div>
          )}
        </div>
      )}
    </SmartHubLayout>
  );
}
