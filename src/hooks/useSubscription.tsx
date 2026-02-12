import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isPast } from 'date-fns';

interface Plan {
  id: string;
  name: string;
  slug: string;
  features: string[];
}

interface Subscription {
  id: string;
  status: string;
  trial_ends_at: string | null;
  plan: Plan | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  isTrialExpired: boolean;
  isBlocked: boolean;
  allowedFeatures: string[];
  hasFeature: (feature: string) => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Mapeamento de rotas para features (slugs padronizados)
const ROUTE_FEATURE_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/agenda': 'agenda',
  '/pacientes': 'pacientes',
  '/profissionais': 'profissionais',
  '/financeiro': 'financeiro',
  '/comissoes': 'comissoes',
  '/estoque': 'estoque',
  '/relatorios': 'relatorios',
  '/ponto': 'ponto',
  '/administracao': 'administracao',
  '/termos': 'termos',
  '/configuracoes': 'configuracoes',
};

// Features que sempre estão disponíveis (não dependem do plano)
const ALWAYS_AVAILABLE = ['dashboard', 'configuracoes'];

// Features que equivalem a outras (ex.: versoes basicas liberam o modulo principal)
const FEATURE_ALIASES: Record<string, string[]> = {
  pacientes_basico: ['pacientes'],
  financeiro_basico: ['financeiro'],
};

// Lista completa de features do sistema para referência
export const ALL_FEATURES = [
  'dashboard',
  'agenda',
  'pacientes',
  'profissionais',
  'financeiro',
  'comissoes',
  'estoque',
  'relatorios',
  'ponto',
  'administracao',
  'termos',
  'configuracoes',
] as const;

export type Feature = typeof ALL_FEATURES[number];

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user || isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      // Buscar a clínica do usuário
      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clinicUser) {
        setIsLoading(false);
        return;
      }

      // Buscar assinatura da clínica
      const { data: subData } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          trial_ends_at,
          plans (
            id,
            name,
            slug,
            features
          )
        `)
        .eq('clinic_id', clinicUser.clinic_id)
        .maybeSingle();

      if (subData) {
        const plan = subData.plans as unknown as Plan | null;
        setSubscription({
          id: subData.id,
          status: subData.status,
          trial_ends_at: subData.trial_ends_at,
          plan: plan ? {
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as unknown as string || '[]')
          } : null,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  useEffect(() => {
    fetchSubscription();
  }, [user, isSuperAdmin]);

  // Real-time listener: auto-refresh when subscription or plan changes
  useEffect(() => {
    if (!user || isSuperAdmin) return;

    const channel = supabase
      .channel('subscription-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => { fetchSubscription(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans' },
        () => { fetchSubscription(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isSuperAdmin]);

  // Trial não é mais usado no modelo de vendas diretas
  const isTrialExpired = false;

  // Verificar se acesso está bloqueado (removido trial)
  const isBlocked = 
    !isSuperAdmin && 
    subscription !== null && 
    (subscription.status === 'suspended' || 
     subscription.status === 'blocked' ||
     subscription.status === 'cancelled');

  const expandFeatures = (features: string[]) => {
    const expanded = new Set<string>(features);
    features.forEach((feature) => {
      FEATURE_ALIASES[feature]?.forEach((alias) => expanded.add(alias));
    });
    return Array.from(expanded);
  };

  // Features permitidas baseadas no plano
  const allowedFeatures = isSuperAdmin 
    ? Object.values(ROUTE_FEATURE_MAP) 
    : [
        ...ALWAYS_AVAILABLE,
        ...expandFeatures(subscription?.plan?.features || []),
      ];

  const hasFeature = (feature: string): boolean => {
    if (isSuperAdmin) return true;
    if (ALWAYS_AVAILABLE.includes(feature)) return true;
    return allowedFeatures.includes(feature);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isTrialExpired,
        isBlocked,
        allowedFeatures,
        hasFeature,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

export { ROUTE_FEATURE_MAP };
