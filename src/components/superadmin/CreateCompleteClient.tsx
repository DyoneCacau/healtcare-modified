// ============================================================================
// COMPONENTE: Criar Cliente Completo
// Arquivo: src/components/superadmin/CreateCompleteClient.tsx
// ============================================================================

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Building2 } from "lucide-react";
import {
  asaasBillingService,
  type BillingProvider,
} from "@/services/asaasBillingService";
import { parsePlanFeatures } from "@/lib/planFeatures";
import {
  DEFAULT_BILLING_DAY,
  defaultPromoFirstDueDate,
} from "@/lib/billingDay";
import { BillingScheduleFields } from "@/components/superadmin/BillingScheduleFields";
import {
  CommercialChecklist,
  buildCommercialChecklistState,
} from "@/components/superadmin/CommercialChecklist";

// Lista completa de módulos disponíveis (chaves alinhadas com PlansManagement)
const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Visão geral da clínica', always: true },
  { id: 'agenda', name: 'Agenda', description: 'Agendamento de consultas' },
  { id: 'pacientes', name: 'Pacientes', description: 'Cadastro e prontuários' },
  { id: 'pacientes_basico', name: 'Pacientes (Básico)', description: 'Cadastro simplificado de pacientes' },
  { id: 'profissionais', name: 'Profissionais', description: 'Gestão de profissionais' },
  { id: 'procedimentos', name: 'Procedimentos', description: 'Catálogo de procedimentos e valores' },
  { id: 'crm', name: 'CRM de Vendas', description: 'Pipeline de leads, follow-up e conversão' },
  { id: 'financeiro', name: 'Caixa', description: 'Recebimentos do dia e fechamento de caixa' },
  { id: 'financeiro_basico', name: 'Caixa (Básico)', description: 'Controle de caixa simplificado' },
  { id: 'contas_receber', name: 'Contas a receber', description: 'Parcelas e cobranças futuras' },
  { id: 'comissoes', name: 'Comissões', description: 'Cálculo de comissões' },
  { id: 'estoque', name: 'Estoque', description: 'Controle de materiais' },
  { id: 'relatorios', name: 'Relatórios', description: 'Relatórios gerenciais' },
  { id: 'ponto', name: 'Ponto', description: 'Controle de ponto eletrônico' },
  {
    id: 'administracao',
    name: 'Administração',
    description: 'Usuários, permissões e solicitação de upgrade',
    always: true,
  },
  { id: 'termos', name: 'Termos', description: 'Criação de termos e contratos' },
  { id: 'multi_clinica', name: 'Multi-Clínica', description: 'Gestão de múltiplas unidades' },
];

const ALWAYS_INCLUDED_MODULES = AVAILABLE_MODULES.filter((m) => m.always).map((m) => m.id);

interface ClinicData {
  name: string;
  unit_name: string;
  cnpj: string;
  address: string;
  address_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  phone: string;
  email: string;
}

interface CreateClientData {
  // Dados do Admin
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone: string;
  
  // Clínicas
  clinics: ClinicData[];
  
  // Contrato
  planId: string;
  modules: string[];
  monthlyFee: number;
  setupFee: number;
  billingDay: number;
  scheduleFirstCharge: boolean;
  firstDueDate: string;
  adminNotes: string;
  billingProvider: BillingProvider;
}

interface PlanOption {
  id: string;
  name: string;
  price_monthly: number;
  promo_active: boolean | null;
  promo_price_monthly: number | null;
  features: string[];
}

function planMonthlyPrice(plan: PlanOption): number {
  return Number(
    plan.promo_active && plan.promo_price_monthly != null
      ? plan.promo_price_monthly
      : plan.price_monthly,
  );
}

/** Módulos do plano + módulos sempre inclusos (dashboard, administração) */
function modulesFromPlan(plan: PlanOption | undefined): string[] {
  const fromPlan = plan ? parsePlanFeatures(plan.features) : [];
  const knownIds = new Set(AVAILABLE_MODULES.map((m) => m.id));
  const selected = fromPlan.filter((id) => knownIds.has(id));
  ALWAYS_INCLUDED_MODULES.forEach((id) => {
    if (!selected.includes(id)) selected.unshift(id);
  });
  return Array.from(new Set(selected));
}

