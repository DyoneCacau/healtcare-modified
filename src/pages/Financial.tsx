import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Minus,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  CreditCard,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { PaymentForm } from '@/components/financial/PaymentForm';
import { TransactionsList } from '@/components/financial/TransactionsList';
import { CashClosingDialog } from '@/components/financial/CashClosingDialog';
import { SangriaDialog, CATEGORY_SANGRIA } from '@/components/financial/SangriaDialog';
import { CashRegister, CashSummary, Transaction } from '@/types/financial';
import { useTodayTransactions, useFinancialSummary, useTransactionMutations, useRegisterCashClosing } from '@/hooks/useFinancial';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FeatureButton } from '@/components/subscription/FeatureButton';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const CAIXA_STORAGE_KEY = 'healthcare-caixa';

function getCaixaStorageKey(clinicId: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `${CAIXA_STORAGE_KEY}-${clinicId}-${today}`;
}

export default function Financial() {
  const [isCashOpen, setIsCashOpen] = useState(true);
  const [initialBalance, setInitialBalance] = useState(0);
  const [openedAt, setOpenedAt] = useState(new Date().toISOString());
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [closingDialogOpen, setClosingDialogOpen] = useState(false);
  const [sangriaDialogOpen, setSangriaDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const { user, isAdmin } = useAuth();
  const { clinicId } = useClinic();
  const { transactions: rawTransactions, isLoading } = useTodayTransactions();
  const { summary, isLoading: isSummaryLoading } = useFinancialSummary();
  const { createTransaction, updateTransaction, deleteTransaction } = useTransactionMutations();
  const registerCashClosing = useRegisterCashClosing();

  useEffect(() => {
    if (!clinicId) return;
    const key = getCaixaStorageKey(clinicId);
    try {
      const saved = localStorage.getItem(key);
      if (saved === 'closed') setIsCashOpen(false);
    } catch (_) {}
  }, [clinicId]);

  const rawById = useMemo(() => {
    return new Map<string, any>(rawTransactions.map((t: any) => [t.id, t]));
  }, [rawTransactions]);

  const transactions: Transaction[] = useMemo(() => {
    return rawTransactions.map((t: any) => ({
      id: t.id,
      type: t.type as 'income' | 'expense',
      description: t.description || '',
      amount: Number(t.amount),
      paymentMethod: t.payment_method as any,
      category: t.category || '',
      date: t.created_at.split('T')[0],
      time: format(new Date(t.created_at), 'HH:mm'),
      userId: t.user_id,
      userName: t.user_name || 'Usuário',
      patientId: t.patient_id || undefined,
      patientName: t.patient_name || undefined,
      notes: t.notes || undefined,
      voucherDiscount: t.voucher_discount || undefined,
      paymentSplit: t.payment_split || undefined,
    }));
  }, [rawTransactions]);

  const cashRegister: CashRegister = useMemo(
    () => ({
      id: 'current',
      openedAt,
      openedBy: user?.id || '',
      openedByName: user?.email?.split('@')[0] || 'Usuário',
      initialBalance,
      transactions,
      status: isCashOpen ? 'open' : 'closed',
    }),
    [openedAt, user, initialBalance, transactions, isCashOpen]
  );

  const cashSummary: CashSummary = useMemo(
    () => ({
      totalCash: summary?.totalCash || 0,
      totalCredit: summary?.totalCredit || 0,
      totalDebit: summary?.totalDebit || 0,
      totalPix: summary?.totalPix || 0,
      totalVoucher: 0,
      totalIncome: summary?.totalIncome || 0,
      totalExpense: summary?.totalExpense || 0,
      netBalance: summary?.netBalance || 0,
      transactionCount: summary?.transactionCount || 0,
    }),
    [summary]
  );

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    await createTransaction.mutateAsync({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.paymentMethod,
      patient_id: transaction.patientId || null,
      notes: transaction.notes || null,
      voucher_discount: transaction.voucherDiscount || null,
      payment_split: transaction.paymentSplit || null,
    });
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleEditTransaction = async (
    transaction: Omit<Transaction, 'id'>,
    options?: { reason?: string }
  ) => {
    if (!editingTransaction) return;
    const previous = rawById.get(editingTransaction.id);
    if (!previous) {
      toast.error('Não foi possível localizar o lançamento original.');
      return;
    }

    await updateTransaction.mutateAsync({
      id: editingTransaction.id,
      previous,
      reason: options?.reason || null,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.paymentMethod,
      patient_id: transaction.patientId || null,
      notes: transaction.notes || null,
      voucher_discount: transaction.voucherDiscount || null,
      payment_split: transaction.paymentSplit || null,
      updated_at: new Date().toISOString(),
    });

    setEditDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleOpenDelete = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!editingTransaction) return;
    if (!deleteReason.trim()) {
      toast.error('Informe o motivo do cancelamento.');
      return;
    }
    const previous = rawById.get(editingTransaction.id);
    if (!previous) {
      toast.error('Não foi possível localizar o lançamento original.');
      return;
    }

    await deleteTransaction.mutateAsync({
      id: editingTransaction.id,
      previous,
      reason: deleteReason.trim(),
    });

    setDeleteDialogOpen(false);
    setEditingTransaction(null);
    setDeleteReason('');
  };

  const handleOpenCash = () => {
    if (clinicId) {
      try {
        localStorage.setItem(getCaixaStorageKey(clinicId), 'open');
      } catch (_) {}
    }
    setOpenedAt(new Date().toISOString());
    setIsCashOpen(true);
    toast.success('Caixa aberto com sucesso!');
  };

  const cashOnHand = initialBalance + cashSummary.totalCash;

  const handleSangria = async (amount: number, notes: string) => {
    await createTransaction.mutateAsync({
      type: 'expense',
      amount,
      description: notes ? `Sangria - ${notes}` : 'Sangria - Recolhimento para cofre',
      category: CATEGORY_SANGRIA,
      payment_method: 'cash',
      patient_id: null,
      notes: notes || null,
      voucherDiscount: null,
      paymentSplit: null,
    });
    toast.success('Sangria registrada. Valor recolhido para o cofre.');
  };

  const handleCloseCash = async () => {
    try {
      await registerCashClosing.mutateAsync('');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar fechamento. Caixa foi fechado localmente.');
    }
    if (clinicId) {
      try {
        localStorage.setItem(getCaixaStorageKey(clinicId), 'closed');
      } catch (_) {}
    }
    setIsCashOpen(false);
    setClosingDialogOpen(false);
    toast.success('Caixa fechado com sucesso! A notificação de dias em aberto foi atualizada.');
  };


  if (isLoading || isSummaryLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Financeiro / Caixa</h1>
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
          <Skeleton className="h-24" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financeiro / Caixa</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            {isCashOpen ? (
              <>
                <FeatureButton
                  feature="financeiro"
                  variant="outline"
                  onClick={() => setExpenseDialogOpen(true)}
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Saída
                </FeatureButton>
                <FeatureButton feature="financeiro" onClick={() => setIncomeDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Entrada
                </FeatureButton>
                <FeatureButton
                  feature="financeiro"
                  variant="outline"
                  onClick={() => setSangriaDialogOpen(true)}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Sangria
                </FeatureButton>
                <FeatureButton
                  feature="financeiro"
                  variant="destructive"
                  onClick={() => setClosingDialogOpen(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Fechar Caixa
                </FeatureButton>
              </>
            ) : (
              <FeatureButton
                feature="financeiro"
                onClick={handleOpenCash}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Abrir Caixa
              </FeatureButton>
            )}
          </div>
        </div>

        <Card
          className={cn(
            'border-2',
            isCashOpen ? 'border-emerald-500 bg-emerald-50/50' : 'border-red-500 bg-red-50/50'
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isCashOpen ? (
                  <Unlock className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Lock className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className={cn('font-semibold', isCashOpen ? 'text-emerald-700' : 'text-red-700')}>
                    Caixa {isCashOpen ? 'Aberto' : 'Fechado'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isCashOpen
                      ? `Aberto às ${format(new Date(openedAt), 'HH:mm')}`
                      : 'Clique em "Abrir Caixa" para iniciar'}
                  </p>
                </div>
              </div>
              {isCashOpen && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                  <p className="text-xl font-bold text-foreground">R$ {initialBalance.toFixed(2)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isCashOpen && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Entradas</p>
                      <p className="text-xl font-bold text-emerald-600">
                        R$ {cashSummary.totalIncome.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saídas</p>
                      <p className="text-xl font-bold text-red-600">
                        R$ {cashSummary.totalExpense.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo</p>
                      <p
                        className={cn(
                          'text-xl font-bold',
                          cashSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        R$ {cashSummary.netBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Em Caixa</p>
                      <p className="text-xl font-bold text-blue-600">
                        R$ {(initialBalance + cashSummary.totalCash).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="bg-green-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dinheiro (líquido)</p>
                    <p className="font-semibold text-green-700">R$ {cashSummary.totalCash.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Crédito</p>
                    <p className="font-semibold text-blue-700">R$ {cashSummary.totalCredit.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Débito</p>
                    <p className="font-semibold text-purple-700">R$ {cashSummary.totalDebit.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-teal-50">
                <CardContent className="p-3 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-teal-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">PIX</p>
                    <p className="font-semibold text-teal-700">R$ {cashSummary.totalPix.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Movimentações do Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionsList
                  transactions={transactions}
                  canManage={isAdmin}
                  onEdit={handleOpenEdit}
                  onDelete={handleOpenDelete}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <PaymentForm
        open={incomeDialogOpen}
        onOpenChange={setIncomeDialogOpen}
        onSave={handleAddTransaction}
        type="income"
      />

      <PaymentForm
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSave={handleAddTransaction}
        type="expense"
      />

      <PaymentForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditTransaction}
        type={editingTransaction?.type || 'income'}
        mode="edit"
        initialData={editingTransaction}
      />

      <CashClosingDialog
        open={closingDialogOpen}
        onOpenChange={setClosingDialogOpen}
        cashRegister={cashRegister}
        summary={cashSummary}
        onClose={handleCloseCash}
      />

      <SangriaDialog
        open={sangriaDialogOpen}
        onOpenChange={setSangriaDialogOpen}
        onConfirm={handleSangria}
        maxCash={cashOnHand}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o motivo do cancelamento para registro de auditoria.
            </p>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Ex: lançamento duplicado, valor incorreto..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Cancelar lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
}
