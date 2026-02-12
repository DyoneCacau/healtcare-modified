import { ReactNode, forwardRef } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button, ButtonProps } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FeatureButtonProps extends ButtonProps {
  feature: string;
  children: ReactNode;
  /** Mensagem exibida quando a feature está bloqueada */
  lockedMessage?: string;
}

/**
 * Botão que verifica se o usuário tem acesso à feature.
 * Se não tiver, exibe o botão desabilitado com ícone de cadeado.
 * SuperAdmin sempre tem acesso.
 */
export const FeatureButton = forwardRef<HTMLButtonElement, FeatureButtonProps>(
  ({ feature, children, lockedMessage, className, disabled, ...props }, ref) => {
    const { hasFeature, subscription } = useSubscription();
    const { isSuperAdmin } = useAuth();

    const canAccess = isSuperAdmin || hasFeature(feature);

    if (!canAccess) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              {...props}
              disabled
              className={cn('opacity-60 cursor-not-allowed', className)}
            >
              <Lock className="mr-2 h-4 w-4" />
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {lockedMessage || 
                `Este recurso não está disponível no plano ${subscription?.plan?.name || 'atual'}`}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Button
        ref={ref}
        disabled={disabled}
        className={className}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

FeatureButton.displayName = 'FeatureButton';
