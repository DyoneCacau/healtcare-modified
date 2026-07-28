import { SmartHubLayout, DashboardStatsCard } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubAnalytics } from '@/hooks/useHubAnalytics';

/** Analytics avançado — skeleton da Fase Analytics. */
export default function SmartHubAnalytics() {
  const { hub, isLoading } = useSmartHub();
  const { metrics, visits, clicks, isLoading: loadingMetrics } = useHubAnalytics(hub);

  return (
    <SmartHubLayout
      title="Analytics"
      description="Métricas de visitas, cliques e conversões. Relatórios avançados na próxima fase."
    >
      {isLoading || loadingMetrics ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !hub ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Crie um Smart Hub no Dashboard para ver analytics.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStatsCard label="Visualizações" value={metrics?.views ?? 0} />
            <DashboardStatsCard label="Cliques" value={metrics?.clicks ?? 0} />
            <DashboardStatsCard label="CTR" value={`${metrics?.ctr ?? 0}%`} />
            <DashboardStatsCard
              label="Última visita"
              value={
                metrics?.lastVisitAt
                  ? new Date(metrics.lastVisitAt).toLocaleString('pt-BR')
                  : '—'
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-medium">Visitas recentes</h3>
              {visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {visits.slice(0, 8).map((v) => (
                    <li key={v.id} className="flex justify-between gap-2 border-b py-2 last:border-0">
                      <span className="truncate text-muted-foreground">
                        {v.referrer || v.utm_source || 'Direto'}
                      </span>
                      <span>{new Date(v.created_at).toLocaleString('pt-BR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-medium">Cliques recentes</h3>
              {clicks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum clique registrado.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {clicks.slice(0, 8).map((c) => (
                    <li key={c.id} className="flex justify-between gap-2 border-b py-2 last:border-0">
                      <span className="truncate text-muted-foreground">
                        {c.target_url || c.button_id || 'Botão'}
                      </span>
                      <span>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </SmartHubLayout>
  );
}