interface CreateCompleteClientResult {
  user_id: string;
  clinics: Array<{
    clinic_id: string;
    subscription_id: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (isRecord(error) && error.context instanceof Response) {
    const payload: unknown = await error.context.clone().json().catch(() => null);
    if (isRecord(payload) && typeof payload.error === "string") return payload.error;
  }
  return "Não foi possível criar o cliente";
}

export function CreateCompleteClient() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [clientNotified, setClientNotified] = useState(false);
  
  const [formData, setFormData] = useState<CreateClientData>({
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminPhone: "",
    clinics: [{
      name: "",
      unit_name: "",
      cnpj: "",
      address: "",
      address_number: "",
      neighborhood: "",
      city: "",
      state: "",
      zipcode: "",
      phone: "",
      email: ""
    }],
    planId: "",
    modules: [...ALWAYS_INCLUDED_MODULES], // Dashboard + Administração sempre
    monthlyFee: 0,
    setupFee: 0,
    billingDay: DEFAULT_BILLING_DAY,
    scheduleFirstCharge: false,
    firstDueDate: defaultPromoFirstDueDate(),
    adminNotes: "",
    billingProvider: "asaas",
  });

  const checklist = buildCommercialChecklistState({
    adminName: formData.adminName,
    adminEmail: formData.adminEmail,
    clinics: formData.clinics,
    planId: formData.planId,
    billingDay: formData.billingDay,
    billingProvider: formData.billingProvider,
    scheduleFirstCharge: formData.scheduleFirstCharge,
    firstDueDate: formData.firstDueDate,
    clientNotified,
  });

  // Carregar planos disponíveis
  useEffect(() => {
    void loadPlans();
  }, []);

  async function loadPlans() {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .neq('slug', 'trial')
      .order('name');
    
    if (data) {
      setPlans(
        data.map((plan) => ({
          ...plan,
          features: parsePlanFeatures(plan.features),
        })),
      );
    }
  }

  // Adicionar nova clínica
  function addClinic() {
    if (formData.clinics.length >= 20) {
      toast.error("É permitido cadastrar no máximo 20 clínicas");
      return;
    }
    setFormData(prev => ({
      ...prev,
      clinics: [...prev.clinics, {
        name: "",
        unit_name: "",
        cnpj: "",
        address: "",
        address_number: "",
        neighborhood: "",
        city: "",
        state: "",
        zipcode: "",
        phone: "",
        email: ""
      }]
    }));
  }

