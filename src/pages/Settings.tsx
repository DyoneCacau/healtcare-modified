import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, CreditCard, Check, Loader2, Crown, Sparkles, Zap, MessageSquare, KeyRound, Send, ReceiptText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useSelectedClinicId } from '@/hooks/useSelectedClinicId';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupportTab } from '@/components/support/SupportTab';
import { parsePlanFeatures } from '@/lib/planFeatures';
import { BillingContent } from '@/pages/Billing';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSearchParams } from 'react-router-dom';

interface ClinicData {
  id: string;
  name: string;
  unit_name?: string | null;
  email: string;
  phone: string | null;
  cnpj: string | null;
  razao_social: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
}

interface PlanDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  features: string[];
  discount_pix_percent?: number | null;
  promo_price_monthly?: number | null;
  promo_active?: boolean | null;
  promo_label?: string | null;
}

const featureLabels: Record<string, string> = {
  agenda: 'Agenda de Consultas',
  pacientes: 'Gestão de Pacientes',
  pacientes_basico: 'Pacientes (Básico)',
  financeiro: 'Módulo Financeiro Completo',
  financeiro_basico: 'Financeiro Básico',
  relatorios: 'Relatórios Avançados',
  profissionais: 'Gestão de Profissionais',
  comissoes: 'Sistema de Comissões',
  estoque: 'Controle de Estoque',
  termos: 'Termos e Documentos',
  administracao: 'Administração',
  ponto: 'Controle de Ponto',
  multi_clinica: 'Multi-Clínicas',
};

