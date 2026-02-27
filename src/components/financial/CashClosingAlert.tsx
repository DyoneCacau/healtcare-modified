import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnclosedCashDays, useRegisterCashClosing } from '@/hooks/useFinancial';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function CashClosingAlert() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { clinic } = useClinic();
  const { unclosedDates, isLoading } = useUnclosedCashDays();
  const registerClosing = useRegisterCashClosing();
  const [registering, setRegistering] = useState(false);

  if (!isAdmin || isLoading || unclosedDates.length === 0) return null;

  const formatted = unclosedDates
    .slice(-7)
    .map((d) => format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR }))
    .join(', ');

  const handleQuickRegister = async () => {
    setRegistering(true);
    try {
      await registerClosing.mutateAsync('');
      toast.success('Fechamento registrado. A notificação foi atualizada.');
    } catch {
      toast.error('Erro ao registrar fechamento.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="border-b bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <div className="container flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-800 dark:text-amber-200">
          {isSuperAdmin && clinic?.name && (
            <span className="font-medium">[{clinic.name}] </span>
          )}
          Caixa não fechado em dias com movimentação: <strong>{formatted}</strong>.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
          onClick={handleQuickRegister}
          disabled={registering}
        >
          {registering ? 'Registrando...' : 'Registrar fechamento'}
        </Button>
        <Link
          to="/financeiro"
          className="font-medium text-amber-700 dark:text-amber-300 hover:underline underline-offset-2"
        >
          Fechar no Financeiro
        </Link>
      </div>
    </div>
  );
}
