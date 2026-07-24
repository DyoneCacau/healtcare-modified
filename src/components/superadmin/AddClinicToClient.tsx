// Adicionar Unidade a Cliente Existente - SuperAdmin
// Cada unidade gera assinatura própria e pode iniciar cobrança Asaas.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { asaasBillingService, type BillingProvider } from "@/services/asaasBillingService";
import {
  DEFAULT_BILLING_DAY,
  defaultPromoFirstDueDate,
} from "@/lib/billingDay";
import { BillingScheduleFields } from "@/components/superadmin/BillingScheduleFields";
import { Building2, Plus, CheckCircle } from "lucide-react";

interface ClinicFormData {
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

interface FoundAdmin {
  user_id: string;
  name: string;
  plan_name: string;
  monthly_fee: number;
  unit_count: number;
  max_clinics: number;
}

interface AddClinicUnitResult {
  clinic_id: string;
  subscription_id: string;
  organization_id: string;
  plan_name: string;
  monthly_fee: number;
  setup_fee: number;
  billing_provider: BillingProvider;
  unit_count: number;
  max_clinics: number;
}

const initialClinic: ClinicFormData = {
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
  email: "",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (isRecord(error) && error.context instanceof Response) {
    const payload: unknown = await error.context.clone().json().catch(() => null);
    if (isRecord(payload) && typeof payload.error === "string") return payload.error;
  }
  return "Não foi possível criar a unidade";
}

export function AddClinicToClient() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFound, setAdminFound] = useState<FoundAdmin | null>(null);
  const [setupFee, setSetupFee] = useState(0);
  const [billingDay, setBillingDay] = useState(DEFAULT_BILLING_DAY);
  const [scheduleFirstCharge, setScheduleFirstCharge] = useState(false);
  const [firstDueDate, setFirstDueDate] = useState(defaultPromoFirstDueDate());
  const [billingProvider, setBillingProvider] = useState<BillingProvider>("asaas");
  const [formData, setFormData] = useState<ClinicFormData>(initialClinic);

  async function searchAdmin() {
    if (!adminEmail?.trim()) {
      toast.error("Informe o e-mail do administrador");
      return;
    }
    setLoading(true);
    setAdminFound(null);
    try {
      const { data: profileRows } = await supabase.rpc("get_admin_by_email", {
        p_email: adminEmail.trim(),
      });
      const profile = Array.isArray(profileRows) && profileRows.length > 0
        ? profileRows[0] as { user_id: string; name?: string | null }
        : null;
      if (!profile) {
        toast.error("Nenhum administrador encontrado com este e-mail");
        return;
      }

      const { data: ownedClinics } = await supabase
        .from("clinics")
        .select("id")
        .eq("owner_user_id", profile.user_id);
      let clinicIds = (ownedClinics ?? []).map((clinic) => clinic.id);
      if (clinicIds.length === 0) {
        const { data: memberships } = await supabase
          .from("clinic_users")
          .select("clinic_id")
          .eq("user_id", profile.user_id)
          .eq("is_owner", true);
        clinicIds = (memberships ?? []).map((item) => item.clinic_id);
      }
      if (clinicIds.length === 0) {
        toast.error("Usuário encontrado, mas não é dono de nenhuma clínica.");
        return;
      }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id, monthly_fee, plans(name, price_monthly, promo_active, promo_price_monthly, max_clinics)")
        .in("clinic_id", clinicIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub?.plan_id) {
        toast.error("Cliente sem plano. Use Criar Cliente Completo.");
        return;
      }

      const plan = sub.plans as unknown as {
        name?: string;
        price_monthly?: number;
        promo_active?: boolean | null;
        promo_price_monthly?: number | null;
        max_clinics?: number | null;
      } | null;

      const monthlyFee = Number(
        plan?.promo_active && plan.promo_price_monthly != null
          ? plan.promo_price_monthly
          : plan?.price_monthly ?? sub.monthly_fee ?? 0,
      );

      setAdminFound({
        user_id: profile.user_id,
        name: profile.name || "Admin",
        plan_name: plan?.name || "Plano",
        monthly_fee: monthlyFee,
        unit_count: clinicIds.length,
        max_clinics: Number(plan?.max_clinics ?? 999),
      });
    } catch {
      toast.error("Erro ao buscar administrador");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminFound) {
      toast.error("Busque o administrador primeiro");
      return;
    }
    if (!formData.name || !formData.cnpj) {
      toast.error("Nome e CNPJ da clínica são obrigatórios");
      return;
    }
    if (
      Number.isFinite(adminFound.max_clinics)
      && adminFound.max_clinics > 0
      && adminFound.unit_count >= adminFound.max_clinics
    ) {
      toast.error(
        `Limite do plano atingido: ${adminFound.unit_count}/${adminFound.max_clinics} unidade(s)`,
      );
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<AddClinicUnitResult>(
        "add-clinic-unit",
        {
          body: {
            adminEmail: adminEmail.trim(),
            name: formData.name,
            unit_name: formData.unit_name || null,
            cnpj: formData.cnpj,
            address: formData.address || null,
            address_number: formData.address_number || null,
            neighborhood: formData.neighborhood || null,
            city: formData.city || null,
            state: formData.state || null,
            zipcode: formData.zipcode || null,
            phone: formData.phone || null,
            email: formData.email || null,
            setupFee,
            billingDay,
            billingDeferDays: 0,
            billingFirstDueDate: scheduleFirstCharge ? firstDueDate : null,
            billingProvider,
          },
        },
      );

      if (error) throw new Error(await getFunctionErrorMessage(error));
      if (!data?.subscription_id) throw new Error("Resposta inválida ao criar a unidade");

      let asaasFailed = false;
      if (billingProvider === "asaas") {
        try {
          await asaasBillingService.createCheckout(
            data.subscription_id,
            setupFee > 0,
            {
              billingDay,
              scheduleFirstCharge,
              firstDueDate: scheduleFirstCharge ? firstDueDate : null,
            },
          );
        } catch {
          asaasFailed = true;
        }
      }

      toast.success(
        `Unidade criada (${data.unit_count}/${data.max_clinics === 999 ? "∞" : data.max_clinics}). Mensalidade: R$ ${data.monthly_fee.toFixed(2)}.`,
      );
      if (asaasFailed) {
        toast.warning(
          "Unidade criada, mas a cobrança Asaas não iniciou. Ative depois em Assinaturas.",
          { duration: 12000 },
        );
      }

      setOpen(false);
      setFormData(initialClinic);
      setAdminFound(null);
      setAdminEmail("");
      setSetupFee(0);
      setBillingDay(DEFAULT_BILLING_DAY);
      setScheduleFirstCharge(false);
      setFirstDueDate(defaultPromoFirstDueDate());
      setBillingProvider("asaas");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar unidade");
    } finally {
      setLoading(false);
    }
  }

  const limitReached = Boolean(
    adminFound
    && Number.isFinite(adminFound.max_clinics)
    && adminFound.max_clinics > 0
    && adminFound.unit_count >= adminFound.max_clinics,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Unidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Adicionar Nova Unidade a Cliente Existente
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Cada unidade entra no mesmo grupo do dono, com assinatura e cobrança próprias
          (modelo por unidade). O limite de unidades vem do plano.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Identificar o Administrador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>E-mail do administrador *</Label>
                  <Input
                    type="email"
                    placeholder="admin@clinica.com"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      setAdminFound(null);
                    }}
                    disabled={!!adminFound}
                  />
                </div>
                <div className="pt-8">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={searchAdmin}
                    disabled={loading || !adminEmail.trim()}
                  >
                    {loading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
              {adminFound && (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">
                    Administrador encontrado: {adminFound.name}
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        Plano: {adminFound.plan_name} — R$ {adminFound.monthly_fee.toFixed(2)}/mês por unidade
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unidades atuais: {adminFound.unit_count}
                        {" / "}
                        {adminFound.max_clinics === 999 ? "∞" : adminFound.max_clinics}
                      </p>
                    </div>
                  </div>
                  {limitReached && (
                    <Badge variant="destructive">
                      Limite do plano atingido. Faça upgrade do plano para adicionar unidade.
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {adminFound && !limitReached && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Dados e cobrança da nova unidade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Clínica *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Clínica Unidade 2"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade/Endereço (opcional)</Label>
                    <Input
                      value={formData.unit_name}
                      onChange={(e) => setFormData((p) => ({ ...p, unit_name: e.target.value }))}
                      placeholder="Ex: litoral, 13 de maio"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CNPJ *</Label>
                    <Input
                      value={formData.cnpj}
                      onChange={(e) => setFormData((p) => ({ ...p, cnpj: e.target.value }))}
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modo de cobrança</Label>
                    <Select
                      value={billingProvider}
                      onValueChange={(value: BillingProvider) => setBillingProvider(value)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asaas">Asaas (por unidade)</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Taxa de adesão desta unidade (R$)</Label>
                    <CurrencyInput
                      value={setupFee}
                      onValueChange={setSetupFee}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensalidade do plano (R$)</Label>
                    <CurrencyInput
                      value={adminFound.monthly_fee}
                      onValueChange={() => {}}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                {billingProvider === "asaas" && (
                  <BillingScheduleFields
                    monthlyFee={adminFound.monthly_fee}
                    value={{
                      billingDay,
                      scheduleFirstCharge,
                      firstDueDate,
                    }}
                    onChange={(next) => {
                      setBillingDay(next.billingDay);
                      setScheduleFirstCharge(next.scheduleFirstCharge);
                      setFirstDueDate(next.firstDueDate);
                    }}
                  />
                )}
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={formData.zipcode}
                    onChange={(e) => setFormData((p) => ({
                      ...p,
                      zipcode: e.target.value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9),
                    }))}
                    onBlur={async () => {
                      const cep = formData.zipcode.replace(/\D/g, "");
                      if (cep.length === 8) {
                        try {
                          const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                          const data = await res.json();
                          if (!data.erro) {
                            setFormData((p) => ({
                              ...p,
                              address: data.logradouro || p.address,
                              neighborhood: data.bairro || p.neighborhood,
                              city: data.localidade || p.city,
                              state: data.uf || p.state,
                            }));
                            toast.success("Endereço preenchido automaticamente");
                          }
                        } catch {
                          // ignore
                        }
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
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={formData.address_number}
                      onChange={(e) => setFormData((p) => ({ ...p, address_number: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={formData.neighborhood}
                      onChange={(e) => setFormData((p) => ({ ...p, neighborhood: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData((p) => ({
                        ...p,
                        state: e.target.value.toUpperCase().slice(0, 2),
                      }))}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !adminFound || limitReached}>
              {loading ? "Criando..." : "Criar Unidade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
