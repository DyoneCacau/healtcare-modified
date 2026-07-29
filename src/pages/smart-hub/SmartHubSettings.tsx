import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SmartHubLayout, PublishWorkflowCard } from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { generateSlugFromTitle } from '@/services/smartHub';

export default function SmartHubSettings() {
  const {
    hub,
    isLoading,
    updateHub,
    checkSlug,
    publicUrl,
    lastValidation,
    validateHub,
    publishHub,
    pauseHub,
    revertToDraft,
  } = useSmartHub();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0F766E');
  const [secondaryColor, setSecondaryColor] = useState('#134E4A');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');

  useEffect(() => {
    if (!hub) return;
    setTitle(hub.title);
    setSubtitle(hub.subtitle || '');
    setDescription(hub.description || '');
    setSlug(hub.slug);
    setSeoTitle(hub.seo_title || '');
    setSeoDescription(hub.seo_description || '');
    setLogoUrl(hub.logo_url || '');
    setBannerUrl(hub.banner_url || '');
    setPrimaryColor(hub.primary_color || '#0F766E');
    setSecondaryColor(hub.secondary_color || '#134E4A');
    setWhatsappNumber(hub.whatsapp_number || '');
    setContactPhone(hub.contact_phone || '');
    setContactEmail(hub.contact_email || '');
    setContactAddress(hub.contact_address || '');
    setMapEmbedUrl(hub.map_embed_url || '');
  }, [hub]);

  return (
    <SmartHubLayout
      title="Configurações"
      description="Identidade, contatos, SEO e fluxo de publicação."
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
        <div className="mx-auto max-w-2xl space-y-6">
          <PublishWorkflowCard
            hub={hub}
            validating={validateHub.isPending}
            publishing={publishHub.isPending}
            pausing={pauseHub.isPending}
            lastValidation={lastValidation}
            onValidate={() => validateHub.mutateAsync()}
            onPublish={() => publishHub.mutate()}
            onPause={() => pauseHub.mutate()}
            onRevertDraft={() => revertToDraft.mutate()}
          />

          <div className="space-y-6 rounded-lg border bg-card p-6">
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
                  Validar slug
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{publicUrl}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do logo</Label>
                <Input id="logo_url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_url">URL do banner</Label>
                <Input
                  id="banner_url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor primária</Label>
                <Input
                  id="primary_color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary_color">Cor secundária</Label>
                <Input
                  id="secondary_color"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (DDI+DDD+número)</Label>
                <Input
                  id="whatsapp"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="5511999999999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="map">URL embed do mapa</Label>
              <Input
                id="map"
                value={mapEmbedUrl}
                onChange={(e) => setMapEmbedUrl(e.target.value)}
                placeholder="https://www.google.com/maps/embed?..."
              />
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
                  logo_url: logoUrl || null,
                  banner_url: bannerUrl || null,
                  primary_color: primaryColor,
                  secondary_color: secondaryColor,
                  whatsapp_number: whatsappNumber || null,
                  contact_phone: contactPhone || null,
                  contact_email: contactEmail || null,
                  contact_address: contactAddress || null,
                  map_embed_url: mapEmbedUrl || null,
                })
              }
            >
              Salvar configurações
            </Button>
          </div>
        </div>
      )}
    </SmartHubLayout>
  );
}
