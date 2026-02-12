import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, subscription } = useSubscription();
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // SuperAdmin sempre tem acesso
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Verificar se tem a feature
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Se não tem a feature, mostrar fallback ou bloqueio
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Funcionalidade Bloqueada</h2>
            <p className="text-muted-foreground text-sm">
              Esta funcionalidade não está disponível no seu plano atual
              {subscription?.plan?.name && ` (${subscription.plan.name})`}.
            </p>
          </div>

          <Button 
            onClick={() => navigate('/configuracoes')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Fazer Upgrade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
