import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSelectedClinicId } from './useSelectedClinicId';

interface Plan {
  id: string;
  name: string;
  slug: string;
  features: string[];
  max_clinics?: number | null;
}

interface Subscription {
  id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan: Plan | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  plan: Plan | null;
  isLoading: boolean;
  isTrialExpired: boolean;
  isBlocked: boolean;
  needsActivation: boolean; // clínica sem assinatura - contactar admin
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
  const { selectedClinicId } = useSelectedClinicId();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasClinic, setHasClinic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user || isSuperAdmin) {
      setIsLoading(false);
      return;
    }

    try {
      let clinicId: string | null = null;

      if (selectedClinicId) {
        const { data: cu } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('user_id', user.id)
          .eq('clinic_id', selectedClinicId)
          .maybeSingle();
        clinicId = cu?.clinic_id ?? null;
      }

      if (!clinicId) {
        const { data: clinicUser } = await supabase
          .from('clinic_users')
          .select('clinic_id')
          .eq('user_id', user.id)
          .order('is_owner', { ascending: false })
          .limit(1)
          .maybeSingle();
        clinicId = clinicUser?.clinic_id ?? null;
      }

      if (!clinicId) {
        setHasClinic(false);
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      setHasClinic(true);

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          trial_ends_at,
          current_period_end,
          plans (
            id,
            name,
            slug,
            features
          )
        `)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (subError) {
        console.error('[useSubscription] Erro ao buscar assinatura:', subError.message, 'code:', subError.code);
      }

      if (subData) {
        const plan = subData.plans as unknown as Plan | null;
        setSubscription({
          id: subData.id,
          status: subData.status,
          trial_ends_at: subData.trial_ends_at,
          current_period_end: subData.current_period_end ?? null,
          plan: plan ? {
            ...plan,
            features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features as unknown as string || '[]')
          } : null,
        });
      } else {
        setSubscription(null);
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
  }, [user, isSuperAdmin, selectedClinicId]);

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

  // Clínica sem assinatura: usuário vinculado a clínica mas sem registro em subscriptions
  const needsActivation = !isSuperAdmin && hasClinic && subscription === null;

  // Bloqueado: assinatura suspensa, bloqueada ou cancelada
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
        plan: subscription?.plan ?? null,
        isLoading,
        isTrialExpired,
        isBlocked,
        needsActivation,
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
