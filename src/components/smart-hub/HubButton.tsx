import { memo, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeButtonVariant, type SmartHubButton } from '@/types/smartHub';
import { buildDestinationUrl } from '@/services/smartHub/buttonDestinations';
import { resolveDisplayTextColor } from '@/services/smartHub/imageUtils';
import { resolveButtonIconComponent } from './buttonIconOptions';

interface HubButtonProps {
  button: SmartHubButton;
  onClick?: (button: SmartHubButton) => void;
  className?: string;
  defaultBg?: string;
  defaultFg?: string;
  radiusClass?: string;
  /** Quando true (padrão), corrige contraste só na tela se a combinação salva for ilegível. */
  autoFixContrast?: boolean;
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = resolveButtonIconComponent(type);
  return <Icon className={cn('h-5 w-5 shrink-0', className)} />;
}

/** Fundo translúcido na cor do texto: funciona em botão claro ou escuro. */
const ICON_TILE_STYLE: CSSProperties = {
  backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)',
};

function glowShadow(bg: string | undefined): string | undefined {
  return bg && /^#[0-9a-f]{6}$/i.test(bg)
    ? `0 12px 28px -10px ${bg}cc, 0 0 0 3px ${bg}33`
    : undefined;
}

export const HubButton = memo(function HubButton({
  button,
  onClick,
  className,
  defaultBg,
  defaultFg,
  radiusClass = 'rounded-xl',
  autoFixContrast = true,
}: HubButtonProps) {
  const bg = button.background_color || defaultBg || undefined;
  const rawFg = button.text_color || defaultFg || undefined;
  const color =
    autoFixContrast && bg
      ? resolveDisplayTextColor(bg, rawFg, {
          bg: defaultBg || '#0F766E',
          fg: defaultFg || '#FFFFFF',
        })
      : rawFg;
  const href =
    buildDestinationUrl(
      button.type,
      button.url,
      button.whatsapp_message,
      button.capture_config?.email_subject
    ) || '#';
  const variant = normalizeButtonVariant(button.visual_variant);
  const imageAlt = button.image_alt || button.title;
  const openInNewTabPref = button.capture_config?.open_in_new_tab;
  const openInNewTab =
    openInNewTabPref !== undefined
      ? openInNewTabPref
      : button.type !== 'internal' && button.type !== 'phone' && button.type !== 'email';

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(button);
    }
  };

  if (button.visual_variant === 'info' || button.type === 'info') {
    return (
      <div
        className={cn('w-full border px-4 py-3 text-left shadow-sm', radiusClass, className)}
        style={{ backgroundColor: bg, color }}
      >
        <div className="font-semibold">{button.title}</div>
        {button.subtitle && <div className="mt-1 text-sm opacity-80">{button.subtitle}</div>}
      </div>
    );
  }

  const link = (content: ReactNode, linkClassName: string, style?: CSSProperties) => (
    <a
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={button.title}
      className={cn(
        'w-full border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[44px]',
        radiusClass,
        linkClassName,
        className
      )}
      style={{ backgroundColor: bg, color, ...style }}
    >
      {content}
    </a>
  );

  const texts = (titleClassName?: string) => (
    <div className="min-w-0 flex-1">
      <div className={cn('truncate font-semibold', titleClassName)}>{button.title}</div>
      {button.subtitle && <div className="truncate text-sm opacity-80">{button.subtitle}</div>}
    </div>
  );

  const iconTile = (sizeClassName: string, iconClassName?: string) =>
    button.image ? (
      <img
        src={button.image}
        alt={imageAlt}
        className={cn('shrink-0 rounded-lg object-cover', sizeClassName)}
        loading="lazy"
      />
    ) : (
      <div
        className={cn('flex shrink-0 items-center justify-center rounded-lg', sizeClassName)}
        style={ICON_TILE_STYLE}
      >
        <TypeIcon type={button.icon || button.type} className={iconClassName} />
      </div>
    );

  if (variant === 'image_card' && button.image) {
    return link(
      <>
        <img
          src={button.image}
          alt={imageAlt}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          {texts()}
          <ChevronRight className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
        </div>
      </>,
      'flex flex-col overflow-hidden shadow-sm hover:opacity-95'
    );
  }

  if (variant === 'featured_card') {
    return link(
      <>
        {iconTile('h-12 w-12', 'h-6 w-6')}
        {texts('text-lg')}
        <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
      </>,
      'flex items-center gap-4 border-2 px-5 py-5 shadow-lg hover:-translate-y-0.5 hover:shadow-xl',
      { boxShadow: glowShadow(bg) }
    );
  }

  if (variant === 'icon_card' || variant === 'image_card') {
    return link(
      <>
        {iconTile('h-10 w-10')}
        {texts()}
        <ChevronRight className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
      </>,
      'flex items-center gap-3 px-4 py-3 shadow-sm hover:opacity-95'
    );
  }

  return link(
    <div className="min-w-0 text-center">
      <div className="flex items-center justify-center gap-2">
        {button.icon && <TypeIcon type={button.icon} className="h-4 w-4" />}
        <span className="truncate font-semibold">{button.title}</span>
      </div>
      {button.subtitle && <div className="truncate text-sm opacity-80">{button.subtitle}</div>}
    </div>,
    'flex items-center justify-center px-4 py-3 shadow-sm hover:opacity-90'
  );
});