  // Remover clínica
  function removeClinic(index: number) {
    if (formData.clinics.length === 1) {
      toast.error("É necessário pelo menos uma clínica");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      clinics: prev.clinics.filter((_, i) => i !== index)
    }));
  }

  // Atualizar dados de clínica específica
  function updateClinic(index: number, field: keyof ClinicData, value: string) {
    setFormData(prev => ({
      ...prev,
      clinics: prev.clinics.map((clinic, i) => 
        i === index ? { ...clinic, [field]: value } : clinic
      )
    }));
  }

  function toggleModule(moduleId: string) {
    setFormData(prev => {
      if (ALWAYS_INCLUDED_MODULES.includes(moduleId)) return prev;

      const isIncluded = prev.modules.includes(moduleId);
      return {
        ...prev,
        modules: isIncluded
          ? prev.modules.filter(m => m !== moduleId)
          : [...prev.modules, moduleId]
      };
    });
  }

  // Criar cliente completo
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validações
      if (!formData.adminEmail || !formData.adminPassword) {
        throw new Error("Email e senha do admin são obrigatórios");
      }

      if (formData.clinics.some(c => !c.name || !c.cnpj)) {
        throw new Error("Todas as clínicas precisam ter nome e CNPJ");
      }

      if (!formData.planId) {
        throw new Error("Selecione um plano");
      }

      if (formData.modules.length === 0) {
        throw new Error("Selecione pelo menos um módulo");
      }

      if (!clientNotified) {
        throw new Error("Confirme no checklist que o cliente foi avisado sobre login e Minha Cobrança");
      }

      // A Edge Function valida o superadmin e executa toda a criação com service role.
      const { data, error } = await supabase.functions.invoke<CreateCompleteClientResult | { error?: string }>(
        "create-complete-client",
        {
          body: {
            adminName: formData.adminName,
            adminEmail: formData.adminEmail,
            adminPassword: formData.adminPassword,
            adminPhone: formData.adminPhone,
            clinics: formData.clinics,
            planId: formData.planId,
            modules: formData.modules,
            monthlyFee: formData.monthlyFee,
            setupFee: formData.setupFee,
            billingDay: formData.billingDay,
            billingDeferDays: 0,
            billingFirstDueDate: formData.scheduleFirstCharge ? formData.firstDueDate : null,
            adminNotes: formData.adminNotes,
          },
        },
      );

      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (isRecord(data) && typeof data.error === "string") {
        throw new Error(data.error);
      }
      if (!data || !("clinics" in data) || !Array.isArray(data.clinics)) {
        throw new Error("Resposta inválida ao criar o cliente");
      }

      let failedCheckouts = 0;
      if (formData.billingProvider === "asaas") {
        const checkoutResults = await Promise.allSettled(
          data.clinics.map(({ subscription_id }) =>
            asaasBillingService.createCheckout(
              subscription_id,
              formData.setupFee > 0,
              {
                billingDay: formData.billingDay,
                scheduleFirstCharge: formData.scheduleFirstCharge,
                firstDueDate: formData.scheduleFirstCharge ? formData.firstDueDate : null,
              },
            )
          ),
        );
        failedCheckouts = checkoutResults.filter(result => result.status === "rejected").length;
      }

      toast.success(`Cliente criado com sucesso! ${formData.clinics.length} clínica(s) cadastrada(s).`);
      if (failedCheckouts > 0) {
        toast.warning(
          `Cliente mantido pendente: não foi possível iniciar a cobrança Asaas de ${failedCheckouts} assinatura(s). Você pode ativá-la depois em Gestão de Assinaturas.`,
          { duration: 12000 },
        );
      }
      
      // Resetar formulário
      setFormData({
        adminName: "",
        adminEmail: "",
        adminPassword: "",
        adminPhone: "",
        clinics: [{
          name: "",
          unit_name: "",
          cnpj: "",
          address: "",
          address_number: "",
          neighborhood: "",
          city: "",
          state: "",
          zipcode: "",
          phone: "",
          email: ""
        }],
        planId: "",
        modules: [...ALWAYS_INCLUDED_MODULES],
        monthlyFee: 0,
        setupFee: 0,
        billingDay: DEFAULT_BILLING_DAY,
        scheduleFirstCharge: false,
        firstDueDate: defaultPromoFirstDueDate(),
        adminNotes: "",
        billingProvider: "asaas",
      });
      setClientNotified(false);
      
      setOpen(false);

      // Opcional: Enviar email com credenciais
      // await sendWelcomeEmail(formData.adminEmail, formData.adminPassword);

    } catch (error: unknown) {
      console.error("Erro ao criar cliente:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Cliente Completo</DialogTitle>
          <DialogDescription>
            Venda assistida: defina plano, vencimento e início da cobrança. O cliente escolhe PIX, boleto ou cartão no Asaas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <CommercialChecklist
            state={checklist}
            onClientNotifiedChange={setClientNotified}
          />

          {/* SEÇÃO 1: DADOS DO ADMINISTRADOR */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Dados do Administrador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nome Completo *</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminName: e.target.value }))}
                    placeholder="Dr. João Silva"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPhone">Telefone</Label>
                  <Input
                    id="adminPhone"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminPhone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                    placeholder="admin@clinica.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Senha Temporária *</Label>
                  <Input
                    id="adminPassword"
                    type="text"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                    placeholder="Mínimo de 12 caracteres"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEÇÃO 2: CLÍNICAS */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">2. Clínicas</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addClinic}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Clínica
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.clinics.map((clinic, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Clínica {index + 1}</span>
                    </div>
                    {formData.clinics.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClinic(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da Clínica *</Label>
                      <Input
                        value={clinic.name}
                        onChange={(e) => updateClinic(index, 'name', e.target.value)}
                        placeholder="Clínica Odonto Sorriso"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unidade/Endereço (opcional)</Label>
                      <Input
                        value={clinic.unit_name}
                        onChange={(e) => updateClinic(index, 'unit_name', e.target.value)}
                        placeholder="Ex: litoral, 13 de maio, Conj. Ceara"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ *</Label>
                      <Input
                        value={clinic.cnpj}
                        onChange={(e) => updateClinic(index, 'cnpj', e.target.value)}
                        placeholder="00.000.000/0000-00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={clinic.zipcode}
                      onChange={(e) => updateClinic(index, 'zipcode', e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                      onBlur={async () => {
                        const cep = clinic.zipcode.replace(/\D/g, '');
                        if (cep.length === 8) {
                          try {
                            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                            const data = await res.json();
                            if (!data.erro) {
                              setFormData(prev => ({
                                ...prev,
                                clinics: prev.clinics.map((c, i) =>
                                  i === index
                                    ? {
                                        ...c,
                                        address: data.logradouro || c.address,
                                        neighborhood: data.bairro || c.neighborhood,
                                        city: data.localidade || c.city,
                                        state: data.uf || c.state,
                                      }
                                    : c
                                ),
                              }));
                              toast.success('Endereço preenchido');
                            }
                          } catch { /* ignore */ }
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rua / Logradouro</Label>
                      <Input
                        value={clinic.address}
                        onChange={(e) => updateClinic(index, 'address', e.target.value)}
                        placeholder="Av. Paulista"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={clinic.address_number}
                        onChange={(e) => updateClinic(index, 'address_number', e.target.value)}
                        placeholder="1000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={clinic.neighborhood}
                        onChange={(e) => updateClinic(index, 'neighborhood', e.target.value)}
                        placeholder="Bela Vista"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={clinic.city}
                        onChange={(e) => updateClinic(index, 'city', e.target.value)}
                        placeholder="São Paulo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input
                        value={clinic.state}
                        onChange={(e) => updateClinic(index, 'state', e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={clinic.phone}
                        onChange={(e) => updateClinic(index, 'phone', e.target.value)}
                        placeholder="(11) 3333-4444"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={clinic.email}
                        onChange={(e) => updateClinic(index, 'email', e.target.value)}
                        placeholder="contato@clinica.com"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* SEÇÃO 3: PLANO E MÓDULOS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Plano e Módulos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planId">Plano Base *</Label>
                <Select
                  value={formData.planId}
                  onValueChange={(value) => {
                    const plan = plans.find((item) => item.id === value);
                    setFormData(prev => ({
                      ...prev,
                      planId: value,
                      monthlyFee: plan ? planMonthlyPrice(plan) : 0,
                      modules: modulesFromPlan(plan),
                    }));
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — R$ {planMonthlyPrice(plan).toFixed(2)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Módulos Contratados</Label>
                  <p className="text-xs text-muted-foreground">
                    Preenchidos automaticamente pelo plano. Dashboard e Administração são fixos
                    (Administração é onde o admin solicita upgrade).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_MODULES.map(module => (
                    <label
                      key={module.id}
                      className={`flex items-start gap-2 p-3 border rounded-lg ${
                        module.always ? 'cursor-default bg-muted/40' : 'cursor-pointer hover:bg-accent/50'
                      }`}
                    >
                      <Checkbox
                        checked={formData.modules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                        disabled={module.always}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {module.name}
                          {module.always ? ' *' : ''}
                        </div>
                        <div className="text-xs text-muted-foreground">{module.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modo de cobrança</Label>
                  <Select
                    value={formData.billingProvider}
                    onValueChange={(value: BillingProvider) => setFormData(prev => ({ ...prev, billingProvider: value }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="asaas">Asaas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.billingProvider === "asaas" && (
                  <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                    O cliente escolherá PIX, boleto ou cartão diretamente na página hospedada do Asaas.
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Dados de cartão nunca são solicitados nesta tela; o cliente usa o ambiente hospedado do Asaas.
              </p>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setupFee">Taxa de Adesão (R$)</Label>
                  <CurrencyInput
                    id="setupFee"
                    value={formData.setupFee}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, setupFee: v }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyFee">Mensalidade do plano (R$)</Label>
                  <CurrencyInput
                    id="monthlyFee"
                    value={formData.monthlyFee}
                    onValueChange={() => {}}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>

              {formData.billingProvider === "asaas" && (
                <BillingScheduleFields
                  monthlyFee={formData.monthlyFee}
                  value={{
                    billingDay: formData.billingDay,
                    scheduleFirstCharge: formData.scheduleFirstCharge,
                    firstDueDate: formData.firstDueDate,
                  }}
                  onChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingDay: next.billingDay,
                      scheduleFirstCharge: next.scheduleFirstCharge,
                      firstDueDate: next.firstDueDate,
                    }))
                  }
                />
              )}

              <div className="space-y-2">
                <Label htmlFor="adminNotes">Notas Administrativas (uso interno)</Label>
                <textarea
                  id="adminNotes"
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                  value={formData.adminNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                  placeholder="Observações sobre o cliente, condições especiais, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !clientNotified}>
              {loading ? "Criando..." : "Criar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
