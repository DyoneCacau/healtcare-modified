import { useMemo, useState } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Plus,
  Search,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { usePermissions } from '@/hooks/usePermissions';
import { usePatients } from '@/hooks/usePatients';
import { useReceivables, useReceivableMutations } from '@/hooks/useReceivables';
import { formatCurrencyBRL } from '@/lib/currency';
import type { AccountReceivable } from '@/types/receivable';
import { RECEIVABLE_STATUS_LABELS } from '@/types/receivable';

type FilterKey = 'all' | 'open' | 'today' | 'overdue' | 'month' | 'paid';

function isOverdue(item: AccountReceivable, today: Date): boolean {
  return item.status === 'open' && isBefore(parseISO(item.dueDate), startOfDay(today));
}

function isDueToday(item: AccountReceivable, todayStr: string): boolean {
  return item.status === 'open' && item.dueDate === todayStr;
}

export default function Receivables() {
  const { can, isLoading: permLoading } = usePermissions();
  const { data: receivables = [], isLoading, error } = useReceivables();
  const { createReceivable, settleReceivable, cancelReceivable } = useReceivableMutations();
  const { patients } = usePatients();

  const canView = can('contas_receber', 'can_view');
  const canCreate = can('contas_receber', 'can_create');
  const canEdit = can('contas_receber', 'can_edit');

  const [filter, setFilter] = useState<FilterKey>('open');
  const [search, setSearch] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [settleItem, setSettleItem] = useState<AccountReceivable | null>(null);
  const [settleMethod, setSettleMethod] = useState('pix');

  const [formPatientId, setFormPatientId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formDueDate, setFormDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const monthPrefix = format(today, 'yyyy-MM');

  const summary = useMemo(() => {
    const openItems = receivables.filter((r) => r.status === 'open');
    return {
      open: openItems.reduce((s, r) => s + r.amount, 0),
      today: openItems.filter((r) => isDueToday(r, todayStr)).reduce((s, r) => s + r.amount, 0),
      overdue: openItems.filter((r) => isOverdue(r, today)).reduce((s, r) => s + r.amount, 0),
      monthPaid: receivables
        .filter((r) => r.status === 'paid' && r.paidAt?.startsWith(monthPrefix))
        .reduce((s, r) => s + (r.paidAmount ?? r.amount), 0),
    };
  }, [receivables, todayStr, monthPrefix]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return receivables.filter((item) => {
      if (term) {
        const hay = `${item.description} ${item.patientName || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (filter === 'open') return item.status === 'open';
      if (filter === 'today') return isDueToday(item, todayStr);
      if (filter === 'overdue') return isOverdue(item, today);
      if (filter === 'month') {
        return item.status === 'paid' && item.paidAt?.startsWith(monthPrefix);
      }
      if (filter === 'paid') return item.status === 'paid';
      return true;
    });
  }, [receivables, filter, search, todayStr, monthPrefix]);

  const handleCreate = async () => {
    if (!formDescription.trim() || formAmount <= 0) return;
    await createReceivable.mutateAsync({
      patient_id: formPatientId || null,
      description: formDescription.trim(),
      amount: formAmount,
      due_date: formDueDate,
    });
    setNewOpen(false);
    setFormPatientId('');
    setFormDescription('');
    setFormAmount(0);
    setFormDueDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSettle = async () => {
    if (!settleItem) return;
    await settleReceivable.mutateAsync({
      id: settleItem.id,
      paymentMethod: settleMethod,
    });
    setSettleItem(null);
  };

  if (permLoading || isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!canView) {
    return (
      <MainLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Você não tem permissão para ver Contas a receber.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'open', label: 'Em aberto' },
    { key: 'today', label: 'Vencem hoje' },
    { key: 'overdue', label: 'Atrasadas' },
    { key: 'month', label: 'Este mês' },
    { key: 'paid', label: 'Quitadas' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contas a receber</h1>
            <p className="text-sm text-muted-foreground">
              Valores em aberto, atrasados e baixas — separado do Caixa do dia
            </p>
          </div>
          {canCreate && (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo lançamento
            </Button>
          )}
        </div>

        {error && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex gap-3 py-4 text-sm text-amber-900">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                Não foi possível carregar as contas. Se ainda não rodou o SQL, execute
                {' '}<code className="font-mono">supabase/PRODUCAO_13_CONTAS_A_RECEBER.sql</code> no painel.
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Em aberto</p>
              <p className="mt-1 text-2xl font-bold">R$ {formatCurrencyBRL(summary.open)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase text-muted-foreground">Vence hoje</p>
              <p className="mt-1 text-2xl font-bold">R$ {formatCurrencyBRL(summary.today)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase text-destructive">Atrasadas</p>
              <p className="mt-1 text-2xl font-bold text-destructive">R$ {formatCurrencyBRL(summary.overdue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-foreground text-background">
            <CardContent className="pt-6">
              <p className="text-xs font-medium uppercase opacity-80">Recebido este mês</p>
              <p className="mt-1 text-2xl font-bold">R$ {formatCurrencyBRL(summary.monthPaid)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por descrição ou pagador"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Wallet className="h-10 w-10 opacity-40" />
                <p>Nenhuma conta encontrada neste filtro</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const overdue = isOverdue(item, today);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.patientName || '—'}</TableCell>
                        <TableCell>
                          {format(parseISO(item.dueDate), "d MMM yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-semibold">
                          R$ {formatCurrencyBRL(item.amount)}
                        </TableCell>
                        <TableCell>
                          {item.status === 'paid' ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              {RECEIVABLE_STATUS_LABELS.paid}
                            </Badge>
                          ) : item.status === 'cancelled' ? (
                            <Badge variant="secondary">{RECEIVABLE_STATUS_LABELS.cancelled}</Badge>
                          ) : overdue ? (
                            <Badge variant="destructive">Atrasado</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800">
                              Em aberto
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === 'open' && canEdit && (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setSettleMethod('pix');
                                setSettleItem(item);
                              }}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Dar baixa
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelReceivable.mutate(item.id)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conta a receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Paciente (opcional)</Label>
              <Select value={formPatientId || 'none'} onValueChange={(v) => setFormPatientId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem paciente</SelectItem>
                  {patients.filter((p) => p.status === 'active').map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex.: Ortodontia — parcela 1/6"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <CurrencyInput value={formAmount} onValueChange={setFormAmount} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <DateInput value={formDueDate} onChange={setFormDueDate} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={!formDescription.trim() || formAmount <= 0 || createReceivable.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!settleItem} onOpenChange={(open) => !open && setSettleItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar baixa</DialogTitle>
          </DialogHeader>
          {settleItem && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {settleItem.description} — <strong>R$ {formatCurrencyBRL(settleItem.amount)}</strong>
              </p>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={settleMethod} onValueChange={setSettleMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit">Crédito (maquineta)</SelectItem>
                    <SelectItem value="debit">Débito (maquineta)</SelectItem>
                    <SelectItem value="voucher">Voucher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-2">
                <CircleDollarSign className="h-4 w-4 shrink-0" />
                A baixa cria automaticamente o lançamento no Caixa do dia.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleItem(null)}>Cancelar</Button>
            <Button onClick={handleSettle} disabled={settleReceivable.isPending}>
              Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
