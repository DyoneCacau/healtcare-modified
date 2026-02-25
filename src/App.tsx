import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { TrialExpiredScreen } from "@/components/subscription/TrialExpiredScreen";
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
import Billing from "./pages/Billing";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (needsActivation) {
    return <ContactAdminScreen />;
  }

  if (isBlocked) {
    return <TrialExpiredScreen />;
  }

  return <>{children}</>;
  // Onboarding desativado temporariamente - reative trocando por: <OnboardingGate>{children}</OnboardingGate>
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { hasCompletedOnboarding, isLoading } = useOnboarding();

  // Timeout de segurança: se carregar mais de 5s, deixa o usuário entrar (evita tela branca)
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (isLoading && !timedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasCompletedOnboarding && !timedOut) {
    return <OnboardingScreen />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacidade" element={<Privacy />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Dashboard - sempre disponível */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <Index />
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Pacientes */}
      <Route
        path="/pacientes"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="pacientes">
                <Patients />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Agenda */}
      <Route
        path="/agenda"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="agenda">
                <Agenda />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Financeiro */}
      <Route
        path="/financeiro"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="financeiro">
                <Financial />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Termos */}
      <Route
        path="/termos"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="termos">
                <Terms />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Relatórios */}
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="relatorios">
                <Reports />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Comissões */}
      <Route
        path="/comissoes"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="comissoes">
                <Commissions />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Estoque */}
      <Route
        path="/estoque"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="estoque">
                <Inventory />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Profissionais */}
      <Route
        path="/profissionais"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="profissionais">
                <Professionals />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Ponto */}
      <Route
        path="/ponto"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="ponto">
                <TimeClock />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Administração */}
      <Route
        path="/administracao"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <RequireFeature feature="administracao">
                <Administration />
              </RequireFeature>
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* SuperAdmin - sem verificação de feature */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute>
            <SuperAdmin />
          </ProtectedRoute>
        }
      />

      {/* Billing - Planos e Pagamentos */}
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <Billing />
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      {/* Minhas Clínicas: dentro de Administração (redireciona para a aba) */}
      <Route
        path="/minhas-clinicas"
        element={<Navigate to="/administracao?tab=clinics" replace />}
      />

      {/* Configurações - sempre disponível */}
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <SubscriptionGate>
              <Settings />
            </SubscriptionGate>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
