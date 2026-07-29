import { HelpCircle, Lightbulb } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FieldHelpLabelProps {
  htmlFor?: string;
  label: string;
  help: string;
  className?: string;
}

/** Label com ícone de ajuda e tooltip (linguagem simples). */
export function FieldHelpLabel({ htmlFor, label, help, className }: FieldHelpLabelProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ajuda: ${label}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
            {help}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

interface FieldHintProps {
  children: React.ReactNode;
  className?: string;
}

export function FieldHint({ children, className }: FieldHintProps) {
  return (
    <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>{children}</p>
  );
}

interface TipCalloutProps {
  children: React.ReactNode;
  badge?: string;
  className?: string;
}

/** Dica / recomendação em campos estratégicos. */
export function TipCallout({ children, badge, className }: TipCalloutProps) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
        className
      )}
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1.5 leading-relaxed">
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        <p>{children}</p>
      </div>
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn('space-y-3 rounded-lg border bg-card p-4', className)}>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
