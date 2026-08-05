import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBlockedScreen } from "@/components/subscription/SubscriptionBlockedScreen";
import { ContactAdminScreen } from "@/components/subscription/ContactAdminScreen";
import { RequireFeature } from "@/components/subscription/RequireFeature";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { useOnboarding } from "@/hooks/useOnboarding";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { MainLayout } from "@/components/layout/MainLayout";

// Pós-login o sistema redireciona para /app — único eager para não inflar o bundle.
import Index from "./pages/Index";

const Landing = lazyWithRetry(() => import("./pages/Landing"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Patients = lazyWithRetry(() => import("./pages/Patients"));
const Agenda = lazyWithRetry(() => import("./pages/Agenda"));
const Professionals = lazyWithRetry(() => import("./pages/Professionals"));
const Procedures = lazyWithRetry(() => import("./pages/Procedures"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Financial = lazyWithRetry(() => import("./pages/Financial"));
const Receivables = lazyWithRetry(() => import("./pages/Receivables"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Commissions = lazyWithRetry(() => import("./pages/Commissions"));
const Inventory = lazyWithRetry(() => import("./pages/Inventory"));
const Crm = lazyWithRetry(() => import("./pages/Crm"));
const Integrations = lazyWithRetry(() => import("./pages/Integrations"));
const TimeClock = lazyWithRetry(() => import("./pages/TimeClock"));
const Administration = lazyWithRetry(() => import("./pages/Administration"));
const SuperAdmin = lazyWithRetry(() => import("./pages/SuperAdmin"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const SignDocument = lazyWithRetry(() => import("./pages/SignDocument"));
const SelectClinic = lazyWithRetry(() => import("./pages/SelectClinic"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Billing = lazyWithRetry(() => import("./pages/Billing"));

const SmartHubDashboard = lazyWithRetry(() => import("./pages/smart-hub/SmartHubDashboard"));
const SmartHubEditor = lazyWithRetry(() => import("./pages/smart-hub/SmartHubEditor"));
const SmartHubTemplates = lazyWithRetry(() => import("./pages/smart-hub/SmartHubTemplates"));
const SmartHubButtons = lazyWithRetry(() => import("./pages/smart-hub/SmartHubButtons"));
const SmartHubAnalytics = lazyWithRetry(() => import("./pages/smart-hub/SmartHubAnalytics"));
const SmartHubSettings = lazyWithRetry(() => import("./pages/smart-hub/SmartHubSettings"));
const SmartHubDomain = lazyWithRetry(() => import("./pages/smart-hub/SmartHubDomain"));
const SmartHubPreview = lazyWithRetry(() => import("./pages/smart-hub/SmartHubPreview"));
const PublicSmartHub = lazyWithRetry(() => import("./pages/smart-hub/PublicSmartHub"));
const MarketingCrm = lazyWithRetry(() =>
  import("./pages/marketing/MarketingPlaceholders").then((m) => ({ default: m.MarketingCrm }))
);
const MarketingCampaigns = lazyWithRetry(() =>
  import("./pages/marketing/MarketingPlaceholders").then((m) => ({ default: m.MarketingCampaigns }))
);
const MarketingLandingPages = lazyWithRetry(() =>
  import("./pages/marketing/MarketingPlaceholders").then((m) => ({ default: m.MarketingLandingPages }))
);
const MarketingAnalytics = lazyWithRetry(() =>
  import("./pages/marketing/MarketingPlaceholders").then((m) => ({ default: m.MarketingAnalytics }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita refetch em toda remontagem/navegação quando os dados ainda estão frescos.
      // Telas dinâmicas (ex.: caixa) podem sobrescrever com staleTime: 0.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

/** Loading só na área de conteúdo — Sidebar/header permanecem montados. */
function PageContentLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" aria-hidden="true" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function SubscriptionGate({ children }: { children: ReactNode }) {
  const { isBlocked, needsActivation, isLoading } = useSubscription();
  const { isSuperAdmin } = useAuth();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (needsActivation) {
    return <ContactAdminScreen />;
  }

  if (isBlocked) {
    return <SubscriptionBlockedScreen />;
  }

  return <OnboardingGate>{children}</OnboardingGate>;
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const { hasCompletedOnboarding, isLoading } = useOnboarding();

  // Timeout único por sessão — evita tela branca ao trocar de rota
  const [timedOut, setTimedOut] = useState(() => {
    try {
      return sessionStorage.getItem('healthcare_onboarding_gate_timeout') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (timedOut || hasCompletedOnboarding) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem('healthcare_onboarding_gate_timeout', 'true');
      } catch {
        // ignore
      }
      setTimedOut(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [timedOut, hasCompletedOnboarding]);

  if (hasCompletedOnboarding) {
    return <>{children}</>;
  }

  if (isLoading && !timedOut) {
    return <LoadingScreen />;
  }

  if (!hasCompletedOnboarding && !timedOut) {
    return <OnboardingScreen />;
  }

  return <>{children}</>;
}

/**
 * Gates autenticados sem MainLayout (evita duplicar ProtectedRoute/SubscriptionGate).
 * Usado por /selecionar-clinica e como pai do layout com Sidebar.
 */
function AuthenticatedGateLayout() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <Outlet />
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

/**
 * Páginas internas da clínica: MainLayout/Sidebar montados uma vez; só o Outlet troca.
 * Sem key no Suspense — chunk pós-deploy fica a cargo de lazyWithRetry + main.tsx.
 */
function AuthenticatedAppLayout() {
  return (
    <MainLayout>
      <Suspense fallback={<PageContentLoading />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
}

function PublicHome() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Landing />;
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageContentLoading />}>{children}</Suspense>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/privacidade" element={<Navigate to="/privacy" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/assinar/:token" element={<SignDocument />} />

      {/* Página pública do Smart Hub */}
      <Route
        path="/hub/:slug"
        element={
          <LazyPage>
            <PublicSmartHub />
          </LazyPage>
        }
      />

      <Route element={<AuthenticatedGateLayout />}>
        {/* Autenticada, sem Sidebar/MainLayout */}
        <Route path="/selecionar-clinica" element={<SelectClinic />} />

        <Route element={<AuthenticatedAppLayout />}>
        <Route path="/app" element={<Index />} />

        <Route
          path="/pacientes"
          element={
            <RequireFeature feature="pacientes">
              <Patients />
            </RequireFeature>
          }
        />

        <Route
          path="/agenda"
          element={
            <RequireFeature feature="agenda">
              <Agenda />
            </RequireFeature>
          }
        />

        <Route
          path="/financeiro"
          element={
            <RequireFeature feature="financeiro">
              <Financial />
            </RequireFeature>
          }
        />

        <Route
          path="/contas-a-receber"
          element={
            <RequireFeature feature="contas_receber">
              <Receivables />
            </RequireFeature>
          }
        />

        <Route
          path="/termos"
          element={
            <RequireFeature feature="termos">
              <Terms />
            </RequireFeature>
          }
        />

        <Route
          path="/relatorios"
          element={
            <RequireFeature feature="relatorios">
              <Reports />
            </RequireFeature>
          }
        />

        <Route
          path="/comissoes"
          element={
            <RequireFeature feature="comissoes">
              <Commissions />
            </RequireFeature>
          }
        />

        <Route
          path="/estoque"
          element={
            <RequireFeature feature="estoque">
              <Inventory />
            </RequireFeature>
          }
        />

        <Route
          path="/profissionais"
          element={
            <RequireFeature feature="profissionais">
              <Professionals />
            </RequireFeature>
          }
        />

        <Route
          path="/procedimentos"
          element={
            <RequireFeature feature="procedimentos">
              <Procedures />
            </RequireFeature>
          }
        />

        <Route
          path="/crm"
          element={
            <RequireFeature feature="crm">
              <Crm />
            </RequireFeature>
          }
        />

        <Route
          path="/ponto"
          element={
            <RequireFeature feature="ponto">
              <TimeClock />
            </RequireFeature>
          }
        />

        <Route
          path="/integracoes"
          element={
            <RequireFeature feature="integracoes">
              <Integrations />
            </RequireFeature>
          }
        />

        {/* TODO(go-live): Atendimento omnichannel — descomentar rota ao concluir integração Meta
        <Route
          path="/atendimento"
          element={
            <RequireFeature feature="atendimento">
              <Atendimento />
            </RequireFeature>
          }
        />
        */}

        {/* Marketing */}
        <Route
          path="/marketing/crm"
          element={
            <RequireFeature feature="marketing_crm">
              <LazyPage>
                <MarketingCrm />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/marketing/campanhas"
          element={
            <RequireFeature feature="marketing_campanhas">
              <LazyPage>
                <MarketingCampaigns />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/marketing/landing-pages"
          element={
            <RequireFeature feature="marketing_landing_pages">
              <LazyPage>
                <MarketingLandingPages />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/marketing/analytics"
          element={
            <RequireFeature feature="marketing_analytics">
              <LazyPage>
                <MarketingAnalytics />
              </LazyPage>
            </RequireFeature>
          }
        />

        {/* Smart Hub */}
        <Route
          path="/smart-hub"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubDashboard />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/previa"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubPreview />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/paginas"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubEditor />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/templates"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubTemplates />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/botoes"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubButtons />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/analytics"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubAnalytics />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/configuracoes"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubSettings />
              </LazyPage>
            </RequireFeature>
          }
        />
        <Route
          path="/smart-hub/dominio"
          element={
            <RequireFeature feature="smart_hub">
              <LazyPage>
                <SmartHubDomain />
              </LazyPage>
            </RequireFeature>
          }
        />

        <Route
          path="/administracao"
          element={
            <RequireFeature feature="administracao">
              <Administration />
            </RequireFeature>
          }
        />

        <Route path="/configuracoes" element={<Settings />} />
        </Route>
      </Route>

      {/* Cobrança permanece acessível mesmo quando a assinatura está bloqueada. */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        }
      />

      {/* SuperAdmin — fora dos gates de assinatura/onboarding */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute>
            <SuperAdmin />
          </ProtectedRoute>
        }
      />

      <Route path="/minhas-clinicas" element={<Navigate to="/administracao?tab=clinics" replace />} />

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <SubscriptionProvider>
            <AppRoutes />
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
