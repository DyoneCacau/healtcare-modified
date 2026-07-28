import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SmartHubLayout } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateSlugFromTitle } from '@/services/smartHub';
import type { SmartHubStatus } from '@/types/smartHub';

export default function SmartHubSettings() {
  const { hub, isLoading, updateHub, checkSlug, publicUrl } = useSmartHub();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [status, setStatus] = useState<SmartHubStatus>('draft');

  useEffect(() => {
    if (!hub) return;
    setTitle(hub.title);
    setSubtitle(hub.subtitle || '');
    setDescription(hub.description || '');
    setSlug(hub.slug);
    setSeoTitle(hub.seo_title || '');
    setSeoDescription(hub.seo_description || '');
    setStatus(hub.status);
  }, [hub]);

  return (
    <SmartHubLayout
      title="Configurações"
      description="Identidade, SEO, slug e status da página pública."
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : !hub ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Crie um Smart Hub no Dashboard para configurar.
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6 rounded-lg border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtítulo</Label>
            <Input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="min-w-[180px] flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setSlug(generateSlugFromTitle(title))}
              >
                Gerar
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={checkSlug.isPending}
                onClick={async () => {
                  const ok = await checkSlug.mutateAsync(slug);
                  if (ok) toast.success('Slug disponível.');
                  else toast.error('Slug indisponível ou inválido.');
                }}
              >
                Validar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{publicUrl}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo_title">SEO Title</Label>
            <Input
              id="seo_title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seo_description">SEO Description</Label>
            <Textarea
              id="seo_description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SmartHubStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="published">Publicado (Online)</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={updateHub.isPending}
            onClick={() =>
              updateHub.mutate({
                title,
                subtitle: subtitle || null,
                description: description || null,
                slug,
                seo_title: seoTitle || null,
                seo_description: seoDescription || null,
                status,
              })
            }
          >
            Salvar configurações
          </Button>
        </div>
      )}
    </SmartHubLayout>
  );
}