const planIcons: Record<string, React.ReactNode> = {
  basico: <Zap className="h-5 w-5" />,
  profissional: <Sparkles className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@octupuzz.com.br';
const supportWhatsApp = (import.meta.env.VITE_SUPPORT_WHATSAPP || '5511999999999').replace(/\D/g, '');

export default function Settings() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { selectedClinicId } = useSelectedClinicId();
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsTab = searchParams.get('tab');
  const activeSettingsTab = ['subscription', 'billing', 'clinic', 'security', 'support'].includes(settingsTab || '')
    ? (settingsTab as string)
    : 'subscription';
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [availablePlans, setAvailablePlans] = useState<PlanDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit_name: '',
    email: '',
    phone: '',
    cnpj: '',
    razao_social: '',
    address: '',
    address_number: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user, selectedClinicId]);

  // Real-time listener: refresh plan data when subscription or plan changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('settings-subscription-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => { fetchData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plans' },
        () => { fetchData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get clinic_id: usar selectedClinicId se houver, senão primeira clínica do usuário
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
        setIsLoading(false);
        return;
      }

      // Fetch clinic data
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .maybeSingle();

      if (clinicData) {
        setClinic(clinicData as ClinicData);
        setFormData({
          name: clinicData.name || '',
          email: clinicData.email || '',
          phone: clinicData.phone || '',
          unit_name: (clinicData as any).unit_name || '',
          cnpj: clinicData.cnpj || '',
          razao_social: clinicData.razao_social || '',
          address: clinicData.address || '',
          address_number: (clinicData as any).address_number || '',
          neighborhood: (clinicData as any).neighborhood || '',
          city: clinicData.city || '',
          state: clinicData.state || '',
          zip_code: clinicData.zip_code || '',
        });
      }

      // Fetch subscription with plan details
      const { data: subData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (
            id,
            name,
            slug,
            description,
            price_monthly,
            features,
            discount_pix_percent,
            promo_price_monthly,
            promo_active,
            promo_label
          )
        `)
        .eq('clinic_id', clinicId)
        .maybeSingle();

      if (subData?.plans) {
        const planData = subData.plans as unknown as PlanDetails;
        setPlan({
          ...planData,
          features: parsePlanFeatures(planData.features),
        });
      }

      // Fetch available plans for upgrade
      const { data: plansData } = await supabase
        .from('plans')
        .select('id, name, slug, description, price_monthly, features, discount_pix_percent, promo_price_monthly, promo_active, promo_label')
        .eq('is_active', true)
        .neq('slug', 'trial')
        .order('price_monthly', { ascending: true });

      if (plansData) {
        setAvailablePlans(plansData.map((p) => ({
          ...p,
          features: parsePlanFeatures(p.features),
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const getBasePrice = (plan: PlanDetails) => {
    if (plan.promo_active && plan.promo_price_monthly) {
      return plan.promo_price_monthly;
    }
    return plan.price_monthly;
  };

  const fetchAddressByCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }
      setFormData(prev => ({
        ...prev,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      toast.success('Endereço preenchido automaticamente');
    } catch {
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleSave = async () => {
    if (!clinic) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          unit_name: formData.unit_name || null,
          cnpj: formData.cnpj || null,
          razao_social: formData.razao_social || null,
          address: formData.address || null,
          address_number: formData.address_number || null,
          neighborhood: formData.neighborhood || null,
          city: formData.city || null,
          state: formData.state || null,
          zip_code: formData.zip_code || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinic.id);

      if (error) throw error;

      toast.success('Dados atualizados com sucesso!');
      fetchData();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Erro ao salvar dados');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenUpgrade = (planToSelect?: PlanDetails) => {
    setSelectedPlan(planToSelect || null);
    setUpgradeNotes('');
    setIsUpgradeDialogOpen(true);
  };

  const handleSubmitUpgradeRequest = async () => {
    if (!user || !selectedPlan) return;
    setIsSubmittingUpgrade(true);

    try {
      if (!clinic) {
        toast.error('Clínica não encontrada');
        return;
      }

      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('id, plan_id')
        .eq('clinic_id', clinic.id)
        .maybeSingle();

      const { error } = await supabase.from('upgrade_requests').insert({
        clinic_id: clinic.id,
        subscription_id: subscriptionData?.id || null,
        requested_by: user.id,
        requested_plan_id: selectedPlan.id,
        current_plan_id: subscriptionData?.plan_id || null,
        notes: upgradeNotes || `Solicitação de upgrade para ${selectedPlan.name}`,
        status: 'pending',
      });

      if (error) throw error;

      await supabase.from('admin_notifications').insert({
        type: 'upgrade_request',
        title: 'Nova solicitação de upgrade',
        message: `Solicitação de upgrade para ${selectedPlan.name}`,
        reference_type: 'upgrade_request',
        reference_id: clinic.id,
      });

      toast.success('Solicitação enviada! Nossa equipe entrará em contato.');
      setIsUpgradeDialogOpen(false);
      setSelectedPlan(null);
      setUpgradeNotes('');
    } catch (error) {
      console.error('Error submitting upgrade request:', error);
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    switch (subscription.status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      case 'blocked':
        return <Badge variant="destructive">Bloqueado</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{subscription.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os dados da sua clínica e visualize informações do seu plano
          </p>
        </div>

        <Tabs
          value={activeSettingsTab}
          onValueChange={(v) => setSearchParams(v === 'subscription' ? {} : { tab: v })}
          className="space-y-6"
        >
          <TabsList className="h-auto w-full flex flex-wrap justify-start gap-1 sm:w-auto sm:inline-flex sm:flex-nowrap">
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span>Meu Plano</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <ReceiptText className="h-4 w-4 shrink-0" />
              <span>Minha Cobrança</span>
            </TabsTrigger>
            <TabsTrigger value="clinic" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Dados da Clínica</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0" />
              <span>Alterar senha</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span>Suporte</span>
            </TabsTrigger>
          </TabsList>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            {/* Current Plan Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center",
                      plan?.slug === 'premium' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                    )}>
                      {plan ? planIcons[plan.slug] || <CreditCard className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{plan?.name || 'Sem Plano'}</CardTitle>
                      {plan?.description && (
                        <CardDescription>{plan.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Info */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold mt-1 capitalize">
                      {subscription?.status === 'active' ? 'Ativo' : subscription?.status || '-'}
                    </p>
                  </div>

                  {subscription?.status === 'active' && (
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Próximo vencimento</p>
                      <p className="text-lg font-semibold mt-1">
                        {subscription.current_period_end
                          ? format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          : 'Não definido'}
                      </p>
                      {!subscription.current_period_end && (
                        <p className="text-xs text-muted-foreground mt-0.5">Entre em contato com nossa equipe comercial</p>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Valor Mensal</p>
                    <p className="text-lg font-semibold mt-1">
                      {plan
                        ? getBasePrice(plan) === 0
                          ? 'Sob consulta'
                          : `R$ ${getBasePrice(plan).toFixed(2).replace('.', ',')}`
                        : '-'
                      }
                    </p>
                    {plan?.promo_active && plan?.promo_price_monthly && plan.promo_price_monthly < plan.price_monthly && (
                      <p className="text-xs text-muted-foreground line-through">
                        R$ {plan.price_monthly.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Alterações de plano e módulos são feitas pela equipe comercial. Use o botão abaixo
                  para solicitar upgrade ou entre em contato:{' '}
                  <a href={`mailto:${supportEmail}`} className="text-primary hover:underline">{supportEmail}</a>
                </div>

                <Separator />

                {/* Features */}
                <div>
                  <h3 className="font-semibold mb-4">Funcionalidades Incluídas</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {plan?.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{featureLabels[feature] || feature}</span>
                      </div>
                    ))}
                    {(!plan?.features || plan.features.length === 0) && (
                      <p className="text-sm text-muted-foreground">Nenhuma funcionalidade disponível</p>
                    )}
                  </div>
                </div>

                {availablePlans.length > 0 && (
                  <div className="pt-4 flex flex-wrap gap-2">
                    <Button className="gap-2" onClick={() => handleOpenUpgrade()}>
                      <Sparkles className="h-4 w-4" />
                      Solicitar alteração de plano
                    </Button>
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={`https://wa.me/${supportWhatsApp}`} target="_blank" rel="noopener noreferrer">
                        Falar com comercial
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {availablePlans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Planos disponíveis</CardTitle>
                  <CardDescription>
                    Consulte os planos e envie uma solicitação. A liberação é feita manualmente pela equipe.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {availablePlans.map((p) => {
                      const basePrice = getBasePrice(p);
                      const isCurrentPlan = plan?.id === p.id;

                      return (
                      <div key={p.id} className="rounded-lg border p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center",
                            p.slug === 'premium' ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
                          )}>
                            {planIcons[p.slug] || <CreditCard className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {basePrice.toFixed(2).replace('.', ',')} / mês
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-1 text-sm">
                          {p.features.slice(0, 4).map((f) => (
                            <li key={f} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>{featureLabels[f] || f}</span>
                            </li>
                          ))}
                          {p.features.length > 4 && (
                            <li className="text-xs text-muted-foreground">+ {p.features.length - 4} recursos</li>
                          )}
                        </ul>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled={isCurrentPlan}
                          onClick={() => handleOpenUpgrade(p)}
                        >
                          {isCurrentPlan ? 'Plano atual' : `Solicitar ${p.name}`}
                        </Button>
                      </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <ErrorBoundary>
              <BillingContent />
            </ErrorBoundary>
          </TabsContent>

          {/* Clinic Data Tab */}
          <TabsContent value="clinic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dados da Clínica
                </CardTitle>
                <CardDescription>
                  Atualize as informações da sua clínica. As alterações são aplicadas nos termos, rodapé e documentos (atestados, recibos, etc.).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Clínica *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome da clínica"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_name">Unidade/Endereço (opcional)</Label>
                    <Input
                      id="unit_name"
                      value={formData.unit_name}
                      onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                      placeholder="Ex: litoral, 13 de maio, Conj. Ceara"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contato@clinica.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="razao_social">Razão Social</Label>
                    <Input
                      id="razao_social"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      placeholder="Razão social para recibos e documentos oficiais"
                    />
                    <p className="text-xs text-muted-foreground">Usado em recibos de pagamento e documentos oficiais</p>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <h3 className="font-semibold mb-4">Endereço</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">CEP</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9) })}
                        onBlur={(e) => {
                          const cep = e.target.value.replace(/\D/g, '');
                          if (cep.length === 8) fetchAddressByCep(cep);
                        }}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      <p className="text-xs text-muted-foreground">Informe o CEP para preencher rua, bairro e cidade automaticamente</p>
                    </div>
                    <div className="space-y-2" />
                    <div className="space-y-2">
                      <Label htmlFor="address">Rua / Logradouro</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Ex: Avenida Paulista"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address_number">Número</Label>
                      <Input
                        id="address_number"
                        value={formData.address_number}
                        onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                        placeholder="Ex: 1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Ex: Bela Vista"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado (UF)</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alterar senha */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Alterar senha
                </CardTitle>
                <CardDescription>
                  Defina uma nova senha para acessar o sistema. Use após primeiro acesso com senha temporária ou quando quiser trocar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    minLength={6}
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (newPassword.length < 6) {
                      toast.error('A senha deve ter no mínimo 6 caracteres.');
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      toast.error('As senhas não coincidem.');
                      return;
                    }
                    setIsChangingPassword(true);
                    try {
                      const { error } = await supabase.auth.updateUser({ password: newPassword });
                      if (error) throw error;
                      toast.success('Senha alterada com sucesso.');
                      setNewPassword('');
                      setConfirmPassword('');
                    } catch (err: any) {
                      toast.error(err?.message || 'Erro ao alterar senha.');
                    } finally {
                      setIsChangingPassword(false);
                    }
                  }}
                  disabled={isChangingPassword || !newPassword || !confirmPassword}
                  className="gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    'Alterar senha'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <SupportTab />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Solicitar alteração de plano
            </DialogTitle>
            <DialogDescription>
              Envie uma solicitação para nossa equipe comercial. A liberação é feita manualmente após análise.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano desejado</Label>
              <Select
                value={selectedPlan?.id || ''}
                onValueChange={(v) => {
                  const planFound = availablePlans.find((p) => p.id === v) || null;
                  setSelectedPlan(planFound);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — R$ {getBasePrice(p).toFixed(2).replace('.', ',')}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedPlan.name}</span>
                  <span className="font-semibold text-primary">
                    R$ {getBasePrice(selectedPlan).toFixed(2).replace('.', ',')}/mês
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPlan.features.length} funcionalidades incluídas
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={upgradeNotes}
                onChange={(e) => setUpgradeNotes(e.target.value)}
                placeholder="Ex: Preciso do módulo de estoque e relatórios."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitUpgradeRequest}
              disabled={!selectedPlan || isSubmittingUpgrade}
            >
              {isSubmittingUpgrade ? 'Enviando...' : 'Enviar solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
