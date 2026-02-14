// Funções do sistema (roles) e labels para a aba Permissões
export const SYSTEM_ROLES = ['admin', 'receptionist', 'seller', 'professional'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ROLE_LABELS: Record<SystemRole, string> = {
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  seller: 'Vendedor',
  professional: 'Profissional',
};

// Módulos/telas do sistema que podem ter permissão granular
export const PERMISSION_FEATURES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'pacientes', label: 'Pacientes' },
  { id: 'profissionais', label: 'Profissionais' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'comissoes', label: 'Comissões' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'relatorios', label: 'Relatórios' },
  { id: 'ponto', label: 'Ponto' },
  { id: 'termos', label: 'Termos' },
  { id: 'administracao', label: 'Administração' },
  { id: 'configuracoes', label: 'Configurações' },
] as const;

export type PermissionFeatureId = (typeof PERMISSION_FEATURES)[number]['id'];

// Ações que podem ser permitidas ou negadas por tela
export const PERMISSION_ACTIONS = [
  { id: 'can_view', label: 'Ver', key: 'can_view' as const },
  { id: 'can_create', label: 'Criar', key: 'can_create' as const },
  { id: 'can_edit', label: 'Editar', key: 'can_edit' as const },
  { id: 'can_delete', label: 'Excluir', key: 'can_delete' as const },
] as const;

export type PermissionRow = {
  feature: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

// Valores padrão: admin tudo; recepcionista agenda+pacientes; vendedor comissões; profissional agenda+pacientes
export function getDefaultPermissionsForRole(role: SystemRole): PermissionRow[] {
  const allTrue = PERMISSION_FEATURES.map((f) => ({
    feature: f.id,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true,
  }));

  if (role === 'admin') return allTrue;

  const base = PERMISSION_FEATURES.map((f) => ({
    feature: f.id,
    can_view: ['agenda', 'pacientes', 'dashboard', 'configuracoes'].includes(f.id),
    can_create: false,
    can_edit: false,
    can_delete: false,
  }));

  if (role === 'receptionist') {
    return base.map((p) =>
      ['agenda', 'pacientes', 'dashboard', 'configuracoes'].includes(p.feature)
        ? { ...p, can_view: true, can_create: true, can_edit: true, can_delete: false }
        : p
    );
  }
  if (role === 'seller') {
    return base.map((p) =>
      ['comissoes', 'dashboard', 'configuracoes', 'pacientes'].includes(p.feature)
        ? { ...p, can_view: true, can_create: p.feature === 'comissoes', can_edit: true, can_delete: false }
        : p
    );
  }
  if (role === 'professional') {
    return base.map((p) =>
      ['agenda', 'pacientes', 'dashboard', 'configuracoes', 'ponto'].includes(p.feature)
        ? { ...p, can_view: true, can_create: true, can_edit: true, can_delete: false }
        : p
    );
  }
  return base;
}
