import { cn } from '@/lib/utils';

interface CurrentTimeIndicatorProps {
  /** Posição vertical dentro da linha/slot que contém o horário atual (0 a 1). */
  fraction: number;
  /** Classe Tailwind de margem esquerda, pra a linha não cobrir a coluna do horário (ex.: "ml-20"). */
  offsetClassName?: string;
  className?: string;
}

/**
 * Linha "agora" (estilo Google Agenda): acompanha o horário atual dentro do
 * slot correspondente. É posicionada de forma absoluta pelo componente pai,
 * que precisa ter `position: relative` no slot/linha onde ela deve aparecer.
 */
export function CurrentTimeIndicator({ fraction, offsetClassName, className }: CurrentTimeIndicatorProps) {
  const clamped = Math.min(1, Math.max(0, fraction));
  return (
    <div
      className={cn('pointer-events-none absolute inset-x-0 z-10 flex items-center', offsetClassName, className)}
      style={{ top: `${clamped * 100}%` }}
      aria-hidden
    >
      <div className="-ml-1 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive shadow-sm" />
      <div className="h-[2px] flex-1 bg-destructive" />
    </div>
  );
}
