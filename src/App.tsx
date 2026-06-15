import React from "react";
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
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Patients from "./pages/Patients";
import Agenda from "./pages/Agenda";
import Financial from "./pages/Financial";
import Terms from "./pages/Terms";
import Reports from "./pages/Reports";
import Commissions from "./pages/Commissions";
import Inventory from "./pages/Inventory";
import Professionals from "./pages/Professionals";
import TimeClock from "./pages/TimeClock";
import Administration from "./pages/Administration";
import SuperAdmin from "./pages/SuperAdmin";
import Settings from "./pages/Settings";
// TODO(go-live): reativar módulo Atendimento omnichannel (Meta WhatsApp)
// import Atendimento from "./pages/Atendimento";
import Privacy from "./pages/Privacy";
import SelectClinic from "./pages/SelectClinic";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function SubscriptionGate({ children }: { children: React.ReactNode }) {
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

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { hasCompletedOnboarding, isLoading } = useOnboarding();

  // Timeout único por sessão — evita tela branca ao trocar de rota
  const [timedOut, setTimedOut] = React.useState(() => {
    try {
      return sessionStorage.getItem('healthcare_onboarding_gate_timeout') === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
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

/** Layout autenticado: gates montados uma vez; só a página interna troca ao navegar */
function AuthenticatedAppLayout() {
  return (
    <ProtectedRoute>
      <SubscriptionGate>
        <Outlet />
      </SubscriptionGate>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacidade" element={<Privacy />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<AuthenticatedAppLayout />}>
        <Route path="/" element={<Index />} />

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
          path="/ponto"
          element={
            <RequireFeature feature="ponto">
              <TimeClock />
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

        <Route
          path="/administracao"
          element={
            <RequireFeature feature="administracao">
              <Administration />
            </RequireFeature>
          }
        />

        <Route path="/billing" element={<Navigate to="/configuracoes" replace />} />

        <Route path="/selecionar-clinica" element={<SelectClinic />} />

        <Route path="/configuracoes" element={<Settings />} />
      </Route>

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
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
