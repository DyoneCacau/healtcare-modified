import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { FeatureBlockedScreen } from './FeatureBlockedScreen';

// Mapeamento de slugs para nomes amigáveis
export const FEATURE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  profissionais: 'Profissionais',
  financeiro: 'Caixa',
  contas_receber: 'Contas a receber',
  comissoes: 'Comissões',
  estoque: 'Estoque',
  procedimentos: 'Procedimentos',
  crm: 'CRM de Vendas',
  relatorios: 'Relatórios',
  ponto: 'Controle de Ponto',
  atendimento: 'Atendimento Omnichannel',
  integracoes: 'Integrações',
  administracao: 'Administração',
  termos: 'Termos e Documentos',
  configuracoes: 'Configurações',
  smart_hub: 'Smart Hub',
  marketing_crm: 'CRM',
  marketing_campanhas: 'Campanhas',
  marketing_landing_pages: 'Landing Pages',
  marketing_analytics: 'Analytics de Marketing',
};

interface RequireFeatureProps {
  feature: string;
  children: ReactNode;
}

/**
 * Componente de proteção de rotas por feature.
 * SuperAdmin sempre tem acesso.
 * Se a feature não estiver disponível no plano, exibe tela de bloqueio.
 */
export function RequireFeature({ feature, children }: RequireFeatureProps) {
  const { hasFeature, subscription, isLoading } = useSubscription();
  const { isSuperAdmin } = useAuth();

  // SuperAdmin sempre tem acesso
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Aguardar carregamento (só conteúdo — layout já está no AuthenticatedAppLayout)
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Verificar se tem a feature
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Não tem acesso - exibir tela de bloqueio
  return (
    <FeatureBlockedScreen 
      featureName={FEATURE_LABELS[feature] || feature}
      planName={subscription?.plan?.name || 'Atual'}
    />
  );
}
