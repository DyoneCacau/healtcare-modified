import { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SmartHubButton } from '@/types/smartHub';

interface HubButtonProps {
  button: SmartHubButton;
  onClick?: (button: SmartHubButton) => void;
  className?: string;
}

export const HubButton = memo(function HubButton({ button, onClick, className }: HubButtonProps) {
  const bg = button.background_color || undefined;
  const color = button.text_color || undefined;

  return (
    <a
      href={button.url || '#'}
      target={button.type === 'internal' ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(button);
        }
      }}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left shadow-sm transition hover:opacity-90',
        className
      )}
      style={{ backgroundColor: bg, color }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{button.title}</div>
        {button.subtitle && (
          <div className="truncate text-sm opacity-80">{button.subtitle}</div>
        )}
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-70" />
    </a>
  );
});
