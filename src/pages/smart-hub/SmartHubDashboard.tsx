import { useState } from 'react';
import { Copy, ExternalLink, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SmartHubLayout, DashboardStatsCard } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubAnalytics } from '@/hooks/useHubAnalytics';
import { useClinic } from '@/hooks/useClinic';
import { generateSlugFromTitle } from '@/services/smartHub';

export default function SmartHubDashboard() {
  const { clinicId, isLoading: clinicLoading } = useClinic();
  const { hub, publicUrl, isLoading, createHub } = useSmartHub();
  const { metrics, isLoading: metricsLoading } = useHubAnalytics(hub);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');

  if (clinicLoading || isLoading) {
    return (
      <SmartHubLayout title="Smart Hub" description="Central inteligente de conversão">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </SmartHubLayout>
    );
  }

  if (!clinicId) {
    return (
      <SmartHubLayout title="Smart Hub">
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Selecione uma clínica no menu lateral para gerenciar o Smart Hub.
        </div>
      </SmartHubLayout>
    );
  }

  if (!hub) {
    return (
      <SmartHubLayout
        title="Smart Hub"
        description="Crie a página pública da sua clínica"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Smart Hub
          </Button>
        }
      >
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">Nenhum Smart Hub configurado</h2>
          <p className="mt-2 text-muted-foreground">
            Crie sua página pública personalizada para converter visitas em leads e agendamentos.
          </p>
          <Button className="mt-6" onClick={() => setOpen(true)}>
            Começar agora
          </Button>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Smart Hub</DialogTitle>
              <DialogDescription>
                Defina o título e o slug da URL pública (ex.: /hub/rfclinic).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slug) setSlug(generateSlugFromTitle(e.target.value));
                  }}
                  placeholder="RF Clinic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="rfclinic"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!title.trim() || createHub.isPending}
                onClick={async () => {
                  await createHub.mutateAsync({ title: title.trim(), slug: slug.trim() || undefined });
                  setOpen(false);
                  setTitle('');
                  setSlug('');
                }}
              >
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SmartHubLayout>
    );
  }

  const copyUrl = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success('URL copiada.');
  };

  return (
    <SmartHubLayout
      title="Smart Hub"
      description="Central inteligente de conversão da clínica"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar URL
          </Button>
          <Button size="sm" asChild>
            <a href={publicUrl || '#'} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir página
            </a>
          </Button>
        </div>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">URL pública</p>
          <p className="truncate font-mono text-sm">{publicUrl}</p>
        </div>
        <Badge variant={hub.status === 'published' ? 'default' : 'secondary'}>
          {hub.status === 'published' ? 'Online' : hub.status}
        </Badge>
      </div>

      {metricsLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatsCard label="Visualizações" value={metrics?.views ?? 0} />
          <DashboardStatsCard label="Cliques" value={metrics?.clicks ?? 0} />
          <DashboardStatsCard label="Leads" value={metrics?.leads ?? 0} hint="Fase Analytics" />
          <DashboardStatsCard
            label="Agendamentos"
            value={metrics?.appointments ?? 0}
            hint="Fase Integrações"
          />
          <DashboardStatsCard label="Conversões" value={metrics?.conversions ?? 0} />
          <DashboardStatsCard label="CTR" value={`${metrics?.ctr ?? 0}%`} />
          <DashboardStatsCard label="Botão mais clicado" value={metrics?.topButton ?? '—'} />
          <DashboardStatsCard label="Origem principal" value={metrics?.mainOrigin ?? '—'} />
          <DashboardStatsCard label="Dispositivo principal" value={metrics?.mainDevice ?? '—'} />
          <DashboardStatsCard label="Campanha principal" value={metrics?.mainCampaign ?? '—'} />
          <DashboardStatsCard
            label="Última visita"
            value={
              metrics?.lastVisitAt
                ? new Date(metrics.lastVisitAt).toLocaleString('pt-BR')
                : '—'
            }
          />
          <DashboardStatsCard
            label="Status"
            value={metrics?.online ? 'Online' : 'Offline'}
          />
        </div>
      )}
    </SmartHubLayout>
  );
}
