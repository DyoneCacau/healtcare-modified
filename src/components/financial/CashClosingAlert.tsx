import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUnclosedCashDays } from '@/hooks/useFinancial';
import { useAuth } from '@/hooks/useAuth';

export function CashClosingAlert() {
  const { isAdmin } = useAuth();
  const { unclosedDates, isLoading } = useUnclosedCashDays();

  if (!isAdmin || isLoading || unclosedDates.length === 0) return null;

  const formatted = unclosedDates
    .slice(-7)
    .map((d) => format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR }))
    .join(', ');

  return (
    <div className="border-b bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <div className="container flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-800 dark:text-amber-200">
          Caixa não fechado em dias com movimentação: <strong>{formatted}</strong>.
        </span>
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
