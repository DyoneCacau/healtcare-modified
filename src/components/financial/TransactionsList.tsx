import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  CreditCard,
  Smartphone,
  Ticket,
  Split,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/financial';

interface TransactionsListProps {
  transactions: Transaction[];
  canManage?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

const paymentIcons = {
  cash: Banknote,
  credit: CreditCard,
  debit: CreditCard,
  pix: Smartphone,
  voucher: Ticket,
  split: Split,
};

const paymentLabels = {
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'PIX',
  voucher: 'Voucher',
  split: 'Dividido',
};

export function TransactionsList({ transactions, canManage, onEdit, onDelete }: TransactionsListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-3 pr-4">
        {transactions
          .sort((a, b) => {
            const dateA = `${a.date}T${a.time}`;
            const dateB = `${b.date}T${b.time}`;
            return dateB.localeCompare(dateA);
          })
          .map((transaction) => {
            const PaymentIcon = paymentIcons[transaction.paymentMethod];
            const isIncome = transaction.type === 'income';

            return (
              <Card key={transaction.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        isIncome ? 'bg-emerald-100' : 'bg-red-100'
                      )}
                    >
                      {isIncome ? (
                        <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                          {transaction.description}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                      </div>

                      {transaction.patientName && (
                        <p className="text-sm text-muted-foreground">
                          Paciente: {transaction.patientName}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>
                          {format(parseISO(`${transaction.date}T${transaction.time}`), 'HH:mm', { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <PaymentIcon className="h-3 w-3" />
                          {paymentLabels[transaction.paymentMethod]}
                        </span>
                        {transaction.paymentSplit && (
                          <span className="text-xs">
                            ({paymentLabels[transaction.paymentSplit.method1]}: R$ {transaction.paymentSplit.amount1.toFixed(2)} + 
                            {paymentLabels[transaction.paymentSplit.method2]}: R$ {transaction.paymentSplit.amount2.toFixed(2)})
                          </span>
                        )}
                        {transaction.voucherDiscount && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                            Desc: R$ {transaction.voucherDiscount.toFixed(2)}
                          </Badge>
                        )}
                      </div>

                      {transaction.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {transaction.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p
                        className={cn(
                          'text-lg font-bold',
                          isIncome ? 'text-emerald-600' : 'text-red-600'
                        )}
                      >
                        {isIncome ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.userName}
                      </p>
                      {canManage && (
                        <div className="mt-2 flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => onEdit?.(transaction)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => onDelete?.(transaction)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>
    </ScrollArea>
  );
}
