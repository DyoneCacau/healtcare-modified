import { useId } from 'react';
import { HelpCircle, Megaphone, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { leadSourceLabels, type LeadSource } from '@/types/agenda';

function InstagramGlyph({ className, gradientId }: { className?: string; gradientId: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f58529" />
          <stop offset="30%" stopColor="#dd2a7b" />
          <stop offset="60%" stopColor="#8134af" />
          <stop offset="100%" stopColor="#515bd4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="#fff" />
    </svg>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.6 13.9c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.8-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3.2-.4 0-.1 0-.3-.1-.4-.1-.1-.5-1.3-.7-1.8-.2-.4-.4-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.4.5.2 1 .4 1.3.5.6.2 1.1.1 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.2-.1-.4-.2z"
      />
    </svg>
  );
}

function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.5 19v-6.1h2l.3-2.3h-2.3V9.1c0-.7.2-1.1 1.2-1.1H16V5.1C15.7 5 14.8 5 13.8 5c-2 0-3.3 1.2-3.3 3.4v1.9H8.5v2.3h2v6.1h3z"
      />
    </svg>
  );
}

const SOURCE_STYLES: Record<
  LeadSource,
  { wrap: string; brand?: 'instagram' | 'whatsapp' | 'facebook'; Lucide?: typeof HelpCircle }
> = {
  instagram: {
    wrap: 'border-transparent bg-gradient-to-r from-[#f58529]/15 via-[#dd2a7b]/15 to-[#515bd4]/15 text-[#c13584]',
    brand: 'instagram',
  },
  whatsapp: {
    wrap: 'border-[#25D366]/30 bg-[#25D366]/15 text-[#128C7E]',
    brand: 'whatsapp',
  },
  facebook: {
    wrap: 'border-[#1877F2]/30 bg-[#1877F2]/15 text-[#1877F2]',
    brand: 'facebook',
  },
  referral: {
    wrap: 'border-amber-300/50 bg-amber-50 text-amber-800',
    Lucide: Share2,
  },
  paid_traffic: {
    wrap: 'border-violet-300/50 bg-violet-50 text-violet-800',
    Lucide: Megaphone,
  },
  other: {
    wrap: 'border-muted-foreground/20 bg-muted text-muted-foreground',
    Lucide: HelpCircle,
  },
};

export function LeadSourceBadge({
  source,
  className,
}: {
  source: LeadSource;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, '');
  const style = SOURCE_STYLES[source] ?? SOURCE_STYLES.other;
  const label = leadSourceLabels[source] ?? source;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
        style.wrap,
        className,
      )}
    >
      {style.brand === 'instagram' ? (
        <InstagramGlyph className="h-3 w-3 shrink-0" gradientId={`ig-${gradId}`} />
      ) : style.brand === 'whatsapp' ? (
        <WhatsAppGlyph className="h-3 w-3 shrink-0" />
      ) : style.brand === 'facebook' ? (
        <FacebookGlyph className="h-3 w-3 shrink-0" />
      ) : style.Lucide ? (
        <style.Lucide className="h-3 w-3 shrink-0" />
      ) : null}
      {label}
    </span>
  );
}
