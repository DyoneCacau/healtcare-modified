// Adicionar Unidade a Cliente Existente - SuperAdmin
// Nova unidade entra no contrato existente (sem nova cobranca)
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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

const initialClinic: ClinicFormData = {
  name: "", unit_name: "", cnpj: "", address: "", address_number: "", neighborhood: "", city: "", state: "", zipcode: "", phone: "", email: "",
};

export function AddClinicToClient() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFound, setAdminFound] = useState<{ user_id: string; name: string } | null>(null);
  const [existingPlan, setExistingPlan] = useState<{ plan_id: string; plan_name: string; monthly_fee: number; setup_fee: number; status: string } | null>(null);
  const [formData, setFormData] = useState<ClinicFormData>(initialClinic);

  async function searchAdmin() {
    if (!adminEmail?.trim()) { toast.error("Informe o e-mail do administrador"); return; }
    setLoading(true);
    setAdminFound(null);
    setExistingPlan(null);
    try {
      const { data: profileRows } = await supabase.rpc("get_admin_by_email", { p_email: adminEmail.trim() });
      const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : null;
      if (!profile) { toast.error("Nenhum administrador encontrado com este e-mail"); return; }
      const { data: cu } = await supabase.from("clinic_users").select("clinic_id").eq("user_id", profile.user_id).eq("is_owner", true).limit(1).maybeSingle();
      if (!cu) { toast.error("Usuario encontrado mas nao e dono de nenhuma clinica."); return; }
      setAdminFound({ user_id: profile.user_id, name: profile.name || "Admin" });
      const { data: sub } = await supabase.from("subscriptions").select("plan_id, status, monthly_fee, setup_fee, plans(name)").eq("clinic_id", cu.clinic_id).maybeSingle();
      if (sub) {
        setExistingPlan({
          plan_id: sub.plan_id || "",
          plan_name: (sub.plans as any)?.name || "Plano",
          monthly_fee: Number(sub.monthly_fee) || 0,
          setup_fee: Number(sub.setup_fee) || 0,
          status: sub.status || "active",
        });
      } else {
        setExistingPlan(null);
      }
    } catch (e) { toast.error("Erro ao buscar administrador"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminFound) { toast.error("Busque o administrador primeiro"); return; }
    if (!formData.name || !formData.cnpj) { toast.error("Nome e CNPJ da clinica sao obrigatorios"); return; }
    if (!existingPlan?.plan_id) { toast.error("Cliente nao possui assinatura ativa. Use Criar Cliente Completo para novo contrato."); return; }
    setLoading(true);
    try {
      const { data: newClinic, error: clinicError } = await supabase.from("clinics").insert({
        name: formData.name, unit_name: formData.unit_name || null, cnpj: formData.cnpj, address: formData.address || null, address_number: formData.address_number || null,
        neighborhood: formData.neighborhood || null, city: formData.city || null, state: formData.state || null,
        zip_code: formData.zipcode || null, phone: formData.phone || null,
        email: formData.email || "contato@clinica.local",
      }).select().single();
      if (clinicError) throw clinicError;
      const { error: linkError } = await supabase.from("clinic_users").insert({
        user_id: adminFound.user_id, clinic_id: newClinic.id, is_owner: true,
      });
      if (linkError) throw linkError;
      const { error: subError } = await supabase.from("subscriptions").insert({
        clinic_id: newClinic.id,
        plan_id: existingPlan.plan_id,
        status: existingPlan.status,
        billing_status: "paid",
        monthly_fee: existingPlan.monthly_fee,
        setup_fee: 0,
        admin_notes: "Nova unidade - incluida no contrato existente",
      } as any);
      if (subError) throw subError;
      toast.success("Nova unidade criada e vinculada. Plano ja incluido no contrato atual.");
      setOpen(false);
      setFormData(initialClinic);
      setAdminFound(null);
      setExistingPlan(null);
      setAdminEmail("");
    } catch (err: any) { toast.error(err.message || "Erro ao criar unidade"); }
    finally { setLoading(false); }
  }

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
          Use quando o cliente ja possui uma clinica e quer abrir uma nova unidade. A nova unidade entra no contrato atual (sem cobranca adicional). Para novo socio/contrato, use Criar Cliente Completo.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">1. Identificar o Administrador</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Label>E-mail do administrador *</Label>
                  <Input type="email" placeholder="admin@clinica.com" value={adminEmail}
                    onChange={(e) => { setAdminEmail(e.target.value); setAdminFound(null); }} disabled={!!adminFound} />
                </div>
                <div className="pt-8">
                  <Button type="button" variant="secondary" onClick={searchAdmin} disabled={loading || !adminEmail.trim()}>
                    {loading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
              {adminFound && (
                <div className="space-y-2">
                  <p className="text-sm text-green-600 font-medium">Administrador encontrado: {adminFound.name}</p>
                  {existingPlan && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Plano incluido no contrato: {existingPlan.plan_name}</p>
                        <p className="text-xs text-muted-foreground">Nova unidade sera ativada automaticamente (sem cobranca adicional)</p>
                      </div>
                    </div>
                  )}
                  {adminFound && !existingPlan && (
                    <Badge variant="destructive">Cliente sem assinatura ativa. Use Criar Cliente Completo.</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {adminFound && existingPlan && (
            <Card>
              <CardHeader><CardTitle className="text-base">2. Dados da Nova Unidade</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome da Clinica *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Clinica Unidade 2" required />
                  </div>
                  <div className="space-y-2"><Label>Unidade/Endereço (opcional)</Label>
                    <Input value={formData.unit_name} onChange={(e) => setFormData((p) => ({ ...p, unit_name: e.target.value }))} placeholder="Ex: litoral, 13 de maio, Conj. Ceara" />
                  </div>
                  <div className="space-y-2"><Label>CNPJ *</Label>
                    <Input value={formData.cnpj} onChange={(e) => setFormData((p) => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" required />
                  </div>
                </div>
                <div className="space-y-2"><Label>CEP</Label>
                  <Input value={formData.zipcode} onChange={(e) => setFormData((p) => ({ ...p, zipcode: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9) }))}
                    onBlur={async () => {
                      const cep = formData.zipcode.replace(/\D/g, '');
                      if (cep.length === 8) {
                        try {
                          const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                          const data = await res.json();
                          if (!data.erro) {
                            setFormData((p) => ({ ...p, address: data.logradouro || p.address, neighborhood: data.bairro || p.neighborhood, city: data.localidade || p.city, state: data.uf || p.state }));
                            toast.success("Endereco preenchido automaticamente");
                          }
                        } catch { /* ignore */ }
                      }
                    }}
                    placeholder="00000-000" maxLength={9} />
                  <p className="text-xs text-muted-foreground">Informe o CEP para preencher rua, bairro e cidade automaticamente</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Rua / Logradouro</Label><Input value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} placeholder="Av. Paulista" /></div>
                  <div className="space-y-2"><Label>Numero</Label><Input value={formData.address_number} onChange={(e) => setFormData((p) => ({ ...p, address_number: e.target.value }))} placeholder="1000" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Bairro</Label><Input value={formData.neighborhood} onChange={(e) => setFormData((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bela Vista" /></div>
                  <div className="space-y-2"><Label>Cidade</Label><Input value={formData.city} onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))} placeholder="Sao Paulo" /></div>
                  <div className="space-y-2"><Label>Estado</Label><Input value={formData.state} onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Telefone</Label><Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="(11) 3333-4444" /></div>
                  <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="contato@unidade2.com" /></div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || !adminFound || !existingPlan}>{loading ? "Criando..." : "Criar Unidade"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
