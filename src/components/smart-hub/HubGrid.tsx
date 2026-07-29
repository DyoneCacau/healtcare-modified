import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { SmartHubButton } from '@/types/smartHub';
import { HubButton } from './HubButton';

interface HubGridProps {
  buttons: SmartHubButton[];
  onButtonClick?: (button: SmartHubButton) => void;
  className?: string;
  emptyLabel?: string;
}

export const HubGrid = memo(function HubGrid({
  buttons,
  onButtonClick,
  className,
  emptyLabel = 'Nenhum botão publicado ainda.',
}: HubGridProps) {
  if (!buttons.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn('mx-auto grid w-full max-w-lg gap-3 px-4', className)}>
      {buttons.map((button) => (
        <HubButton key={button.id} button={button} onClick={onButtonClick} />
      ))}
    </div>
  );
});
