// ============================================================================
// COMPONENTE: Criar Cliente Completo
// Arquivo: src/components/superadmin/CreateCompleteClient.tsx
// ============================================================================

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Building2 } from "lucide-react";

// Lista completa de módulos disponíveis
const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', description: 'Visão geral da clínica', always: true },
  { id: 'agenda', name: 'Agenda', description: 'Agendamento de consultas' },
  { id: 'pacientes', name: 'Pacientes', description: 'Cadastro e prontuários' },
  { id: 'profissionais', name: 'Profissionais', description: 'Gestão de profissionais' },
  { id: 'financeiro', name: 'Financeiro', description: 'Controle financeiro completo' },
  { id: 'comissoes', name: 'Comissões', description: 'Cálculo de comissões' },
  { id: 'estoque', name: 'Estoque', description: 'Controle de materiais' },
  { id: 'relatorios', name: 'Relatórios', description: 'Relatórios gerenciais' },
  { id: 'ponto', name: 'Ponto', description: 'Controle de ponto eletrônico' },
  { id: 'administracao', name: 'Administração', description: 'Gestão de usuários' },
  { id: 'termos', name: 'Termos', description: 'Criação de termos e contratos' },
];

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
  adminNotes: string;
}

export function CreateCompleteClient() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  
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
    modules: ['dashboard'], // Dashboard sempre incluído
    monthlyFee: 0,
    setupFee: 0,
    adminNotes: ""
  });

  // Carregar planos disponíveis
  useState(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .order('name');
    
    if (data) setPlans(data);
  }

  // Adicionar nova clínica
  function addClinic() {
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

  // Toggle módulo
  function toggleModule(moduleId: string) {
    setFormData(prev => {
      const isIncluded = prev.modules.includes(moduleId);
      
      // Dashboard sempre incluído
      if (moduleId === 'dashboard') return prev;
      
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

      // 2. Criar usuário Admin no Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: formData.adminEmail,
        password: formData.adminPassword,
        email_confirm: true,
        user_metadata: {
          name: formData.adminName,
          phone: formData.adminPhone
        }
      });

      if (authError) throw authError;

      if (!authUser.user) {
        throw new Error("Erro ao criar usuário");
      }

      // 3. Inserir registro em public.users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: formData.adminEmail,
          name: formData.adminName,
          role: 'admin',
          is_superadmin: false
        });

      if (userError) throw userError;

      // 4. Criar clínicas e assinaturas
      for (const clinic of formData.clinics) {
        // Criar clínica
        const { data: newClinic, error: clinicError } = await supabase
          .from('clinics')
          .insert({
            name: clinic.name,
            unit_name: clinic.unit_name || null,
            cnpj: clinic.cnpj,
            address: clinic.address || null,
            address_number: clinic.address_number || null,
            neighborhood: clinic.neighborhood || null,
            city: clinic.city || null,
            state: clinic.state || null,
            zip_code: clinic.zipcode || null,
            phone: clinic.phone || null,
            email: clinic.email || (clinic.name ? `${clinic.name.toLowerCase().replace(/\s/g, '')}@clinica.local` : 'contato@clinica.local')
          })
          .select()
          .single();

        if (clinicError) throw clinicError;

        // Vincular admin à clínica (is_owner = true para o dono/administrador)
        const { error: linkError } = await supabase
          .from('clinic_users')
          .insert({
            user_id: authUser.user.id,
            clinic_id: newClinic.id,
            is_owner: true
          });

        if (linkError) throw linkError;

        // Criar assinatura
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            clinic_id: newClinic.id,
            plan_id: formData.planId,
            status: 'pending', // Aguardando primeiro pagamento
            billing_status: 'pending',
            features_override: formData.modules,
            monthly_fee: formData.monthlyFee,
            setup_fee: formData.setupFee,
            admin_notes: formData.adminNotes
          });

        if (subError) throw subError;
      }

      // 5. Sucesso!
      toast.success(`Cliente criado com sucesso! ${formData.clinics.length} clínica(s) cadastrada(s).`);
      
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
        modules: ['dashboard'],
        monthlyFee: 0,
        setupFee: 0,
        adminNotes: ""
      });
      
      setOpen(false);

      // Opcional: Enviar email com credenciais
      // await sendWelcomeEmail(formData.adminEmail, formData.adminPassword);

    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      toast.error(error.message || "Erro ao criar cliente");
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="Senha123!"
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
                  onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Módulos Contratados</Label>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_MODULES.map(module => (
                    <label
                      key={module.id}
                      className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={formData.modules.includes(module.id)}
                        onCheckedChange={() => toggleModule(module.id)}
                        disabled={module.always}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{module.name}</div>
                        <div className="text-xs text-muted-foreground">{module.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setupFee">Taxa de Adesão (R$)</Label>
                  <Input
                    id="setupFee"
                    type="number"
                    step="0.01"
                    value={formData.setupFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, setupFee: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyFee">Mensalidade (R$)</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    step="0.01"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyFee: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
