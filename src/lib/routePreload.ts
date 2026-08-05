/**
 * Prefetch de chunks lazy (hover/foco/idle).
 * /app (Dashboard) é eager — não precisa estar aqui.
 */
export const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  '/agenda': () => import('@/pages/Agenda'),
  '/pacientes': () => import('@/pages/Patients'),
  '/profissionais': () => import('@/pages/Professionals'),
  '/procedimentos': () => import('@/pages/Procedures'),
  '/configuracoes': () => import('@/pages/Settings'),
  '/financeiro': () => import('@/pages/Financial'),
  '/contas-a-receber': () => import('@/pages/Receivables'),
  '/comissoes': () => import('@/pages/Commissions'),
  '/relatorios': () => import('@/pages/Reports'),
  '/estoque': () => import('@/pages/Inventory'),
  '/crm': () => import('@/pages/Crm'),
  '/integracoes': () => import('@/pages/Integrations'),
  '/ponto': () => import('@/pages/TimeClock'),
  '/termos': () => import('@/pages/Terms'),
  '/administracao': () => import('@/pages/Administration'),
  '/billing': () => import('@/pages/Billing'),
  '/superadmin': () => import('@/pages/SuperAdmin'),
  '/smart-hub': () => import('@/pages/smart-hub/SmartHubDashboard'),
  '/smart-hub/previa': () => import('@/pages/smart-hub/SmartHubPreview'),
  '/smart-hub/paginas': () => import('@/pages/smart-hub/SmartHubEditor'),
  '/smart-hub/templates': () => import('@/pages/smart-hub/SmartHubTemplates'),
  '/smart-hub/botoes': () => import('@/pages/smart-hub/SmartHubButtons'),
  '/smart-hub/analytics': () => import('@/pages/smart-hub/SmartHubAnalytics'),
  '/smart-hub/configuracoes': () => import('@/pages/smart-hub/SmartHubSettings'),
  '/smart-hub/dominio': () => import('@/pages/smart-hub/SmartHubDomain'),
};

/** Rotas mais usadas — prefetch em idle após o layout autenticado montar. */
const IDLE_PRIORITY_ROUTES = [
  '/agenda',
  '/pacientes',
  '/crm',
  '/profissionais',
  '/procedimentos',
  '/financeiro',
] as const;

const warmed = new Set<string>();

/** Dispara o download do chunk da rota (idempotente, ignora erro de rede). */
export function preloadRoute(path: string): void {
  const normalized = path.split('?')[0].replace(/\/$/, '') || '/';
  if (warmed.has(normalized)) return;

  const loader =
    ROUTE_PRELOADERS[normalized] ||
    (normalized.startsWith('/smart-hub') ? ROUTE_PRELOADERS['/smart-hub'] : undefined);

  if (!loader) return;
  warmed.add(normalized);
  void loader().catch(() => {
    warmed.delete(normalized);
  });
}

let idleScheduled = false;

/** Prefetch das rotas do dia a dia quando o browser estiver ocioso. */
export function preloadPriorityRoutesWhenIdle(): void {
  if (idleScheduled || typeof window === 'undefined') return;
  idleScheduled = true;

  const run = () => {
    for (const path of IDLE_PRIORITY_ROUTES) {
      preloadRoute(path);
    }
  };

  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;

  if (typeof ric === 'function') {
    ric(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 1200);
  }
}
