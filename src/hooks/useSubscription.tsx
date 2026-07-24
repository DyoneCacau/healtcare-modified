import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSelectedClinicId } from './useSelectedClinicId';
import { parsePlanFeatures } from '@/lib/planFeatures';
import type { BillingMethod, BillingProvider } from '@/services/asaasBillingService';

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
  billing_provider: BillingProvider;
  billing_status: string | null;
  payment_method: BillingMethod | null;
  monthly_fee: number | null;
  billing_day: number | null;
  proration_days: number | null;
  proration_amount: number | null;
  next_due_date: string | null;
  grace_period_ends_at: string | null;
  hosted_payment_url: string | null;
  can_pay: boolean;
  can_regularize: boolean;
  can_cancel: boolean;
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
  '/contas-a-receber': 'contas_receber',
  '/comissoes': 'comissoes',
  '/estoque': 'estoque',
  '/procedimentos': 'procedimentos',
  '/crm': 'crm',
  '/relatorios': 'relatorios',
  '/ponto': 'ponto',
  '/atendimento': 'atendimento',
  '/administracao': 'administracao',
  '/termos': 'termos',
  '/configuracoes': 'configuracoes',
};

// Features que sempre estão disponíveis (não dependem do plano)
// Administração fica sempre liberada para o admin solicitar upgrade de módulos.
const ALWAYS_AVAILABLE = ['dashboard', 'configuracoes', 'administracao'];

// Features que equivalem a outras (ex.: versoes basicas liberam o modulo principal)
const FEATURE_ALIASES: Record<string, string[]> = {
  pacientes_basico: ['pacientes'],
  financeiro_basico: ['financeiro', 'contas_receber'],
  financeiro: ['contas_receber'],
};

// Lista completa de features do sistema para referência
export const ALL_FEATURES = [
  'dashboard',
  'agenda',
  'pacientes',
  'profissionais',
  'financeiro',
  'contas_receber',
  'comissoes',
  'estoque',
  'procedimentos',
  'crm',
  'relatorios',
  'ponto',
  'atendimento',
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

  const fetchSubscription = async (opts?: { silent?: boolean }) => {
    if (!user) {
      setSubscription(null);
      setHasClinic(false);
      setIsLoading(false);
      return;
    }

    if (isSuperAdmin) {
      setSubscription(null);
      setHasClinic(false);
      setIsLoading(false);
      return;
    }

    if (!opts?.silent) setIsLoading(true);

    try {
      let clinicId: string | null = null;
      let isClinicOwner = false;

      if (selectedClinicId) {
        const { data: cu, error: clinicAccessError } = await supabase
          .from('clinic_users')
          .select('clinic_id, is_owner')
          .eq('user_id', user.id)
          .eq('clinic_id', selectedClinicId)
          .maybeSingle();
        if (clinicAccessError) throw clinicAccessError;
        clinicId = cu?.clinic_id ?? null;
        isClinicOwner = cu?.is_owner === true;
      }

      if (!clinicId) {
        const { data: clinicUser, error: clinicUserError } = await supabase
          .from('clinic_users')
          .select('clinic_id, is_owner')
          .eq('user_id', user.id)
          .order('is_owner', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (clinicUserError) throw clinicUserError;
        clinicId = clinicUser?.clinic_id ?? null;
        isClinicOwner = clinicUser?.is_owner === true;
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
          billing_status,
          payment_status,
          payment_provider,
          billing_mode,
          payment_method,
          monthly_fee,
          billing_day,
          proration_days,
          proration_amount,
          asaas_next_due_date,
          asaas_subscription_id,
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
        throw subError;
      }

      if (subData) {
        const plan = subData.plans as unknown as Plan | null;
        const row = subData as typeof subData & {
          billing_mode?: string | null;
          asaas_subscription_id?: string | null;
        };
        const provider: BillingProvider =
          row.billing_mode === "asaas"
          || row.payment_provider === "asaas"
          || Boolean(row.asaas_subscription_id)
            ? "asaas"
            : "manual";
        const billingStatus = subData.billing_status ?? subData.payment_status ?? null;
        setSubscription({
          id: subData.id,
          status: subData.status,
          trial_ends_at: subData.trial_ends_at,
          current_period_end: subData.current_period_end ?? null,
          billing_provider: provider,
          billing_status: billingStatus,
          payment_method: subData.payment_method as BillingMethod | null,
          monthly_fee: subData.monthly_fee ?? null,
          billing_day: subData.billing_day ?? null,
          proration_days: subData.proration_days ?? null,
          proration_amount: subData.proration_amount ?? null,
          next_due_date: subData.asaas_next_due_date ?? subData.current_period_end ?? null,
          grace_period_ends_at: null,
          hosted_payment_url: null,
          can_pay: provider === 'asaas' && billingStatus !== 'paid',
          can_regularize: provider === 'asaas' && billingStatus === 'overdue',
          can_cancel: provider === 'asaas' && isClinicOwner && subData.status !== 'cancelled',
          plan: plan ? {
            ...plan,
            features: parsePlanFeatures(plan.features),
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
    await fetchSubscription({ silent: true });
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
        () => { void fetchSubscription({ silent: true }); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans' },
        () => { void fetchSubscription({ silent: true }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isSuperAdmin]);

  // Trial não é mais usado no modelo de vendas diretas
  const isTrialExpired = false;

  // Clínica sem assinatura: usuário vinculado a clínica mas sem registro em subscriptions
  const needsActivation = !isSuperAdmin && hasClinic && subscription === null;

  // Inadimplência tem tolerância de 7 dias antes do bloqueio.
  const dueDate = subscription?.next_due_date ?? subscription?.current_period_end;
  const fallbackGraceEnd = dueDate
    ? new Date(new Date(dueDate).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const graceEnd = subscription?.grace_period_ends_at
    ? new Date(subscription.grace_period_ends_at)
    : fallbackGraceEnd;
  const isWithinGracePeriod = Boolean(
    graceEnd && !Number.isNaN(graceEnd.getTime()) && Date.now() <= graceEnd.getTime(),
  );

  // Cancelamento/bloqueio explícito é imediato; suspensão por cobrança respeita a tolerância.
  const isBlocked = 
    !isSuperAdmin && 
    subscription !== null && 
    (subscription.status === 'blocked' ||
     subscription.status === 'cancelled' ||
     (subscription.status === 'suspended' && !isWithinGracePeriod));

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
