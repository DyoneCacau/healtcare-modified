import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MoreHorizontal, Search, Building2, Mail, Phone, Key, Power, PowerOff, Eye, EyeOff, Pencil } from "lucide-react";
import { ClinicDisplayName } from "@/components/common/ClinicDisplayName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Clinic {
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
  is_active: boolean;
  created_at: string;
  owner_user_id: string | null;
}

interface ClinicWithSubscription extends Clinic {
  subscription?: {
    status: string;
    plan_name: string;
    trial_ends_at: string | null;
  };
}

export function ClinicsManagement() {
  const [clinics, setClinics] = useState<ClinicWithSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicWithSubscription | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", unit_name: "", cnpj: "", email: "", phone: "", razao_social: "",
    address: "", address_number: "", neighborhood: "", city: "", state: "", zip_code: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchClinics();
  }, []);

  async function fetchClinics() {
    try {
      const { data: clinicsData, error: clinicsError } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });

      if (clinicsError) throw clinicsError;

      // Fetch subscriptions for each clinic
      const clinicsWithSubs: ClinicWithSubscription[] = [];
      
      for (const clinic of clinicsData || []) {
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('status, trial_ends_at, plans(name)')
          .eq('clinic_id', clinic.id)
          .maybeSingle();

        clinicsWithSubs.push({
          ...clinic,
          subscription: subData ? {
            status: subData.status,
            plan_name: (subData.plans as any)?.name || 'Sem plano',
            trial_ends_at: subData.trial_ends_at,
          } : undefined,
        });
      }

      setClinics(clinicsWithSubs);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      toast.error('Erro ao carregar clínicas');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleClinicStatus(clinic: ClinicWithSubscription) {
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ is_active: !clinic.is_active })
        .eq('id', clinic.id);

      if (error) throw error;

      toast.success(clinic.is_active ? 'Clínica desativada' : 'Clínica ativada');
      fetchClinics();
    } catch (error) {
      console.error('Error toggling clinic status:', error);
      toast.error('Erro ao alterar status');
    }
  }

  const filteredClinics = clinics.filter(clinic =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (clinic.unit_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    clinic.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clinic.cnpj?.includes(searchTerm)
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      case 'expired':
        return <Badge variant="outline">Expirado</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Gestão de Clínicas
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Para cadastrar novo cliente, use <strong>Criar Cliente Completo</strong> na aba Dashboard. Para adicionar uma nova unidade a um cliente existente, use <strong>Adicionar Unidade</strong>.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clínica</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClinics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma clínica encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredClinics.map((clinic) => (
                  <TableRow key={clinic.id} className={!clinic.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium"><ClinicDisplayName clinic={clinic} /></p>
                        {clinic.cnpj && (
                          <p className="text-sm text-muted-foreground">{clinic.cnpj}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" /> {clinic.email}
                        </span>
                        {clinic.phone && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" /> {clinic.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(clinic.subscription?.status)}
                        {!clinic.is_active && (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            Desativada
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{clinic.subscription?.plan_name || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(clinic.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClinic(clinic);
                              setEditForm({
                                name: clinic.name,
                                unit_name: clinic.unit_name || "",
                                cnpj: clinic.cnpj || "",
                                email: clinic.email || "",
                                phone: clinic.phone || "",
                                razao_social: (clinic as any).razao_social || "",
                                address: clinic.address || "",
                                address_number: (clinic as any).address_number || "",
                                neighborhood: (clinic as any).neighborhood || "",
                                city: clinic.city || "",
                                state: clinic.state || "",
                                zip_code: (clinic as any).zip_code || "",
                              });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleClinicStatus(clinic)}>
                            {clinic.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedClinic(clinic);
                              setIsResetPasswordDialogOpen(true);
                            }}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Resetar Senha
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Clinic Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) setSelectedClinic(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Editar dados da clínica</DialogTitle>
            <DialogDescription>
              As alterações são aplicadas imediatamente para o cliente e aparecem nos termos, rodapé e documentos. O cliente admin também pode alterar em Configurações &gt; Dados da Clínica.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="py-4 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome da clínica *</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Clínica Sorrindo Unidade Norte"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">Unidade/Endereço (opcional)</Label>
                  <Input
                    id="edit-unit"
                    value={editForm.unit_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, unit_name: e.target.value }))}
                    placeholder="Ex: litoral, 13 de maio, Conj. Ceara"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cnpj">CNPJ</Label>
                  <Input
                    id="edit-cnpj"
                    value={editForm.cnpj}
                    onChange={(e) => setEditForm((p) => ({ ...p, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">E-mail *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="contato@clinica.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="edit-razao">Razão Social</Label>
                  <Input
                    id="edit-razao"
                    value={editForm.razao_social}
                    onChange={(e) => setEditForm((p) => ({ ...p, razao_social: e.target.value }))}
                    placeholder="Para recibos e documentos oficiais"
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Endereço</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>CEP</Label>
                    <Input
                      value={editForm.zip_code}
                      onChange={(e) => setEditForm((p) => ({ ...p, zip_code: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9) }))}
                      onBlur={async () => {
                        const cep = editForm.zip_code.replace(/\D/g, '');
                        if (cep.length === 8) {
                          try {
                            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                            const data = await res.json();
                            if (!data.erro) {
                              setEditForm((p) => ({
                                ...p,
                                address: data.logradouro || p.address,
                                neighborhood: data.bairro || p.neighborhood,
                                city: data.localidade || p.city,
                                state: data.uf || p.state,
                              }));
                              toast.success("Endereço preenchido");
                            }
                          } catch { /* ignore */ }
                        }
                      }}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div className="space-y-2" />
                  <div className="space-y-2">
                    <Label>Rua / Logradouro</Label>
                    <Input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} placeholder="Av. Paulista" />
                  </div>
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input value={editForm.address_number} onChange={(e) => setEditForm((p) => ({ ...p, address_number: e.target.value }))} placeholder="1000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input value={editForm.neighborhood} onChange={(e) => setEditForm((p) => ({ ...p, neighborhood: e.target.value }))} placeholder="Bela Vista" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={editForm.city} onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))} placeholder="São Paulo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input value={editForm.state} onChange={(e) => setEditForm((p) => ({ ...p, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" maxLength={2} />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!selectedClinic) return;
                if (!editForm.name.trim()) {
                  toast.error("Nome é obrigatório");
                  return;
                }
                if (!editForm.email.trim()) {
                  toast.error("E-mail é obrigatório");
                  return;
                }
                setIsSaving(true);
                try {
                  const { error } = await supabase
                    .from("clinics")
                    .update({
                      name: editForm.name.trim(),
                      unit_name: editForm.unit_name.trim() || null,
                      cnpj: editForm.cnpj.trim() || null,
                      email: editForm.email.trim(),
                      phone: editForm.phone.trim() || null,
                      razao_social: editForm.razao_social.trim() || null,
                      address: editForm.address.trim() || null,
                      address_number: editForm.address_number.trim() || null,
                      neighborhood: editForm.neighborhood.trim() || null,
                      city: editForm.city.trim() || null,
                      state: editForm.state.trim() || null,
                      zip_code: editForm.zip_code.trim() || null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", selectedClinic.id);

                  if (error) throw error;

                  toast.success("Clínica atualizada! As alterações já aparecem para o cliente e nos termos/documentos.");
                  setIsEditDialogOpen(false);
                  fetchClinics();
                } catch (error: any) {
                  toast.error(error.message || "Erro ao atualizar");
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => {
        setIsResetPasswordDialogOpen(open);
        if (!open) {
          setNewPassword("");
          setShowPassword(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha do Proprietário</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para o proprietário da clínica.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Clínica: <strong>{selectedClinic?.name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                E-mail: <strong>{selectedClinic?.email}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedClinic?.owner_user_id) {
                  toast.error('Esta clínica não tem um proprietário definido');
                  return;
                }
                if (!newPassword || newPassword.length < 6) {
                  toast.error('A senha deve ter pelo menos 6 caracteres');
                  return;
                }
                
                setIsResetting(true);
                try {
                  const { data, error } = await supabase.functions.invoke('reset-user-password', {
                    body: {
                      user_id: selectedClinic.owner_user_id,
                      new_password: newPassword,
                    }
                  });

                  if (error) throw error;

                  toast.success('Senha resetada com sucesso!');
                  setIsResetPasswordDialogOpen(false);
                  setNewPassword("");
                } catch (error: any) {
                  console.error('Error resetting password:', error);
                  toast.error(error.message || 'Erro ao resetar senha');
                } finally {
                  setIsResetting(false);
                }
              }}
              disabled={isResetting || !newPassword}
            >
              {isResetting ? 'Resetando...' : 'Resetar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
