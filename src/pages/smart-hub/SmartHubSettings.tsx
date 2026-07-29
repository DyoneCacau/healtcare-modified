import { useEffect, useMemo, useState } from 'react';
import { Eye, Monitor, Smartphone, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import {
  SmartHubLayout,
  PublishWorkflowCard,
  SmartHubImageUpload,
  ColorField,
  HubPublicView,
} from '@/components/smart-hub';
import { useSmartHub } from '@/hooks/useSmartHub';
import { useHubButtons } from '@/hooks/useHubButtons';
import { useClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AssetService,
  STYLE_PRESETS,
  mergeVisualConfig,
  generateSlugFromTitle,
} from '@/services/smartHub';
import {
  SMART_HUB_STYLE_PRESET_LABELS,
  type PublicSmartHubPayload,
  type SmartHubAssetKind,
  type SmartHubStylePreset,
  type SmartHubVisualConfig,
} from '@/types/smartHub';

type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

const STYLE_PRESET_KEYS = Object.keys(SMART_HUB_STYLE_PRESET_LABELS) as SmartHubStylePreset[];

function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const clean = url.split('?')[0];
    const marker = '/smart-hub-assets/';
    const idx = clean.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(clean.slice(idx + marker.length));
  } catch {
    return null;
  }
}

function deviceFrameClass(device: PreviewDevice): string {
  switch (device) {
    case 'mobile':
      return 'mx-auto w-full max-w-[390px]';
    case 'tablet':
      return 'mx-auto w-full max-w-[768px]';
    default:
      return 'w-full max-w-2xl mx-auto';
  }
}

