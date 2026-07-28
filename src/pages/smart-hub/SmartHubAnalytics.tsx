import { SmartHubLayout, DashboardStatsCard } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubAnalytics } from '@/hooks/useHubAnalytics';
import { SMART_HUB_STATUS_LABELS } from '@/types/smartHub';

export default function SmartHubAnalytics() {
  const { hub, isLoading } = useSmartHub();
  const { metrics, visits, clicks, isLoading: loadingMetrics } = useHubAnalytics(hub);

  const deviceBreakdown = visits.reduce<Record<string, number>>((acc, v) => {
    const key = v.device_type || 'desconhecido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const originBreakdown = visits.reduce<Record<string, number>>((acc, v) => {
    const key = v.utm_source || v.referrer || 'Direto';
    const short = key.length > 40 ? `${key.slice(0, 40)}…` : key;
    acc[short] = (acc[short] || 0) + 1;
    return acc;
  }, {});

  return (
    <SmartHubLayout
      title="Analytics"
      description="Visitas, cliques, dispositivos e origens do Smart Hub."
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
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Status do hub:{' '}
            <span className="font-medium text-foreground">
              {SMART_HUB_STATUS_LABELS[hub.status]}
            </span>
            {hub.status !== 'published' &&
              ' — tracking público só registra eventos com hub publicado.'}
          </div>

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
              <h3 className="mb-3 font-medium">Dispositivos (amostra recente)</h3>
              {Object.keys(deviceBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {Object.entries(deviceBreakdown).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b py-2 last:border-0">
                      <span className="capitalize text-muted-foreground">{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-medium">Origens (amostra recente)</h3>
              {Object.keys(originBreakdown).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {Object.entries(originBreakdown).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2 border-b py-2 last:border-0">
                      <span className="truncate text-muted-foreground">{k}</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 font-medium">Visitas recentes</h3>
              {visits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {visits.slice(0, 10).map((v) => (
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
                  {clicks.slice(0, 10).map((c) => (
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
