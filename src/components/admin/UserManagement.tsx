import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  Edit,
  Mail,
  Phone,
  Trash2,
  KeyRound,
  Send,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  roleId: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  seller: 'Vendedor',
  professional: 'Profissional',
};

interface UserManagementProps {
  users: SystemUser[];
  onRefresh: () => void;
  isSuperAdmin?: boolean;
}

export function UserManagement({ users, onRefresh, isSuperAdmin }: UserManagementProps) {
  const { clinicId } = useClinic();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'receptionist' as string,
  });
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string }[]>([]);
  const [newRoleDialogOpen, setNewRoleDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<SystemUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isSettingTemp, setIsSettingTemp] = useState(false);

  useEffect(() => {
    if (!clinicId) {
      setCustomRoles([]);
      return;
    }
    supabase
      .from('clinic_custom_roles')
      .select('id, name')
      .eq('clinic_id', clinicId)
      .then(({ data }) => setCustomRoles(data ?? []));
  }, [clinicId]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (user?: SystemUser) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
        role: user.roleId ?? user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'receptionist',
      });
    }
    setDialogOpen(true);
  };

  const isSystemRole = (v: string) => ['admin', 'receptionist', 'seller', 'professional'].includes(v);
  const handleCreateNewRole = async () => {
    if (!clinicId || !newRoleName.trim()) {
      toast.error('Informe o nome da função');
      return;
    }
    const { data, error } = await supabase
      .from('clinic_custom_roles')
      .insert({ clinic_id: clinicId, name: newRoleName.trim() })
      .select('id, name')
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setCustomRoles((prev) => [...prev, { id: data.id, name: data.name }]);
    setFormData((prev) => ({ ...prev, role: data.id }));
    setNewRoleDialogOpen(false);
    setNewRoleName('');
    toast.success('Função criada. Defina as permissões em Administração > Permissões.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = formData.name?.trim();
    if (!nameTrimmed || nameTrimmed.length < 2) {
      toast.error('Nome completo é obrigatório (mínimo 2 caracteres).');
      return;
    }
    setIsLoading(true);

    try {
      if (editingUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: nameTrimmed,
            phone: formData.phone?.trim() || null,
          })
          .eq('user_id', editingUser.id);
        if (profileError) throw profileError;

        if (clinicId) {
          await supabase.from('user_clinic_custom_roles').delete().eq('user_id', editingUser.id).eq('clinic_id', clinicId);
          if (isSystemRole(formData.role)) {
            await supabase.from('user_roles').update({ role: formData.role }).eq('user_id', editingUser.id);
          } else {
            await supabase.from('user_roles').update({ role: 'receptionist' }).eq('user_id', editingUser.id);
            await supabase.from('user_clinic_custom_roles').insert({
              user_id: editingUser.id,
              clinic_id: clinicId,
              clinic_custom_role_id: formData.role,
            });
          }
        } else if (isSystemRole(formData.role)) {
          await supabase.from('user_roles').update({ role: formData.role }).eq('user_id', editingUser.id);
        }
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Verificar se email já existe
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('email', formData.email)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;
        
        if (existingUser) {
          toast.error('Este e-mail já está cadastrado no sistema.');
          setIsLoading(false);
          return;
        }

        // Create new user (skip_auto_clinic: trigger não criará clínica nova; usuário entra na clínica atual)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: formData.name, skip_auto_clinic: 'true' },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // 1) Vincular à clínica PRIMEIRO (RLS em user_roles exige que o user_id já esteja na clínica)
          if (clinicId) {
            const { error: clinicError } = await supabase.from('clinic_users').insert({
              clinic_id: clinicId,
              user_id: authData.user.id,
              is_owner: false,
            });
            if (clinicError) throw clinicError;
          }

          // 2) Role: sistema ou função personalizada
          const roleValue = formData.role;
          if (isSystemRole(roleValue)) {
            const { error: roleError } = await supabase.from('user_roles').insert({
              user_id: authData.user.id,
              role: roleValue,
            });
            if (roleError) throw roleError;
          } else {
            await supabase.from('user_roles').insert({ user_id: authData.user.id, role: 'receptionist' });
            const { error: customErr } = await supabase.from('user_clinic_custom_roles').insert({
              user_id: authData.user.id,
              clinic_id: clinicId,
              clinic_custom_role_id: roleValue,
            });
            if (customErr) throw customErr;
          }

          // Garantir nome e telefone no perfil (nome obrigatório no cadastro)
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              name: nameTrimmed,
              phone: formData.phone?.trim() || null,
            })
            .eq('user_id', authData.user.id);

          if (profileUpdateError) {
            console.error('Erro ao atualizar perfil:', profileUpdateError);
          }
        }

        toast.success('Usuário criado com sucesso!');
      }

      setDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(
        `Usuário ${user.is_active ? 'desativado' : 'ativado'} com sucesso!`
      );
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status');
    }
  };

  const handleOpenResetPassword = (user: SystemUser) => {
    setUserToResetPassword(user);
    setTempPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleSendResetLink = async () => {
    if (!userToResetPassword?.email) return;
    setIsSendingLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userToResetPassword.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Link de redefinição enviado para ${userToResetPassword.email}. O usuário deve acessar o e-mail e definir a nova senha.`);
      setResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar link');
    } finally {
      setIsSendingLink(false);
    }
  };

  const handleSetTempPassword = async () => {
    if (!userToResetPassword || !tempPassword || tempPassword.length < 6) {
      toast.error('Informe uma senha temporária com no mínimo 6 caracteres.');
      return;
    }
    setIsSettingTemp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { user_id: userToResetPassword.id, new_password: tempPassword },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Senha temporária definida. Oriente o usuário a trocar no primeiro acesso em Configurações > Alterar senha.');
      setResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setTempPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao definir senha temporária. Apenas Superadmin pode usar esta opção.');
    } finally {
      setIsSettingTemp(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await supabase.from('user_clinic_custom_roles').delete().eq('user_id', userToDelete.id);
      const { error: clinicUserError } = await supabase
        .from('clinic_users')
        .delete()
        .eq('user_id', userToDelete.id);
      if (clinicUserError) throw clinicUserError;

      const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userToDelete.id);
      if (roleError) throw roleError;

      const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userToDelete.id);
      if (profileError) throw profileError;

      // Tentar deletar usuário do auth (pode falhar se não tiver permissão)
      try {
        await supabase.auth.admin.deleteUser(userToDelete.id);
      } catch (authError) {
        console.warn('Não foi possível deletar usuário do auth:', authError);
      }

      toast.success('Usuário deletado com sucesso!');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      onRefresh();
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error);
      toast.error(error.message || 'Erro ao deletar usuário');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema
          </CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {user.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {user.phone}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {user.is_active ? (
                      <Badge className="bg-emerald-500">
                        <UserCheck className="mr-1 h-3 w-3" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <UserX className="mr-1 h-3 w-3" />
                        Inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(user)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenResetPassword(user)}
                        title="Resetar senha"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? 'destructive' : 'default'}
                        onClick={() => handleToggleStatus(user)}
                        title={user.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {user.is_active ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteDialogOpen(true);
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Atualize os dados do usuário'
                : 'Cadastre um novo usuário para acessar o sistema'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo (obrigatório)"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@clinica.com"
                disabled={!!editingUser}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="role">Função *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => {
                    if (v === '__new__') {
                      setNewRoleDialogOpen(true);
                      return;
                    }
                    setFormData({ ...formData, role: v });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
                    {customRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                    {clinicId && <SelectItem value="__new__">Criar nova função</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova função (ao criar usuário) */}
      <Dialog open={newRoleDialogOpen} onOpenChange={(open) => { setNewRoleDialogOpen(open); if (!open) setNewRoleName(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova função</DialogTitle>
            <DialogDescription>Digite o nome da nova função. Depois defina o que ela pode fazer em Administração &gt; Permissões.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da função</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ex: Gerente"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewRoleDialogOpen(false); setNewRoleName(''); }}>Cancelar</Button>
              <Button onClick={handleCreateNewRole} disabled={!newRoleName.trim()}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Resetar Senha */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordDialogOpen(false);
          setUserToResetPassword(null);
          setTempPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetar senha</DialogTitle>
            <DialogDescription>
              {userToResetPassword && (
                <>Usuário: <strong>{userToResetPassword.name}</strong> ({userToResetPassword.email})</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Enviar link por e-mail: o usuário receberá um e-mail e poderá definir uma nova senha pelo link.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleSendResetLink}
              disabled={isSendingLink}
            >
              <Send className="h-4 w-4" />
              {isSendingLink ? 'Enviando...' : 'Enviar link de redefinição por e-mail'}
            </Button>

            {isSuperAdmin && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Ou defina uma senha temporária. O usuário deve trocar no primeiro acesso em Configurações &gt; Alterar senha.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="temp-password">Senha temporária (mín. 6 caracteres)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="temp-password"
                      type={showTempPassword ? 'text' : 'password'}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Senha temporária"
                      minLength={6}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowTempPassword(!showTempPassword)}
                      title={showTempPassword ? 'Ocultar' : 'Mostrar'}
                    >
                      {showTempPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={handleSetTempPassword}
                  disabled={isSettingTemp || tempPassword.length < 6}
                >
                  <KeyRound className="h-4 w-4" />
                  {isSettingTemp ? 'Definindo...' : 'Definir senha temporária'}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário{' '}
              <strong>{userToDelete?.name}</strong> será permanentemente removido do
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
