import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'receptionist' | 'seller' | 'professional';
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS = {
  admin: 'Administrador',
  receptionist: 'Recepcionista',
  seller: 'Vendedor',
  professional: 'Profissional',
};

interface UserManagementProps {
  users: SystemUser[];
  onRefresh: () => void;
}

export function UserManagement({ users, onRefresh }: UserManagementProps) {
  const { clinicId } = useClinic();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'receptionist' as 'admin' | 'receptionist' | 'seller' | 'professional',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

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
        role: user.role,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            phone: formData.phone,
          })
          .eq('user_id', editingUser.id);

        if (profileError) throw profileError;

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

        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name: formData.name },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Add role
          const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: authData.user.id,
            role: formData.role,
          });

          if (roleError) throw roleError;

          // Link user to clinic
          if (clinicId) {
            const { error: clinicError } = await supabase.from('clinic_users').insert({
              clinic_id: clinicId,
              user_id: authData.user.id,
              is_owner: false,
            });
            if (clinicError) {
              console.error('Error linking user to clinic:', clinicError);
            }
          }

          // Update profile with phone
          if (formData.phone) {
            await supabase
              .from('profiles')
              .update({ phone: formData.phone })
              .eq('user_id', authData.user.id);
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Deletar clinic_users
      const { error: clinicUserError } = await supabase
        .from('clinic_users')
        .delete()
        .eq('user_id', userToDelete.id);

      if (clinicUserError) throw clinicUserError;

      // Deletar user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      if (roleError) throw roleError;

      // Deletar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userToDelete.id);

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
    <>
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
                    <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
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
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active ? 'destructive' : 'default'}
                        onClick={() => handleToggleStatus(user)}
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
                placeholder="Nome do usuário"
                required
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
                  onValueChange={(v) =>
                    setFormData({ ...formData, role: v as 'admin' | 'receptionist' | 'seller' | 'professional' })
                  }
                  disabled={!!editingUser}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="receptionist">Recepcionista</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="professional">Profissional</SelectItem>
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
    </>
  );
}
