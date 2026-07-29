import { memo, type MouseEvent } from 'react';
import {
  ExternalLink,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  Globe,
  Calendar,
  Info,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmartHubButton } from '@/types/smartHub';
import { buildDestinationUrl } from '@/services/smartHub/buttonDestinations';

interface HubButtonProps {
  button: SmartHubButton;
  onClick?: (button: SmartHubButton) => void;
  className?: string;
  defaultBg?: string;
  defaultFg?: string;
  radiusClass?: string;
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const props = { className: cn('h-5 w-5 shrink-0', className) };
  switch (type) {
    case 'whatsapp':
      return <MessageCircle {...props} />;
    case 'phone':
      return <Phone {...props} />;
    case 'email':
      return <Mail {...props} />;
    case 'map':
      return <MapPin {...props} />;
    case 'instagram':
      return <Instagram {...props} />;
    case 'facebook':
      return <Facebook {...props} />;
    case 'youtube':
      return <Youtube {...props} />;
    case 'site':
      return <Globe {...props} />;
    case 'appointment':
      return <Calendar {...props} />;
    case 'info':
      return <Info {...props} />;
    default:
      return <Link2 {...props} />;
  }
}

export const HubButton = memo(function HubButton({
  button,
  onClick,
  className,
  defaultBg,
  defaultFg,
  radiusClass = 'rounded-xl',
}: HubButtonProps) {
  const bg = button.background_color || defaultBg || undefined;
  const color = button.text_color || defaultFg || undefined;
  const href =
    buildDestinationUrl(button.type, button.url, button.whatsapp_message) || '#';
  const variant = button.visual_variant || 'simple';
  const imageAlt = button.image_alt || button.title;
  const openInNewTab = button.type !== 'internal' && button.type !== 'phone' && button.type !== 'email';

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(button);
    }
  };

  if (variant === 'info' || button.type === 'info') {
    return (
      <div
        className={cn(
          'w-full border px-4 py-3 text-left shadow-sm',
          radiusClass,
          className
        )}
        style={{ backgroundColor: bg, color }}
      >
        <div className="font-semibold">{button.title}</div>
        {button.subtitle && <div className="mt-1 text-sm opacity-80">{button.subtitle}</div>}
      </div>
    );
  }

  if (variant === 'horizontal_card' || variant === 'image_card') {
    return (
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={button.title}
        className={cn(
          'flex w-full items-stretch overflow-hidden border text-left shadow-sm transition hover:opacity-95',
          radiusClass,
          className
        )}
        style={{ backgroundColor: bg || '#fff', color }}
      >
        {button.image ? (
          <img
            src={button.image}
            alt={imageAlt}
            className="h-20 w-20 shrink-0 object-cover sm:h-24 sm:w-24"
            loading="lazy"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-muted sm:h-24 sm:w-24">
            <TypeIcon type={button.icon || button.type} />
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-semibold">{button.title}</div>
            {button.subtitle && (
              <div className="truncate text-sm opacity-80">{button.subtitle}</div>
            )}
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </div>
      </a>
    );
  }

  if (variant === 'icon_card' || variant === 'featured_card' || variant === 'list_item') {
    return (
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={button.title}
        className={cn(
          'flex w-full items-center gap-3 border px-4 py-3 text-left shadow-sm transition hover:opacity-95',
          variant === 'featured_card' && 'ring-2 ring-primary/30',
          radiusClass,
          className
        )}
        style={{ backgroundColor: bg, color }}
      >
        {button.image ? (
          <img
            src={button.image}
            alt={imageAlt}
            className="h-10 w-10 rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <TypeIcon type={button.icon || button.type} />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{button.title}</div>
          {button.subtitle && (
            <div className="truncate text-sm opacity-80">{button.subtitle}</div>
          )}
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target={openInNewTab ? '_blank' : undefined}
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label={button.title}
      className={cn(
        'flex w-full items-center justify-between gap-3 border px-4 py-3 text-left shadow-sm transition hover:opacity-90',
        radiusClass,
        className
      )}
      style={{ backgroundColor: bg, color }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {(button.icon || button.image) &&
          (button.image ? (
            <img
              src={button.image}
              alt={imageAlt}
              className="h-8 w-8 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <TypeIcon type={button.icon || button.type} />
          ))}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{button.title}</div>
          {button.subtitle && (
            <div className="truncate text-sm opacity-80">{button.subtitle}</div>
          )}
        </div>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
    </a>
  );
});
