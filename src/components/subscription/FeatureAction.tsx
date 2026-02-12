import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FeatureActionProps {
  feature: string;
  children: ReactNode;
  /** Fallback quando bloqueado - se não fornecido, oculta o elemento */
  fallback?: ReactNode;
  /** Mensagem do tooltip quando bloqueado */
  lockedMessage?: string;
  /** Se true, mostra o elemento desabilitado ao invés de ocultar */
  showDisabled?: boolean;
}

/**
 * Wrapper para ações que devem respeitar o plano.
 * Pode ocultar o elemento, mostrar desabilitado ou exibir fallback.
 */
export function FeatureAction({ 
  feature, 
  children, 
  fallback,
  lockedMessage,
  showDisabled = false,
}: FeatureActionProps) {
  const { hasFeature, subscription } = useSubscription();
  const { isSuperAdmin } = useAuth();

  const canAccess = isSuperAdmin || hasFeature(feature);

  if (canAccess) {
    return <>{children}</>;
  }

  // Se tem fallback, usa ele
  if (fallback) {
    return <>{fallback}</>;
  }

  // Se deve mostrar desabilitado
  if (showDisabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="opacity-50 cursor-not-allowed pointer-events-none inline-flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {lockedMessage || 
              `Recurso não disponível no plano ${subscription?.plan?.name || 'atual'}`}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Por padrão, oculta o elemento
  return null;
}

/**
 * Hook para verificar acesso a uma feature de forma programática.
 * Útil para lógica condicional em handlers.
 */
export function useFeatureAccess(feature: string): {
  canAccess: boolean;
  planName: string | null;
} {
  const { hasFeature, subscription } = useSubscription();
  const { isSuperAdmin } = useAuth();

  return {
    canAccess: isSuperAdmin || hasFeature(feature),
    planName: subscription?.plan?.name || null,
  };
}
