import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { Badge } from '@/components/ui/badge';

/** Editor visual — estrutura pronta; implementação na próxima fase. */
export default function SmartHubEditor() {
  const { hub, pages, isLoading } = useSmartHub();

  return (
    <SmartHubLayout
      title="Páginas"
      description="Edite o layout da página pública. Editor visual disponível na próxima fase."
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !hub ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Crie um Smart Hub no Dashboard para gerenciar páginas.
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium">{page.title}</p>
                <p className="text-sm text-muted-foreground">/{page.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                {page.is_home && <Badge variant="outline">Home</Badge>}
                <Badge variant="secondary">{page.status}</Badge>
              </div>
            </div>
          ))}
          {!pages.length && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhuma página cadastrada.
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            O editor visual drag-and-drop será implementado na Fase 2.
          </p>
        </div>
      )}
    </SmartHubLayout>
  );
}
