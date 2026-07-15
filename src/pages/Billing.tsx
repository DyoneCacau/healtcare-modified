import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import {
  asaasBillingService,
  type AsaasInvoice,
} from "@/services/asaasBillingService";
import { AlertTriangle, CalendarDays, CreditCard, ExternalLink, RefreshCw, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa", pending: "Pendente", suspended: "Suspensa", cancelled: "Cancelada",
    paid: "Pago", overdue: "Atrasado", confirmed: "Confirmado", received: "Recebido",
  };
  return labels[status.toLowerCase()] ?? status;
}

export default function Billing() {
  const { subscription, plan, isLoading: subscriptionLoading, refreshSubscription } = useSubscription();
  const [invoices, setInvoices] = useState<AsaasInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    if (!subscription?.id || subscription.billing_provider !== "asaas") {
      setInvoices([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const page = await asaasBillingService.listPayments(subscription.id);
      setInvoices(page.invoices);
    } catch (error) {
      setInvoices([]);
      setLoadError(error instanceof Error ? error.message : "Não foi possível consultar as cobranças.");
    } finally {
      setLoading(false);
    }
  }, [subscription?.id, subscription?.billing_provider]);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  async function openPayment(invoice?: AsaasInvoice) {
    if (!subscription) return;
    setAction(invoice?.id ?? "payment");
    try {
      const target = invoice ?? invoices.find((item) => item.canPay);
      const url = target?.invoiceUrl ?? target?.bankSlipUrl ?? subscription.hosted_payment_url;
      if (!url) throw new Error("Nenhum link de pagamento está disponível.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a cobrança.");
    } finally {
      setAction(null);
    }
  }

  async function cancelBilling() {
    if (!subscription || !window.confirm("Deseja solicitar o cancelamento desta assinatura?")) return;
    setAction("cancel");
    try {
      await asaasBillingService.cancelSubscription(subscription.id);
      toast.success("Cancelamento solicitado.");
      await Promise.all([loadBilling(), refreshSubscription()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar.");
    } finally {
      setAction(null);
    }
  }

  const provider = subscription?.billing_provider ?? "manual";
  const billingStatus = subscription?.billing_status ?? subscription?.status ?? "pending";
  const nextDueDate = invoices.find((invoice) => invoice.canPay)?.dueDate
    ?? subscription?.next_due_date
    ?? subscription?.current_period_end
    ?? null;
  const monthlyFee = subscription?.monthly_fee;
  const method = subscription?.payment_method;
  const canPay = Boolean(subscription?.can_pay && invoices.some((invoice) => invoice.canPay));
  const canRegularize = Boolean(subscription?.can_regularize && invoices.some((invoice) => invoice.canPay));
  const canCancel = subscription?.can_cancel ?? false;

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Assinatura e cobrança
              </CardTitle>
              <Badge variant={provider === "asaas" ? "default" : "secondary"}>
                {provider === "asaas" ? "Cobrança Asaas" : "Cobrança manual"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {subscriptionLoading || loading ? (
              <div className="py-10 text-center text-muted-foreground">Carregando cobrança...</div>
            ) : !subscription ? (
              <p className="text-muted-foreground">Nenhuma assinatura vinculada à clínica selecionada.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div><p className="text-xs text-muted-foreground">Plano</p><p className="font-medium">{plan?.name ?? "Sem plano"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={billingStatus === "overdue" ? "destructive" : "outline"}>{statusLabel(billingStatus)}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Próximo vencimento</p><p className="font-medium flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(nextDueDate)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Mensalidade</p><p className="font-medium">{monthlyFee == null ? "Não informada" : currency.format(monthlyFee)}</p></div>
                </div>
                <div className="rounded-lg bg-muted p-4 text-sm">
                  Método: <strong>{method ? statusLabel(method.replace("_", " ")) : provider === "asaas" ? "Escolhido no checkout" : "Não definido"}</strong>.
                  {provider === "asaas" && " O pagamento ocorre somente na página hospedada e segura do Asaas."}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(canPay || canRegularize) && (
                    <Button onClick={() => openPayment()} disabled={action !== null}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {canRegularize ? "Regularizar assinatura" : "Pagar agora"}
                    </Button>
                  )}
                  {canCancel && (
                    <Button variant="outline" onClick={cancelBilling} disabled={action !== null}>
                      Cancelar assinatura
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => Promise.all([loadBilling(), refreshSubscription()])}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {provider === "asaas" && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5" />Faturas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loadError ? (
                <p className="text-sm text-destructive" role="alert">{loadError}</p>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma fatura disponível.</p>
              ) : invoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
                  <div>
                    <div className="flex items-center gap-2"><strong>{currency.format(invoice.value)}</strong><Badge variant={invoice.status === "OVERDUE" ? "destructive" : "secondary"}>{statusLabel(invoice.status)}</Badge></div>
                    <p className="text-sm text-muted-foreground">Vencimento: {formatDate(invoice.dueDate)} · {invoice.billingType}</p>
                  </div>
                  {invoice.canPay && (
                    <Button size="sm" variant="outline" onClick={() => openPayment(invoice)} disabled={action !== null}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Abrir cobrança
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {provider === "manual" && (
          <Card>
            <CardContent className="pt-6 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Esta assinatura é administrada manualmente. Para pagar, regularizar ou cancelar, contate
                {" "}{import.meta.env.VITE_SUPPORT_EMAIL || "suporte@octupuzz.com.br"}.
              </p>
          </CardContent>
        </Card>
        )}
      </div>
    </MainLayout>
  );
}
