import { memo, useMemo } from 'react';
import { HubBanner } from './HubBanner';
import { HubHeader } from './HubHeader';
import { HubGrid } from './HubGrid';
import { HubFooter } from './HubFooter';
import { HubSocialLinks } from './HubSocialLinks';
import { HubWhatsAppButton } from './HubWhatsAppButton';
import { HubContact } from './HubContact';
import { HubMap } from './HubMap';
import { HubLogo } from './HubLogo';
import type {
  PublicSmartHubPayload,
  SmartHubButton,
  SmartHubLayoutBlock,
} from '@/types/smartHub';

interface HubPublicViewProps {
  payload: PublicSmartHubPayload;
  preview?: boolean;
  onButtonClick?: (button: SmartHubButton) => void;
}

function normalizeBlocks(blocks: SmartHubLayoutBlock[] | undefined): SmartHubLayoutBlock[] {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return ['banner', 'logo', 'header', 'whatsapp', 'buttons', 'social', 'contact', 'map', 'footer'];
  }
  return blocks;
}

function resolveWhatsAppHref(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('wa.me/')) {
    return value.startsWith('wa.me/') ? `https://${value}` : value;
  }
  const digits = value.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : value;
}

export const HubPublicView = memo(function HubPublicView({
  payload,
  preview = false,
  onButtonClick,
}: HubPublicViewProps) {
  const hub = payload.hub;
  const buttons = payload.buttons ?? [];
  const theme = payload.theme;

  const primary = theme?.primary_color || hub.primary_color || '#0F766E';
  const background = theme?.background_color || hub.background_url || undefined;
  const blocks = normalizeBlocks(hub.layout_blocks);

  const hasWhatsappBlock = blocks.includes('whatsapp');
  const hasSocialBlock = blocks.includes('social');

  const socialLinks = useMemo(
    () =>
      buttons
        .filter((b) => b.type === 'social' && b.url)
        .map((b) => ({ label: b.title, url: b.url! })),
    [buttons]
  );

  const whatsappFromButtons = buttons.filter((b) => b.type === 'whatsapp' && b.url);
  const whatsappFallback: SmartHubButton | undefined = hub.whatsapp_number
    ? ({
        id: 'hub-whatsapp',
        title: 'WhatsApp',
        url: resolveWhatsAppHref(hub.whatsapp_number),
        type: 'whatsapp',
        track_click: true,
      } as SmartHubButton)
    : undefined;

  const whatsappPrimary = whatsappFromButtons[0] || whatsappFallback;

  /**
   * WhatsApp/social só saem do grid quando existe bloco dedicado no layout.
   * Templates como "Clássico" (sem bloco whatsapp) precisam listar o botão no grid.
   */
  const gridButtons = buttons.filter((b) => {
    if (b.type === 'whatsapp' && hasWhatsappBlock) return false;
    if (b.type === 'social' && hasSocialBlock) return false;
    return true;
  });

  const hasLogoBlock = blocks.includes('logo');
  const hasHeader = blocks.includes('header');
  const hasDescription = blocks.includes('description');

  const handleClick = (button: SmartHubButton) => {
    if (onButtonClick) {
      onButtonClick(button);
      return;
    }
    if (button.url) {
      const href =
        button.type === 'whatsapp' ? resolveWhatsAppHref(button.url) : button.url;
      window.open(href, button.type === 'internal' ? '_self' : '_blank');
    }
  };

  const rendered = blocks.map((block, index) => {
    switch (block) {
      case 'banner':
        return hub.banner_url ? <HubBanner key={`${block}-${index}`} src={hub.banner_url} /> : null;
      case 'logo':
        return hub.logo_url ? (
          <div key={`${block}-${index}`} className="flex justify-center px-4">
            <HubLogo src={hub.logo_url} alt={hub.title} />
          </div>
        ) : null;
      case 'header':
        return (
          <HubHeader
            key={`${block}-${index}`}
            title={hub.title}
            subtitle={hub.subtitle}
            description={hasDescription ? null : hub.description}
            logoUrl={hasLogoBlock ? null : hub.logo_url}
            showLogo={!hasLogoBlock}
            primaryColor={primary}
          />
        );
      case 'description':
        if (hasHeader) return null;
        return (
          <HubHeader
            key={`${block}-${index}`}
            description={hub.description}
            showLogo={false}
            primaryColor={primary}
          />
        );
      case 'whatsapp':
        return whatsappPrimary?.url ? (
          <HubWhatsAppButton
            key={`${block}-${index}`}
            phone={whatsappPrimary.url}
            label={whatsappPrimary.title || 'WhatsApp'}
            onClick={(e) => {
              e.preventDefault();
              handleClick(whatsappPrimary);
            }}
          />
        ) : null;
      case 'buttons':
      case 'grid':
        return (
          <HubGrid
            key={`${block}-${index}`}
            buttons={gridButtons}
            onButtonClick={handleClick}
            emptyLabel={
              preview
                ? 'Nenhum botão visível nesta prévia. Cadastre um botão em Botões.'
                : 'Nenhum botão publicado ainda.'
            }
          />
        );
      case 'social':
        return socialLinks.length ? (
          <HubSocialLinks key={`${block}-${index}`} links={socialLinks} />
        ) : null;
      case 'contact':
        return (
          <HubContact
            key={`${block}-${index}`}
            phone={hub.contact_phone}
            email={hub.contact_email}
          />
        );
      case 'map':
        return (
          <HubMap
            key={`${block}-${index}`}
            address={hub.contact_address}
            embedUrl={hub.map_embed_url}
          />
        );
      case 'footer':
        return <HubFooter key={`${block}-${index}`} />;
      default:
        return null;
    }
  });

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor:
          typeof background === 'string' && background.startsWith('#') ? background : undefined,
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
        {preview && (
          <div className="sticky top-0 z-20 border-b bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
            Modo prévia — visitantes públicos só veem o hub quando estiver publicado.
            {buttons.length > 0 ? ` · ${buttons.length} botão(ões) ativo(s)` : ''}
          </div>
        )}
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">{rendered}</div>
      </div>
    </div>
  );
});
