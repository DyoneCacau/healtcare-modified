import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Download,
  Search,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Timer,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { UserManagement } from '@/components/admin/UserManagement';
import { PendingCorrections } from '@/components/admin/PendingCorrections';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { useAuditEvents } from '@/hooks/useFinancial';
import { AuditEvent } from '@/types/audit';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface TimeClockEntry {
  id: string;
  user_id: string;
  entry_type: string;
  timestamp: string;
  is_correction: boolean;
  correction_status: string;
  correction_reason: string | null;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'receptionist' | 'seller' | 'professional';
  is_active: boolean;
  created_at: string;
}

interface PendingCorrection {
  id: string;
  user_id: string;
  user_name: string;
  entry_type: string;
  timestamp: string;
  correction_reason: string;
  created_at: string;
}

export default function Administration() {
  const { isAdmin, isSuperAdmin, user, profile } = useAuth();
  const { clinicId } = useClinic();
  const [entries, setEntries] = useState<TimeClockEntry[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [pendingCorrections, setPendingCorrections] = useState<PendingCorrection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [auditUnlocked, setAuditUnlocked] = useState(false);
  const [auditPassword, setAuditPassword] = useState('');
  const [auditError, setAuditError] = useState('');
  const [dateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { auditEvents, isLoading: isAuditLoading } = useAuditEvents(isAdmin);

  useEffect(() => {
    fetchData();
  }, [clinicId, isSuperAdmin]);

  const fetchData = async () => {
    let allowedUserIds: string[] | null = null;

    if (!isSuperAdmin) {
      if (!clinicId) {
        setEntries([]);
        setUsers([]);
        setPendingCorrections([]);
        return;
      }

      const { data: clinicUsers, error: clinicUsersError } = await supabase
        .from('clinic_users')
        .select('user_id')
        .eq('clinic_id', clinicId);

      if (clinicUsersError) {
        toast.error('Erro ao carregar usuários da clínica');
        return;
      }

      allowedUserIds = (clinicUsers || []).map((cu) => cu.user_id);

      if (allowedUserIds.length === 0) {
        setEntries([]);
        setUsers([]);
        setPendingCorrections([]);
        return;
      }
    }

    // Fetch time clock entries
    let entriesQuery = supabase
      .from('time_clock_entries')
      .select('*')
      .gte('timestamp', dateRange.from.toISOString())
      .lte('timestamp', dateRange.to.toISOString())
      .order('timestamp', { ascending: false });

    if (allowedUserIds) {
      entriesQuery = entriesQuery.in('user_id', allowedUserIds);
    }

    const { data: entriesData } = await entriesQuery;

    if (entriesData) {
      setEntries(entriesData);
    }

    // Fetch users with roles (not admin)
    let profilesQuery = supabase.from('profiles').select('*');
    if (allowedUserIds) {
      profilesQuery = profilesQuery.in('user_id', allowedUserIds);
    }
    const { data: profilesData } = await profilesQuery;

    let rolesQuery = supabase
      .from('user_roles')
      .select('*')
      .in('role', ['admin', 'receptionist', 'seller', 'professional']);

    if (allowedUserIds) {
      rolesQuery = rolesQuery.in('user_id', allowedUserIds);
    }

    const { data: rolesData } = await rolesQuery;

    if (profilesData && rolesData) {
      const usersWithRoles: SystemUser[] = [];
      for (const role of rolesData) {
        const profile = profilesData.find((p) => p.user_id === role.user_id);
        if (profile) {
          usersWithRoles.push({
            id: profile.user_id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone || '',
            role: role.role as SystemUser['role'],
            is_active: profile.is_active,
            created_at: profile.created_at,
          });
        }
      }
      setUsers(usersWithRoles);
    }

    // Fetch pending corrections
    let correctionsQuery = supabase
      .from('time_clock_entries')
      .select('*')
      .eq('correction_status', 'pending')
      .order('created_at', { ascending: false });

    if (allowedUserIds) {
      correctionsQuery = correctionsQuery.in('user_id', allowedUserIds);
    }

    const { data: correctionsData } = await correctionsQuery;

    if (correctionsData && profilesData) {
      const corrections: PendingCorrection[] = correctionsData.map((c) => {
        const profile = profilesData.find((p) => p.user_id === c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          user_name: profile?.name || 'Usuário',
          entry_type: c.entry_type,
          timestamp: c.timestamp,
          correction_reason: c.correction_reason || '',
          created_at: c.created_at,
        };
      });
      setPendingCorrections(corrections);
    }
  };

  const handleApproveCorrection = async (id: string) => {
    const { error } = await supabase
      .from('time_clock_entries')
      .update({
        correction_status: 'approved',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao aprovar correção');
    } else {
      toast.success('Correção aprovada com sucesso!');
      fetchData();
    }
  };

  const handleRejectCorrection = async (id: string) => {
    const { error } = await supabase
      .from('time_clock_entries')
      .update({
        correction_status: 'rejected',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao rejeitar correção');
    } else {
      toast.success('Correção rejeitada');
      fetchData();
    }
  };

  const handleAuditUnlock = async () => {
    if (!user?.email) {
      setAuditError('Usuário sem e-mail.');
      return;
    }
    if (!auditPassword.trim()) {
      setAuditError('Informe a senha.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: auditPassword,
    });

    if (error) {
      setAuditError('Senha inválida.');
      return;
    }

    setAuditUnlocked(true);
    setAuditPassword('');
    setAuditError('');
  };

  const formatAudit = (entry: AuditEvent) => {
    const before = entry.before as any;
    const after = entry.after as any;
    const entityLabels: Record<string, string> = {
      appointment: 'Agendamento',
      financial: 'Financeiro',
      patient: 'Paciente',
    };

    const label = entityLabels[entry.entity_type] || entry.entity_type;

    if (entry.entity_type === 'financial') {
      const beforeText = before
        ? `${before.description || '-'} | R$ ${Number(before.amount || 0).toFixed(2)}`
        : '-';
      const afterText = after
        ? `${after.description || '-'} | R$ ${Number(after.amount || 0).toFixed(2)}`
        : '-';
      return { label, beforeText, afterText };
    }

    if (entry.entity_type === 'appointment') {
      const beforeText = before
        ? `${before.procedure || '-'} | ${before.date || '-'} ${before.start_time || ''}`.trim()
        : '-';
      const afterText = after
        ? `${after.procedure || '-'} | ${after.date || '-'} ${after.start_time || ''}`.trim()
        : '-';
      return { label, beforeText, afterText };
    }

    const beforeText = before?.name ? `${before.name}` : '-';
    const afterText = after?.name ? `${after.name}` : '-';
    return { label, beforeText, afterText };
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesEmployee = selectedEmployee === 'all' || entry.user_id === selectedEmployee;
      return matchesEmployee && entry.correction_status === 'approved';
    });
  }, [entries, selectedEmployee]);

  const stats = useMemo(() => {
    const clockIns = filteredEntries.filter((e) => e.entry_type === 'clock_in');
    const uniqueUsers = new Set(filteredEntries.map((e) => e.user_id)).size;
    const lateArrivals = clockIns.filter((e) => {
      const hour = new Date(e.timestamp).getHours();
      return hour >= 9;
    }).length;

    return {
      totalEntries: clockIns.length,
      totalHours: clockIns.length * 8, // Approximate
      uniqueEmployees: uniqueUsers,
      lateArrivals,
    };
  }, [filteredEntries]);

  // Chart data by user
  const hoursChartData = useMemo(() => {
    const userHours = new Map<string, { name: string; hours: number }>();

    filteredEntries
      .filter((e) => e.entry_type === 'clock_in')
      .forEach((entry) => {
        const userProfile = users.find((u) => u.id === entry.user_id);
        const existing = userHours.get(entry.user_id) || {
          name: userProfile?.name || 'Usuário',
          hours: 0,
        };
        existing.hours += 8;
        userHours.set(entry.user_id, existing);
      });

    return Array.from(userHours.values()).map((u) => ({
      name: u.name.split(' ').slice(0, 2).join(' '),
      horas: u.hours,
    }));
  }, [filteredEntries, users]);

  const roleDistribution = useMemo(() => {
    const roles = new Map<string, number>();
    users.forEach((u) => {
      const current = roles.get(u.role) || 0;
      roles.set(u.role, current + 1);
    });
    return Array.from(roles.entries()).map(([role, count]) => ({
      name: role === 'receptionist' ? 'Recepcionista' : 'Vendedor',
      value: count,
    }));
  }, [users]);

  const handleExportTimesheet = () => {
    if (filteredEntries.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    // Create CSV content
    const headers = ['Funcionário', 'Tipo', 'Data', 'Hora', 'Status'];
    const rows = filteredEntries.map((entry) => {
      const userProfile = users.find((u) => u.id === entry.user_id);
      const entryTypeLabels: Record<string, string> = {
        clock_in: 'Entrada',
        clock_out: 'Saída',
        lunch_start: 'Início Intervalo',
        lunch_end: 'Fim Intervalo',
      };
      const date = new Date(entry.timestamp);
      return [
        userProfile?.name || 'Usuário',
        entryTypeLabels[entry.entry_type] || entry.entry_type,
        format(date, 'dd/MM/yyyy'),
        format(date, 'HH:mm'),
        entry.correction_status === 'approved' ? 'Aprovado' : entry.correction_status === 'pending' ? 'Pendente' : 'Rejeitado',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Add BOM for UTF-8 encoding
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `folha-ponto-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Folha de ponto exportada com sucesso!');
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Administração
            </h1>
            <p className="text-muted-foreground">
              Painel administrativo, usuários e folha de ponto
            </p>
          </div>
          <Button onClick={handleExportTimesheet}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Folha de Ponto
          </Button>
        </div>

        <Tabs defaultValue="corrections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="corrections" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Correções
              {pendingCorrections.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {pendingCorrections.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Folha de Ponto
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Corrections Tab */}
          <TabsContent value="corrections">
            <PendingCorrections
              corrections={pendingCorrections}
              onApprove={handleApproveCorrection}
              onReject={handleRejectCorrection}
            />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement users={users} onRefresh={fetchData} />
          </TabsContent>

          {/* Timesheet Tab */}
          <TabsContent value="timesheet" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar funcionário..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <CalendarIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dias Registrados</p>
                      <p className="text-2xl font-bold">{stats.totalEntries}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <Timer className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Horas</p>
                      <p className="text-2xl font-bold">{stats.totalHours}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Funcionários</p>
                      <p className="text-2xl font-bold">{stats.uniqueEmployees}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atrasos</p>
                      <p className="text-2xl font-bold text-amber-600">{stats.lateArrivals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timesheet Table */}
            <Card>
              <CardHeader>
                <CardTitle>Registros de Ponto</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.slice(0, 20).map((entry) => {
                      const userProfile = users.find((u) => u.id === entry.user_id);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {userProfile?.name || 'Usuário'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entry.entry_type === 'clock_in' && 'Entrada'}
                              {entry.entry_type === 'clock_out' && 'Saída'}
                              {entry.entry_type === 'lunch_start' && 'Início Intervalo'}
                              {entry.entry_type === 'lunch_end' && 'Fim Intervalo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-500">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Aprovado
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Horas por Funcionário</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hoursChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="horas" name="Horas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Função</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Horário de Trabalho</h3>
                  <p className="text-sm text-muted-foreground">
                    Defina o horário padrão de entrada e saída dos funcionários
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Entrada</label>
                      <Input type="time" defaultValue="08:00" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Saída</label>
                      <Input type="time" defaultValue="18:00" className="mt-1" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Tolerância de Atraso</h3>
                  <p className="text-sm text-muted-foreground">
                    Tempo de tolerância antes de considerar como atraso
                  </p>
                  <div className="mt-4">
                    <Input type="number" defaultValue="15" className="w-32" />
                    <span className="ml-2 text-sm text-muted-foreground">minutos</span>
                  </div>
                </div>

                <Button>Salvar Configurações</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-4">
            {!auditUnlocked ? (
              <Card>
                <CardHeader>
                  <CardTitle>Confirmar senha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Para acessar a auditoria, confirme sua senha.
                  </p>
                  <Input
                    type="password"
                    value={auditPassword}
                    onChange={(e) => setAuditPassword(e.target.value)}
                    placeholder="Digite sua senha"
                  />
                  {auditError && (
                    <p className="text-sm text-destructive">{auditError}</p>
                  )}
                  <Button onClick={handleAuditUnlock}>
                    Confirmar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Auditoria de Alterações</CardTitle>
                </CardHeader>
                <CardContent>
                  {isAuditLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando auditoria...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Antes</TableHead>
                          <TableHead>Depois</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(auditEvents as AuditEvent[]).map((entry) => {
                          const entryAny = entry as any;
                          const createdAt = entryAny.created_at || entryAny.createdAt;
                          const userFromList = users.find((u) => u.id === entry.user_id);
                          const entryUserId = entry.user_id ?? entryAny.userId ?? '';
                          const isCurrentUser = !!user?.id && String(entryUserId) === String(user.id);
                          const currentUserLabel = isCurrentUser
                            ? (profile?.name || user?.email || (isSuperAdmin ? 'Superadmin' : 'Você'))
                            : null;
                          let userLabel =
                            currentUserLabel ||
                            entryAny.user_name ||
                            entryAny.userName ||
                            userFromList?.name ||
                            entryAny.user_email ||
                            entryAny.userEmail ||
                            entryAny.user_id ||
                            entryAny.userId;
                          if (typeof userLabel === 'string' && user?.id && String(userLabel) === String(user.id)) {
                            userLabel = profile?.name || user?.email || (isSuperAdmin ? 'Superadmin' : 'Você');
                          }
                          const { label, beforeText, afterText } = formatAudit(entry);
                          return (
                            <TableRow key={entry.id}>
                              <TableCell>
                                {format(new Date(createdAt), 'dd/MM/yyyy HH:mm')}
                              </TableCell>
                              <TableCell>{label}</TableCell>
                              <TableCell>
                                {entry.action === 'cancel'
                                  ? 'Cancelou'
                                  : entry.action === 'delete'
                                    ? 'Removeu'
                                    : entry.action === 'create'
                                      ? 'Criou'
                                      : 'Editou'}
                              </TableCell>
                              <TableCell>{beforeText}</TableCell>
                              <TableCell>{afterText}</TableCell>
                              <TableCell>{userLabel || '-'}</TableCell>
                              <TableCell>{entry.reason || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