export default function SmartHubSettings() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const {
    hub,
    theme,
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
  const { buttons } = useHubButtons(hub?.id);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0F766E');
  const [secondaryColor, setSecondaryColor] = useState('#134E4A');
  const [stylePreset, setStylePreset] = useState<SmartHubStylePreset>('clean');
  const [visualConfig, setVisualConfig] = useState<SmartHubVisualConfig>({});
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [mapEmbedUrl, setMapEmbedUrl] = useState('');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('mobile');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

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
    setProfileUrl(hub.profile_url || '');
    setPrimaryColor(hub.primary_color || '#0F766E');
    setSecondaryColor(hub.secondary_color || '#134E4A');
    const preset = (hub.style_preset as SmartHubStylePreset) || 'clean';
    setStylePreset(STYLE_PRESETS[preset] ? preset : 'clean');
    setVisualConfig(mergeVisualConfig(hub.style_preset, hub.visual_config));
    setWhatsappNumber(hub.whatsapp_number || '');
    setContactPhone(hub.contact_phone || '');
    setContactEmail(hub.contact_email || '');
    setContactAddress(hub.contact_address || '');
    setMapEmbedUrl(hub.map_embed_url || '');
  }, [hub]);

  const previewPayload = useMemo((): PublicSmartHubPayload | null => {
    if (!hub) return null;
    const visibleButtons = buttons.filter(
      (b) => b.visible && b.status === 'active' && !b.deleted_at
    );
    return {
      hub: {
        ...hub,
        title,
        subtitle: subtitle || null,
        description: description || null,
        slug,
        logo_url: logoUrl || null,
        banner_url: bannerUrl || null,
        profile_url: profileUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        style_preset: stylePreset,
        visual_config: visualConfig,
        whatsapp_number: whatsappNumber || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        contact_address: contactAddress || null,
        map_embed_url: mapEmbedUrl || null,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
      },
      theme: theme
        ? {
            ...theme,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            background_color: visualConfig.background_color ?? theme.background_color,
            text_color: visualConfig.text_color ?? theme.text_color,
          }
        : null,
      buttons: visibleButtons,
      page: null,
      assets: [],
      preview: true,
    };
  }, [
    hub,
    theme,
    buttons,
    title,
    subtitle,
    description,
    slug,
    logoUrl,
    bannerUrl,
    profileUrl,
    primaryColor,
    secondaryColor,
    stylePreset,
    visualConfig,
    whatsappNumber,
    contactPhone,
    contactEmail,
    contactAddress,
    mapEmbedUrl,
    seoTitle,
    seoDescription,
  ]);

  const patchVisual = (patch: Partial<SmartHubVisualConfig>) => {
    setVisualConfig((prev) => ({ ...prev, ...patch }));
  };

  const applyStylePreset = (preset: SmartHubStylePreset) => {
    const cfg = STYLE_PRESETS[preset];
    if (!cfg) return;
    setStylePreset(preset);
    setPrimaryColor(cfg.primary_color);
    setSecondaryColor(cfg.secondary_color);
    setVisualConfig({ ...cfg.visual_config });
  };

  const restoreTemplateColors = () => {
    if (
      !confirm(
        'Restaurar as cores do template atual? As cores personalizadas da prévia serão substituídas.'
      )
    ) {
      return;
    }
    applyStylePreset(stylePreset);
    toast.success('Cores do template restauradas na prévia.');
  };

  const handleImageUpload = async (
    kind: Extract<SmartHubAssetKind, 'logo' | 'banner' | 'profile'>,
    file: File
  ) => {
    if (!clinicId || !hub?.id) throw new Error('Hub não encontrado.');
    const currentUrl =
      kind === 'logo' ? logoUrl : kind === 'banner' ? bannerUrl : profileUrl;

    const asset = await AssetService.upload(clinicId, hub.id, file, {
      userId: user?.id,
      kind,
      previousStoragePath: storagePathFromPublicUrl(currentUrl),
    });

    const url = asset.public_url || '';
    if (kind === 'logo') {
      setLogoUrl(url);
      await updateHub.mutateAsync({ logo_url: url || null });
    } else if (kind === 'banner') {
      setBannerUrl(url);
      await updateHub.mutateAsync({ banner_url: url || null });
    } else {
      setProfileUrl(url);
      await updateHub.mutateAsync({ profile_url: url || null });
    }
    toast.success('Imagem enviada com sucesso.');
  };

  const handleImageRemove = async (
    kind: Extract<SmartHubAssetKind, 'logo' | 'banner' | 'profile'>
  ) => {
    if (kind === 'logo') {
      setLogoUrl('');
      await updateHub.mutateAsync({ logo_url: null });
    } else if (kind === 'banner') {
      setBannerUrl('');
      await updateHub.mutateAsync({ banner_url: null });
    } else {
      setProfileUrl('');
      await updateHub.mutateAsync({ profile_url: null });
    }
  };

  const saveSettings = () => {
    updateHub.mutate({
      title,
      subtitle: subtitle || null,
      description: description || null,
      slug,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      profile_url: profileUrl || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      style_preset: stylePreset,
      visual_config: visualConfig,
      whatsapp_number: whatsappNumber || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      contact_address: contactAddress || null,
      map_embed_url: mapEmbedUrl || null,
    });
  };

  const previewPane = previewPayload ? (
    <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <div className={deviceFrameClass(previewDevice)}>
        <HubPublicView payload={previewPayload} preview />
      </div>
    </div>
  ) : null;

  const formSection = hub && clinicId ? (
    <div className="space-y-6">
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
        <div>
          <h3 className="text-sm font-semibold">Identidade</h3>
          <p className="text-xs text-muted-foreground">
            Nome público, textos e imagens da página.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Nome público da clínica</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Nome exibido na página pública. Independente do slug da URL.
          </p>
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
          <Label htmlFor="slug">Slug (endereço da página)</Label>
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
              Gerar do nome
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
          <p className="text-xs text-muted-foreground">
            Apenas o caminho da URL (letras minúsculas, números e hífens). Não altera o nome público.
          </p>
          {publicUrl && (
            <p className="break-all text-xs text-muted-foreground">{publicUrl}</p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Logo</Label>
            <SmartHubImageUpload
              kind="logo"
              currentUrl={logoUrl || null}
              clinicId={clinicId}
              hubId={hub.id}
              disabled={updateHub.isPending}
              onUpload={(file) => handleImageUpload('logo', file)}
              onRemove={() => handleImageRemove('logo')}
            />
          </div>
          <div className="space-y-2">
            <Label>Foto de perfil</Label>
            <SmartHubImageUpload
              kind="profile"
              currentUrl={profileUrl || null}
              clinicId={clinicId}
              hubId={hub.id}
              disabled={updateHub.isPending}
              onUpload={(file) => handleImageUpload('profile', file)}
              onRemove={() => handleImageRemove('profile')}
            />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label>Banner</Label>
            <SmartHubImageUpload
              kind="banner"
              currentUrl={bannerUrl || null}
              clinicId={clinicId}
              hubId={hub.id}
              disabled={updateHub.isPending}
              onUpload={(file) => handleImageUpload('banner', file)}
              onRemove={() => handleImageRemove('banner')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Visual</h3>
            <p className="text-xs text-muted-foreground">
              Cores, estilo e aparência da página pública.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={restoreTemplateColors}>
            Restaurar cores do template
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Estilo visual</Label>
          <Select
            value={stylePreset}
            onValueChange={(v) => applyStylePreset(v as SmartHubStylePreset)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLE_PRESET_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {SMART_HUB_STYLE_PRESET_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            id="primary_color"
            label="Cor primária"
            value={primaryColor}
            fallback={STYLE_PRESETS[stylePreset]?.primary_color || '#0F766E'}
            onChange={setPrimaryColor}
          />
          <ColorField
            id="secondary_color"
            label="Cor secundária"
            value={secondaryColor}
            fallback={STYLE_PRESETS[stylePreset]?.secondary_color || '#134E4A'}
            onChange={setSecondaryColor}
          />
          <ColorField
            id="bg_color"
            label="Cor de fundo"
            value={visualConfig.background_color || '#F8FAFC'}
            fallback={STYLE_PRESETS[stylePreset]?.visual_config.background_color || '#F8FAFC'}
            onChange={(v) => patchVisual({ background_color: v })}
          />
          <ColorField
            id="text_color"
            label="Cor do texto"
            value={visualConfig.text_color || '#0F172A'}
            fallback={STYLE_PRESETS[stylePreset]?.visual_config.text_color || '#0F172A'}
            contrastAgainst={visualConfig.background_color || '#F8FAFC'}
            onChange={(v) => patchVisual({ text_color: v })}
          />
          <ColorField
            id="button_bg"
            label="Cor do botão"
            value={visualConfig.button_bg_color || primaryColor}
            fallback={STYLE_PRESETS[stylePreset]?.visual_config.button_bg_color || primaryColor}
            onChange={(v) => patchVisual({ button_bg_color: v })}
          />
          <ColorField
            id="button_text"
            label="Texto do botão"
            value={visualConfig.button_text_color || '#FFFFFF'}
            fallback={STYLE_PRESETS[stylePreset]?.visual_config.button_text_color || '#FFFFFF'}
            contrastAgainst={visualConfig.button_bg_color || primaryColor}
            onChange={(v) => patchVisual({ button_text_color: v })}
          />
          <ColorField
            id="card_bg"
            label="Fundo do card"
            value={visualConfig.card_bg_color || '#FFFFFF'}
            fallback={STYLE_PRESETS[stylePreset]?.visual_config.card_bg_color || '#FFFFFF'}
            onChange={(v) => patchVisual({ card_bg_color: v })}
          />
          <ColorField
            id="border_color"
            label="Cor da borda"
            value={visualConfig.border_color || '#E2E8F0'}
            fallback={STYLE_PRESETS[stylePreset]?.visual_config.border_color || '#E2E8F0'}
            onChange={(v) => patchVisual({ border_color: v })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Modo de fundo</Label>
            <Select
              value={visualConfig.background_mode || 'solid'}
              onValueChange={(v) =>
                patchVisual({ background_mode: v as SmartHubVisualConfig['background_mode'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Sólido</SelectItem>
                <SelectItem value="gradient">Gradiente</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
            <div>
              <Label htmlFor="floating_wa">WhatsApp flutuante</Label>
              <p className="text-xs text-muted-foreground">Botão fixo no canto da página</p>
            </div>
            <Switch
              id="floating_wa"
              checked={Boolean(visualConfig.floating_whatsapp)}
              onCheckedChange={(v) => patchVisual({ floating_whatsapp: v })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h3 className="text-sm font-semibold">Contatos</h3>
          <p className="text-xs text-muted-foreground">WhatsApp, telefone, e-mail e endereço.</p>
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
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <h3 className="text-sm font-semibold">SEO</h3>
          <p className="text-xs text-muted-foreground">Título e descrição para buscadores.</p>
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
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={updateHub.isPending} onClick={saveSettings}>
          Salvar configurações
        </Button>
        <Button
          type="button"
          variant="outline"
          className="lg:hidden"
          onClick={() => setMobilePreviewOpen(true)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Ver prévia
        </Button>
      </div>
    </div>
  ) : null;

  const previewControls = (
    <div className="mb-3 space-y-2">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        As alterações da prévia só serão publicadas após salvar.
      </div>
      <ToggleGroup
        type="single"
        value={previewDevice}
        onValueChange={(v) => {
          if (v) setPreviewDevice(v as PreviewDevice);
        }}
        variant="outline"
        size="sm"
        className="justify-start"
      >
        <ToggleGroupItem value="mobile" aria-label="Prévia celular">
          <Smartphone className="mr-1.5 h-3.5 w-3.5" />
          Celular
        </ToggleGroupItem>
        <ToggleGroupItem value="tablet" aria-label="Prévia tablet">
          <Tablet className="mr-1.5 h-3.5 w-3.5" />
          Tablet
        </ToggleGroupItem>
        <ToggleGroupItem value="desktop" aria-label="Prévia desktop">
          <Monitor className="mr-1.5 h-3.5 w-3.5" />
          Desktop
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );

  return (
    <SmartHubLayout
      title="Configurações"
      description="Identidade, visual, contatos, SEO e fluxo de publicação."
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
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0">{formSection}</div>
            <div className="hidden min-w-0 lg:block">
              <div className="sticky top-4">
                <h3 className="mb-2 text-sm font-semibold">Prévia ao vivo</h3>
                {previewControls}
                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl bg-muted/40 p-3">
                  {previewPane}
                </div>
              </div>
            </div>
          </div>

          <Sheet open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
            <SheetContent side="bottom" className="h-[92vh] overflow-y-auto sm:max-w-none">
              <SheetHeader>
                <SheetTitle>Prévia</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {previewControls}
                {previewPane}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </SmartHubLayout>
  );
}
