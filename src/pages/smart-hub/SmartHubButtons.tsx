import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubButtons } from '@/hooks/useHubButtons';
import { Badge } from '@/components/ui/badge';

export default function SmartHubButtons() {
  const { hub, isLoading } = useSmartHub();
  const { buttons, isLoading: loadingButtons } = useHubButtons(hub?.id);

  return (
    <SmartHubLayout
      title="Botões"
      description="Gerencie os botões de conversão da página pública."
    >
      {isLoading || loadingButtons ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !hub ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Crie um Smart Hub no Dashboard para gerenciar botões.
        </div>
      ) : (
        <div className="space-y-3">
          {buttons.map((btn) => (
            <div
              key={btn.id}
              className="flex items-center justify-between rounded-lg border bg-card p-4"
            >
              <div>
                <p className="font-medium">{btn.title}</p>
                <p className="text-sm text-muted-foreground">
                  {btn.type}
                  {btn.url ? ` · ${btn.url}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">#{btn.order_index}</Badge>
                <Badge variant={btn.visible ? 'default' : 'secondary'}>
                  {btn.visible ? 'Visível' : 'Oculto'}
                </Badge>
              </div>
            </div>
          ))}
          {!buttons.length && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Nenhum botão cadastrado. CRUD completo via hooks/services já disponível para a Fase 2.
            </div>
          )}
        </div>
      )}
    </SmartHubLayout>
  );
}
