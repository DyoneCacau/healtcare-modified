import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plug, Info } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { IntegrationFormDialog } from '@/components/integrations/IntegrationFormDialog';
import { AutomationFlowsPanel } from '@/components/integrations/AutomationFlowsPanel';
import { IntegrationLogsPanel } from '@/components/integrations/IntegrationLogsPanel';
import { ApiTokensPanel } from '@/components/integrations/ApiTokensPanel';
import { LeadsApiPanel } from '@/components/integrations/LeadsApiPanel';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useIntegrations } from '@/hooks/useIntegrations';
import {
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_PROVIDERS,
  type IntegrationProviderDefinition,
} from '@/lib/integrationProviders';
import type { Integration, IntegrationCategory } from '@/types/integration';

const CATEGORY_ORDER: IntegrationCategory[] = [
  'ads',
  'messaging',
  'forms',
  'automation',
  'api',
];

export default function Integrations() {
  const { isSuperAdmin } = useAuth();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { integrations, isLoading } = useIntegrations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDefinition, setSelectedDefinition] =
    useState<IntegrationProviderDefinition | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const canView = isSuperAdmin || can('integracoes', 'can_view');
  const canCreate = isSuperAdmin || can('integracoes', 'can_create');
  const canEdit = isSuperAdmin || can('integracoes', 'can_edit');
  const canDelete = isSuperAdmin || can('integracoes', 'can_delete');

  const byProvider = useMemo(() => {
    const map = new Map<string, Integration[]>();
    for (const integration of integrations) {
      const list = map.get(integration.provider) || [];
      list.push(integration);
      map.set(integration.provider, list);
    }
    return map;
  }, [integrations]);

  const handleConnect = (definition: IntegrationProviderDefinition) => {
    setSelectedDefinition(definition);
    setSelectedIntegration(null);
    setDialogOpen(true);
  };

  const handleManage = (integration: Integration) => {
    setSelectedDefinition(null);
    setSelectedIntegration(integration);
    setDialogOpen(true);
  };

  if (permissionsLoading) {
    return (
      <MainLayout>
        <Header title="Integrações" subtitle="Conexões desta clínica" />
        <Skeleton className="h-64" />
      </MainLayout>
    );
  }

  if (!canView) return <Navigate to="/app" replace />;

  return (
    <MainLayout>
      <Header
        title="Integrações"
        subtitle="Conexões, automações e credenciais desta clínica"
      />

      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-2 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Cada conexão é isolada por clínica, com endpoint de entrada, logs e tokens
            próprios. A captação de leads já funciona: provedores marcados com
            <span className="font-medium"> Cria lead</span> transformam o que recebem em card
            no CRM, e qualquer sistema pode usar a API de Leads.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="conexoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conexoes">Conexões</TabsTrigger>
          <TabsTrigger value="leads">API de Leads</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="tokens">Tokens de API</TabsTrigger>
        </TabsList>

        <TabsContent value="conexoes" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            CATEGORY_ORDER.map((category) => {
              const definitions = INTEGRATION_PROVIDERS.filter((p) => p.category === category);
              if (definitions.length === 0) return null;

              return (
                <section key={category} className="space-y-3">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Plug className="h-4 w-4" />
                    {INTEGRATION_CATEGORY_LABELS[category]}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {definitions.map((definition) => (
                      <IntegrationCard
                        key={definition.id}
                        definition={definition}
                        connections={byProvider.get(definition.id) || []}
                        canCreate={canCreate}
                        canEdit={canEdit}
                        onConnect={handleConnect}
                        onManage={handleManage}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="leads">
          <LeadsApiPanel />
        </TabsContent>

        <TabsContent value="automacoes">
          <AutomationFlowsPanel
            integrations={integrations}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="logs">
          <IntegrationLogsPanel />
        </TabsContent>

        <TabsContent value="tokens">
          <ApiTokensPanel canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
        </TabsContent>
      </Tabs>

      <IntegrationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        definition={selectedDefinition}
        integration={selectedIntegration}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </MainLayout>
  );
}
