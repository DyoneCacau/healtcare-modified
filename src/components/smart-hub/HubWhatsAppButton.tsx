import { memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubWhatsAppButtonProps {
  phone?: string | null;
  message?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

function buildWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export const HubWhatsAppButton = memo(function HubWhatsAppButton({
  phone,
  message = 'Olá! Gostaria de mais informações.',
  label = 'Falar no WhatsApp',
  className,
  onClick,
}: HubWhatsAppButtonProps) {
  if (!phone) return null;

  return (
    <a
      href={buildWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        'mx-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700',
        className
      )}
    >
      <MessageCircle className="h-5 w-5" />
      {label}
    </a>
  );
});
