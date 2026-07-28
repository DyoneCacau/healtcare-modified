import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  HubBanner,
  HubHeader,
  HubGrid,
  HubFooter,
  HubSocialLinks,
  HubWhatsAppButton,
} from '@/components/smart-hub';
import { usePublicSmartHub } from '@/hooks/useSmartHub';
import { AnalyticsService } from '@/services/smartHub';
import type { SmartHubButton } from '@/types/smartHub';
import { isReservedSlug } from '@/services/smartHub';
import NotFound from '@/pages/NotFound';

function usePublicSeo(opts: {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
  url?: string;
}) {
  useEffect(() => {
    const prevTitle = document.title;
    const title = opts.title || 'Smart Hub';
    document.title = title;

    const ensureMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (opts.description) {
      ensureMeta('name', 'description', opts.description);
      ensureMeta('property', 'og:description', opts.description);
    }
    ensureMeta('property', 'og:title', title);
    ensureMeta('property', 'og:type', 'website');
    if (opts.url) ensureMeta('property', 'og:url', opts.url);
    if (opts.image) ensureMeta('property', 'og:image', opts.image);
    ensureMeta('name', 'robots', 'index,follow');

    let link = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (opts.favicon) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = opts.favicon;
    }

    return () => {
      document.title = prevTitle;
    };
  }, [opts.title, opts.description, opts.image, opts.favicon, opts.url]);
}

export default function PublicSmartHub() {
  const { slug } = useParams<{ slug: string }>();

  if (slug && isReservedSlug(slug)) {
    return <NotFound />;
  }

  return <PublicSmartHubContent slug={slug} />;
}

function PublicSmartHubContent({ slug }: { slug?: string }) {
  const { data, isLoading, error } = usePublicSmartHub(slug);

  const hub = data?.hub;
  const buttons = data?.buttons ?? [];
  const theme = data?.theme;

  const primary = theme?.primary_color || hub?.primary_color || '#0F766E';
  const background =
    theme?.background_color ||
    hub?.background_url ||
    undefined;

  const socialLinks = useMemo(
    () =>
      buttons
        .filter((b) => b.type === 'social' && b.url)
        .map((b) => ({ label: b.title, url: b.url! })),
    [buttons]
  );

  const whatsapp = buttons.find((b) => b.type === 'whatsapp');

  usePublicSeo({
    title: hub?.seo_title || hub?.title,
    description: hub?.seo_description || hub?.description,
    image: hub?.banner_url || hub?.logo_url,
    favicon: hub?.favicon_url,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  });

  useEffect(() => {
    if (!hub?.id) return;
    AnalyticsService.trackVisit(hub.id, {
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    }).catch(() => {
      /* tracking best-effort */
    });
  }, [hub?.id]);

  const handleButtonClick = async (button: SmartHubButton) => {
    if (hub?.id && button.track_click) {
      try {
        await AnalyticsService.trackClick(hub.id, button.id, {
          target_url: button.url,
          device_type:
            window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
        });
      } catch {
        /* ignore */
      }
    }
    if (button.url) {
      window.open(button.url, button.type === 'internal' ? '_self' : '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !hub) {
    return <NotFound />;
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: typeof background === 'string' && background.startsWith('#') ? background : undefined,
        backgroundImage:
          typeof background === 'string' && background.startsWith('http')
            ? `url(${background})`
            : hub.background_url
              ? `url(${hub.background_url})`
              : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: theme?.font_family || hub.font_family,
      }}
    >
      <div className="min-h-screen bg-background/80 backdrop-blur-[2px]">
        <HubBanner src={hub.banner_url} />
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
          <HubHeader
            title={hub.title}
            subtitle={hub.subtitle}
            description={hub.description}
            logoUrl={hub.logo_url}
            primaryColor={primary}
          />

          {whatsapp?.url && (
            <HubWhatsAppButton
              phone={whatsapp.url}
              label={whatsapp.title || 'WhatsApp'}
              onClick={() => handleButtonClick(whatsapp)}
            />
          )}

          <HubGrid
            buttons={buttons.filter((b) => b.type !== 'whatsapp' && b.type !== 'social')}
            onButtonClick={handleButtonClick}
          />

          <HubSocialLinks links={socialLinks} />
          <HubFooter />
        </div>
      </div>
    </div>
  );
}
