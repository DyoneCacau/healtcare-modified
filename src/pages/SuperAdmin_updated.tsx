import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClinicsManagement } from "@/components/superadmin/ClinicsManagement";
import { PlansManagement } from "@/components/superadmin/PlansManagement";
import { SubscriptionsManagement } from "@/components/superadmin/SubscriptionsManagement";
import { PaymentsManagement } from "@/components/superadmin/PaymentsManagement";
import { SuperAdminStats } from "@/components/superadmin/SuperAdminStats";
import { UpgradeRequestsManagement } from "@/components/superadmin/UpgradeRequestsManagement";
import { NotificationsManagement } from "@/components/superadmin/NotificationsManagement";
import { SupportManagement } from "@/components/superadmin/SupportManagement";
import { ContactRequestsManagement } from "@/components/superadmin/ContactRequestsManagement";
import { ClientsStatusDashboard } from "@/components/superadmin/ClientsStatusDashboard";
import { CreateCompleteClient } from "@/components/superadmin/CreateCompleteClient";
import { 
  Building2, 
  CreditCard, 
  Package, 
  Receipt, 
  LayoutDashboard, 
  TrendingUp, 
  Bell, 
  MessageSquare,
  UserPlus
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function SuperAdmin() {
  const { isSuperAdmin, isLoading } = useAuth();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingContactRequests, setPendingContactRequests] = useState(0);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPendingCount();
      fetchOpenTickets();
      fetchPendingContactRequests();

      // Real-time updates
      const channel = supabase
        .channel('superadmin-badges')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, fetchOpenTickets)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'upgrade_requests' }, fetchPendingCount)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_requests' }, fetchPendingContactRequests)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [isSuperAdmin]);

  async function fetchPendingCount() {
    const { count } = await supabase
      .from('upgrade_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingRequests(count || 0);
  }

  async function fetchOpenTickets() {
    const { count } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');
    setOpenTickets(count || 0);
  }

  async function fetchPendingContactRequests() {
    const { count } = await supabase
      .from('contact_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingContactRequests(count || 0);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel SuperAdmin</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie clínicas, planos e assinaturas da plataforma
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 relative">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Leads</span>
              {pendingRequests > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-1 -right-1">
                  {pendingRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contact-requests" className="flex items-center gap-2 relative">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Solicitações</span>
              {pendingContactRequests > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-1 -right-1">
                  {pendingContactRequests > 9 ? '9+' : pendingContactRequests}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clinics" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clínicas</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Assinaturas</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2 relative">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Suporte</span>
              {openTickets > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs absolute -top-1 -right-1">
                  {openTickets > 9 ? '9+' : openTickets}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gestão de Clientes</h2>
                <CreateCompleteClient />
              </div>
              <ClientsStatusDashboard />
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <UpgradeRequestsManagement />
          </TabsContent>

          <TabsContent value="contact-requests">
            <ContactRequestsManagement />
          </TabsContent>

          <TabsContent value="clinics">
            <ClinicsManagement />
          </TabsContent>

          <TabsContent value="plans">
            <PlansManagement />
          </TabsContent>

          <TabsContent value="subscriptions">
            <SubscriptionsManagement />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsManagement />
          </TabsContent>

          <TabsContent value="support">
            <SupportManagement />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
