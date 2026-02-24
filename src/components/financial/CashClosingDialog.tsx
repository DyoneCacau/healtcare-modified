import { useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { CashRegister, CashSummary, Transaction } from '@/types/financial';

interface CashClosingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegister: CashRegister;
  summary: CashSummary;
  onClose: () => void;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro (líquido)',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  pix: 'PIX',
  voucher: 'Voucher/Parceria',
  split: 'Pagamento Dividido',
};

export function CashClosingDialog({
  open,
  onOpenChange,
  cashRegister,
  summary,
  onClose,
}: CashClosingDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fechamento de Caixa - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            body { 
              font-family: 'Segoe UI', system-ui, sans-serif; 
              padding: 20px; 
              max-width: 800px; 
              margin: 0 auto;
              font-size: 12px;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0d9488; padding-bottom: 15px; }
            .header h1 { color: #0d9488; margin: 0 0 5px 0; font-size: 18px; }
            .header p { color: #666; margin: 0; font-size: 11px; }
            .section { margin-bottom: 15px; }
            .section-title { font-weight: bold; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; font-size: 13px; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; }
            .row.highlight { background: #f0fdfa; padding: 8px; border-radius: 4px; font-weight: bold; }
            .row.income { color: #059669; }
            .row.expense { color: #dc2626; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
            th, td { padding: 6px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f9fafb; font-weight: 600; }
            .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
            .total-box { background: #0d9488; color: white; padding: 12px; border-radius: 6px; text-align: center; margin: 15px 0; }
            .total-box .value { font-size: 20px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
            @media print { 
              body { padding: 0; } 
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const CATEGORY_ESTORNO = 'Estorno';
  const incomeTransactions = cashRegister.transactions.filter(
    (t) => t.type === 'income' && !t.refundedAt
  );
  const refundTransactions = cashRegister.transactions.filter(
    (t) =>
      (t.type === 'income' && t.refundedAt) ||
      (t.type === 'expense' && (t.category || '').trim().toLowerCase() === CATEGORY_ESTORNO.toLowerCase())
  );
  const expenseTransactions = cashRegister.transactions.filter(
    (t) =>
      t.type === 'expense' &&
      (t.category || '').trim().toLowerCase() !== CATEGORY_ESTORNO.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fechamento de Caixa
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef}>
          {/* Header */}
          <div className="header text-center mb-6 pb-4 border-b-2 border-primary">
            <h1 className="text-xl font-bold text-primary">HealthCare</h1>
            <p className="text-muted-foreground text-sm">Relatório de Fechamento de Caixa</p>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Opening Info */}
          <div className="section mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Abertura:</span>
                <span className="ml-2 font-medium">
                  {format(parseISO(cashRegister.openedAt), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Responsável:</span>
                <span className="ml-2 font-medium">{cashRegister.openedByName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo Inicial:</span>
                <span className="ml-2 font-medium">
                  R$ {cashRegister.initialBalance.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total de Movimentações:</span>
                <span className="ml-2 font-medium">{summary.transactionCount}</span>
              </div>
            </div>
          </div>

          {/* Summary by Payment Method */}
          <div className="section mb-4">
            <h3 className="section-title font-semibold text-primary border-b pb-2 mb-3">
              Resumo por Forma de Pagamento
            </h3>
            <div className="space-y-2">
              <div className="row flex justify-between py-1">
                <span> Dinheiro (líquido)</span>
                <span className="font-medium">R$ {summary.totalCash.toFixed(2)}</span>
              </div>
              <div className="row flex justify-between py-1">
                <span> Cartão de Crédito</span>
                <span className="font-medium">R$ {summary.totalCredit.toFixed(2)}</span>
              </div>
              <div className="row flex justify-between py-1">
                <span> Cartão de Débito</span>
                <span className="font-medium">R$ {summary.totalDebit.toFixed(2)}</span>
              </div>
              <div className="row flex justify-between py-1">
                <span> PIX</span>
                <span className="font-medium">R$ {summary.totalPix.toFixed(2)}</span>
              </div>
              <div className="row flex justify-between py-1">
                <span> Voucher/Parceria</span>
                <span className="font-medium">R$ {summary.totalVoucher.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Income Transactions */}
          <div className="section mb-4">
            <h3 className="section-title font-semibold text-emerald-600 border-b pb-2 mb-3">
              Entradas (R$ {summary.totalIncome.toFixed(2)})
            </h3>
            {incomeTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma entrada registrada</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Hora</th>
                    <th className="text-left py-2">Descrição</th>
                    <th className="text-left py-2">Paciente</th>
                    <th className="text-left py-2">Pagamento</th>
                    <th className="text-right py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-dashed">
                      <td className="py-2">{t.time}</td>
                      <td className="py-2">{t.description}</td>
                      <td className="py-2">{t.patientName || '-'}</td>
                      <td className="py-2">{paymentMethodLabels[t.paymentMethod]}</td>
                      <td className="py-2 text-right text-emerald-600 font-medium">
                        R$ {t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Expense Transactions */}
          <div className="section mb-4">
            <h3 className="section-title font-semibold text-red-600 border-b pb-2 mb-3">
              Saídas (R$ {summary.totalExpense.toFixed(2)})
            </h3>
            {expenseTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma saída registrada</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Hora</th>
                    <th className="text-left py-2">Descrição</th>
                    <th className="text-left py-2">Categoria</th>
                    <th className="text-right py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-dashed">
                      <td className="py-2">{t.time}</td>
                      <td className="py-2">{t.description}</td>
                      <td className="py-2">{t.category}</td>
                      <td className="py-2 text-right text-red-600 font-medium">
                        R$ {t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Refund Transactions */}
          <div className="section mb-4">
            <h3 className="section-title font-semibold text-amber-600 border-b pb-2 mb-3">
              Estorno (R$ {(summary.totalRefund ?? 0).toFixed(2)})
            </h3>
            {refundTransactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum estorno registrado</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Hora</th>
                    <th className="text-left py-2">Descrição</th>
                    <th className="text-left py-2">Paciente</th>
                    <th className="text-right py-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {refundTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-dashed">
                      <td className="py-2">{t.time}</td>
                      <td className="py-2">{t.description}</td>
                      <td className="py-2">{t.patientName || '-'}</td>
                      <td className="py-2 text-right text-amber-600 font-medium">
                        R$ {t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Final Balance */}
          <div className="total-box bg-primary text-primary-foreground p-4 rounded-lg text-center my-4">
            <p className="text-sm opacity-90">Saldo Final do Caixa</p>
            <p className="value text-2xl font-bold">
              R$ {(cashRegister.initialBalance + summary.totalCash).toFixed(2)}
            </p>
            <p className="text-xs opacity-75 mt-1">
              (Inicial: R$ {cashRegister.initialBalance.toFixed(2)} + Movimentações: R$ {summary.totalCash.toFixed(2)})
            </p>
          </div>

          {/* Signatures */}
          <div className="signature-area mt-10 grid grid-cols-2 gap-8">
            <div className="signature-box text-center">
              <div className="signature-line border-t border-foreground mt-16 pt-2">
                <p className="font-medium">Gerente</p>
                <p className="text-xs text-muted-foreground">Assinatura e Carimbo</p>
              </div>
            </div>
            <div className="signature-box text-center">
              <div className="signature-line border-t border-foreground mt-16 pt-2">
                <p className="font-medium">Recepcionista</p>
                <p className="text-xs text-muted-foreground">{cashRegister.openedByName}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer text-center mt-8 pt-4 border-t text-xs text-muted-foreground">
            <p>Documento gerado automaticamente pelo sistema HealthCare</p>
            <p>Data/Hora de impressão: {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Relatório
          </Button>
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar Fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
