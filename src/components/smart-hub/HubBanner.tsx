import { memo } from 'react';
import { cn } from '@/lib/utils';

interface HubBannerProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

export const HubBanner = memo(function HubBanner({
  src,
  alt = 'Banner da clínica',
  className,
}: HubBannerProps) {
  if (!src) return null;

  return (
    <div className={cn('w-full overflow-hidden', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-40 w-full object-cover sm:h-52 md:h-64"
      />
    </div>
  );
});
