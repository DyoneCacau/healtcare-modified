import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSubscription } from "@/hooks/useSubscription";
import {
  asaasBillingService,
  type AsaasInvoice,
  type BillingMethod,
} from "@/services/asaasBillingService";
import { DEFAULT_BILLING_DAY } from "@/lib/billingDay";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileText,
  QrCode,
  RefreshCw,
  ReceiptText,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type PayChoice = Exclude<BillingMethod, "UNDEFINED">;

interface PayPanel {
  invoiceId: string;
  step: "choose" | "result";
  choice: PayChoice | null;
  value: number | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixImage: string | null;
  pixPayload: string | null;
  boletoLine: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleDateString("pt-BR");
}

function monthKey(dueDate: string) {
  const raw = dueDate?.slice(0, 7);
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : "sem-data";
}

function monthLabel(key: string) {
  if (key === "sem-data") return "Sem data";
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Ativa", pending: "Pendente", suspended: "Suspensa", cancelled: "Cancelada",
    paid: "Pago", overdue: "Atrasado", confirmed: "Confirmado", received: "Recebido",
    pix: "Pix", boleto: "Boleto", credit_card: "Cartão",
  };
  return labels[status.toLowerCase()] ?? status;
}

function methodLabel(method: string | null | undefined) {
  if (!method) return "—";
  if (method === "CREDIT_CARD") return "Cartão";
  if (method === "PIX") return "Pix";
  if (method === "BOLETO") return "Boleto";
  if (method === "UNDEFINED") return "A escolher";
  return statusLabel(method.replace("_", " "));
}

function isPaidStatus(status: string) {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status.toUpperCase());
}

function pixImageSrc(encoded: string | null) {
  if (!encoded) return null;
  if (encoded.startsWith("data:")) return encoded;
  return `data:image/png;base64,${encoded}`;
}

/** Conteúdo de cobrança — Configurações e /billing. */
export function BillingContent() {
  const { subscription, plan, isLoading: subscriptionLoading, refreshSubscription } = useSubscription();
  const [invoices, setInvoices] = useState<AsaasInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [payPanel, setPayPanel] = useState<PayPanel | null>(null);

  const loadBilling = useCallback(async (opts?: { silent?: boolean }) => {
    if (!subscription?.id || subscription.billing_provider !== "asaas") {
      setInvoices([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    setLoadError(null);
    try {
      const page = await asaasBillingService.listPayments(subscription.id);
      setInvoices(page.invoices);
    } catch (error) {
      if (!opts?.silent) setInvoices([]);
      setLoadError(error instanceof Error ? error.message : "Não foi possível consultar as cobranças.");
    } finally {
      setLoading(false);
    }
  }, [subscription?.id, subscription?.billing_provider]);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const months = useMemo(() => {
    const map = new Map<string, AsaasInvoice[]>();
    for (const invoice of invoices) {
      const key = monthKey(invoice.dueDate);
      const list = map.get(key) || [];
      list.push(invoice);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [invoices]);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  function openPayPanel(invoice: AsaasInvoice) {
    setPayPanel({
      invoiceId: invoice.id,
      step: "choose",
      choice: null,
      value: invoice.value,
      invoiceUrl: null,
      bankSlipUrl: null,
      pixImage: null,
      pixPayload: null,
      boletoLine: null,
    });
  }

  function closePayPanel() {
    setPayPanel(null);
    setAction(null);
  }

  async function chooseMethod(choice: PayChoice) {
    if (!subscription || !payPanel) return;
    setAction(choice);
    try {
      const result = await asaasBillingService.choosePaymentMethod(
        subscription.id,
        choice,
        payPanel.invoiceId,
      );

      if (choice === "PIX") {
        const image = result.pix?.encoded_image ?? null;
        const payload = result.pix?.payload ?? null;
        if (!image && !payload && !result.invoice_url) {
          throw new Error("Não foi possível gerar o Pix. Cadastre uma chave Pix no Asaas e tente de novo.");
        }
        // Atualiza o painel ANTES de qualquer refresh — o QR fica fixo no estado local
        setPayPanel((prev) => prev && {
          ...prev,
          step: "result",
          choice: "PIX",
          value: result.value ?? prev.value,
          invoiceUrl: result.invoice_url,
          pixImage: image,
          pixPayload: payload,
        });
        toast.success("Pix gerado. QR Code e código estão abaixo.");
        // Só atualiza a lista em silêncio — NÃO chama refreshSubscription (ele zera a tela)
        void loadBilling({ silent: true });
        return;
      }

      if (choice === "BOLETO") {
        const url = result.bank_slip_url ?? result.invoice_url;
        setPayPanel((prev) => prev && {
          ...prev,
          step: "result",
          choice: "BOLETO",
          value: result.value ?? prev.value,
          invoiceUrl: result.invoice_url,
          bankSlipUrl: result.bank_slip_url,
          boletoLine: result.boleto?.identification_field ?? null,
        });
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        toast.success("Boleto pronto. Veja abaixo.");
        void loadBilling({ silent: true });
        return;
      }

      if (!result.invoice_url) {
        throw new Error("Link de cartão indisponível. Tente novamente.");
      }
      setPayPanel((prev) => prev && {
        ...prev,
        step: "result",
        choice: "CREDIT_CARD",
        value: result.value ?? prev.value,
        invoiceUrl: result.invoice_url,
      });
      window.open(result.invoice_url, "_blank", "noopener,noreferrer");
      toast.success("Página do Asaas aberta para o cartão.");
      void loadBilling({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível preparar o pagamento.");
    } finally {
      setAction(null);
    }
  }

  async function syncAfterPayment() {
    if (!subscription) return;
    setAction("sync");
    try {
      const page = await asaasBillingService.listPayments(subscription.id);
      setInvoices(page.invoices);
      setLoadError(null);

      const targetId = payPanel?.invoiceId;
      const updated = targetId
        ? page.invoices.find((invoice) => invoice.id === targetId)
        : null;

      if (updated && isPaidStatus(updated.status)) {
        setPayPanel(null);
        toast.success("Pagamento confirmado! A fatura aparece como Paga.");
        void refreshSubscription();
        return;
      }

      if (updated && !updated.canPay) {
        setPayPanel(null);
        toast.success(`Fatura atualizada: ${statusLabel(updated.status)}`);
        void refreshSubscription();
        return;
      }

      toast.message(
        "No Asaas a cobrança ainda não aparece como recebida. "
        + "Confirme se clicou em Confirmar pagamento na cobrança certa e tente de novo em alguns segundos.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar as faturas.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setAction(null);
    }
  }

  async function enableCardRecurring() {
    if (!subscription) return;
    if (!window.confirm(
      "Cadastrar cartão para débito automático todo mês?\n\n"
      + "O Asaas abre uma página segura. Nas próximas mensalidades o valor é debitado sozinho.",
    )) return;
    setAction("card");
    try {
      const result = await asaasBillingService.enableCardRecurring(subscription.id);
      if (result.invoice_url) {
        toast.success("Abrindo página do Asaas...");
        window.open(result.invoice_url, "_blank", "noopener,noreferrer");
      } else {
        toast.success(result.message);
      }
      void loadBilling({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar o cartão.");
    } finally {
      setAction(null);
    }
  }

  async function cancelBilling() {
    if (!subscription || !window.confirm("Cancelar a assinatura? Novas cobranças deixam de ser geradas.")) return;
    setAction("cancel");
    try {
      await asaasBillingService.cancelSubscription(subscription.id);
      toast.success("Cancelamento solicitado.");
      void loadBilling({ silent: true });
      void refreshSubscription();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cancelar.");
    } finally {
      setAction(null);
    }
  }

  async function copyText(value: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(okMessage);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  }

  const provider = subscription?.billing_provider ?? "manual";
  const billingStatus = subscription?.billing_status ?? subscription?.status ?? "pending";
  const monthlyFee = subscription?.monthly_fee;
  const billingDay = subscription?.billing_day ?? DEFAULT_BILLING_DAY;
  const canCancel = subscription?.can_cancel ?? false;
  const busy = action !== null;
  const showInitialLoading = (subscriptionLoading || loading) && !subscription && invoices.length === 0;
  const qrSrc = pixImageSrc(payPanel?.pixImage ?? null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Minha cobrança
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={provider === "asaas" ? "default" : "secondary"}>
                {provider === "asaas" ? "Asaas" : "Manual"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || loading}
                onClick={() => void loadBilling({ silent: true })}
                title="Atualizar faturas"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showInitialLoading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando...</div>
          ) : !subscription ? (
            <p className="text-muted-foreground">Nenhuma assinatura vinculada à clínica.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="font-medium">{plan?.name ?? "Sem plano"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={billingStatus === "overdue" ? "destructive" : "outline"}>
                  {statusLabel(billingStatus)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vence todo dia</p>
                <p className="font-medium flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />{billingDay}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mensalidade</p>
                <p className="font-medium">{monthlyFee == null ? "—" : currency.format(monthlyFee)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {provider === "asaas" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Histórico de faturas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadError ? (
              <p className="text-sm text-destructive" role="alert">{loadError}</p>
            ) : months.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">Nenhuma fatura disponível ainda.</p>
            ) : (
              months.map(([key, items]) => {
                const isCurrent = key === currentMonthKey;
                return (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{monthLabel(key)}</h3>
                      {isCurrent && <Badge>Mês atual</Badge>}
                    </div>
                    <div className="space-y-3">
                      {items.map((invoice) => {
                        const paid = isPaidStatus(invoice.status);
                        const expanded = payPanel?.invoiceId === invoice.id;
                        return (
                          <div
                            key={invoice.id}
                            className={cn(
                              "rounded-lg border overflow-hidden",
                              isCurrent && invoice.canPay && "border-primary/40",
                              expanded && "border-primary ring-1 ring-primary/20",
                            )}
                          >
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong>{currency.format(invoice.value)}</strong>
                                  <Badge variant={invoice.status === "OVERDUE" ? "destructive" : paid ? "default" : "secondary"}>
                                    {paid ? "Pago" : statusLabel(invoice.status)}
                                  </Badge>
                                  <Badge variant="outline">{methodLabel(invoice.billingType)}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {invoice.description ? `${invoice.description} · ` : ""}
                                  Vencimento: {formatDate(invoice.dueDate)}
                                  {invoice.paymentDate ? ` · Pago em ${formatDate(invoice.paymentDate)}` : ""}
                                </p>
                              </div>
                              {invoice.canPay && (
                                <Button
                                  type="button"
                                  variant={expanded ? "secondary" : "default"}
                                  onClick={() => (expanded ? closePayPanel() : openPayPanel(invoice))}
                                >
                                  {expanded ? "Fechar" : "Pagar"}
                                </Button>
                              )}
                            </div>

                            {/* Expande retangular abaixo da fatura */}
                            {expanded && payPanel && (
                              <div className="border-t bg-muted/40 p-4 space-y-4">
                                {payPanel.step === "choose" && (
                                  <>
                                    <p className="text-sm font-medium">Escolha a forma de pagamento</p>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-auto flex-col gap-1 py-4 bg-background"
                                        disabled={busy}
                                        onClick={() => void chooseMethod("PIX")}
                                      >
                                        <QrCode className="h-5 w-5" />
                                        <span className="font-medium">{action === "PIX" ? "Gerando..." : "Pix"}</span>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-auto flex-col gap-1 py-4 bg-background"
                                        disabled={busy}
                                        onClick={() => void chooseMethod("BOLETO")}
                                      >
                                        <FileText className="h-5 w-5" />
                                        <span className="font-medium">{action === "BOLETO" ? "Gerando..." : "Boleto"}</span>
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-auto flex-col gap-1 py-4 bg-background"
                                        disabled={busy}
                                        onClick={() => void chooseMethod("CREDIT_CARD")}
                                      >
                                        <CreditCard className="h-5 w-5" />
                                        <span className="font-medium">{action === "CREDIT_CARD" ? "Abrindo..." : "Cartão"}</span>
                                        <span className="text-xs font-normal text-muted-foreground">Crédito/débito</span>
                                      </Button>
                                    </div>
                                  </>
                                )}

                                {payPanel.step === "result" && payPanel.choice === "PIX" && (
                                  <div className="space-y-4 rounded-lg border bg-background p-4">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-medium">Pix gerado</p>
                                        <p className="text-sm text-muted-foreground">
                                          {payPanel.value != null ? `${currency.format(payPanel.value)} · ` : ""}
                                          QR Code válido do Asaas. No sandbox, confirme o pagamento no painel Asaas
                                          (não precisa pagar de verdade). Em produção, pague pelo app do banco.
                                        </p>
                                      </div>
                                      <Button type="button" variant="ghost" size="icon" onClick={closePayPanel}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {qrSrc ? (
                                      <div className="flex justify-center rounded-lg border bg-white p-4">
                                        <img src={qrSrc} alt="QR Code Pix" className="h-56 w-56" />
                                      </div>
                                    ) : (
                                      <p className="text-sm text-amber-700 dark:text-amber-300">
                                        QR visual indisponível. Use o Pix copia e cola abaixo.
                                      </p>
                                    )}
                                    {payPanel.pixPayload && (
                                      <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Pix copia e cola</p>
                                        <p className="break-all rounded-md border bg-muted p-3 text-xs font-mono">
                                          {payPanel.pixPayload}
                                        </p>
                                        <Button
                                          type="button"
                                          onClick={() => void copyText(payPanel.pixPayload!, "Código Pix copiado")}
                                        >
                                          Copiar código Pix
                                        </Button>
                                      </div>
                                    )}
                                    {!qrSrc && !payPanel.pixPayload && payPanel.invoiceUrl && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.open(payPanel.invoiceUrl!, "_blank", "noopener,noreferrer")}
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Abrir fatura (fallback)
                                      </Button>
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() => void syncAfterPayment()}
                                      >
                                        {action === "sync" ? "Atualizando..." : "Já paguei — atualizar"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setPayPanel((prev) => prev && { ...prev, step: "choose", choice: null })}
                                      >
                                        Outra forma
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {payPanel.step === "result" && payPanel.choice === "BOLETO" && (
                                  <div className="space-y-4 rounded-lg border bg-background p-4">
                                    <p className="font-medium">Boleto</p>
                                    {payPanel.boletoLine && (
                                      <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground">Linha digitável</p>
                                        <p className="break-all rounded-md border bg-muted p-3 text-xs font-mono">
                                          {payPanel.boletoLine}
                                        </p>
                                        <Button
                                          type="button"
                                          onClick={() => void copyText(payPanel.boletoLine!, "Linha digitável copiada")}
                                        >
                                          Copiar linha digitável
                                        </Button>
                                      </div>
                                    )}
                                    {(payPanel.bankSlipUrl || payPanel.invoiceUrl) && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          const url = payPanel.bankSlipUrl ?? payPanel.invoiceUrl;
                                          if (url) window.open(url, "_blank", "noopener,noreferrer");
                                        }}
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Abrir boleto
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => setPayPanel((prev) => prev && { ...prev, step: "choose", choice: null })}
                                    >
                                      Outra forma
                                    </Button>
                                  </div>
                                )}

                                {payPanel.step === "result" && payPanel.choice === "CREDIT_CARD" && (
                                  <div className="space-y-4 rounded-lg border bg-background p-4">
                                    <p className="text-sm">
                                      Informe o cartão na página segura do Asaas. Os dados não ficam no HealthCare.
                                    </p>
                                    {payPanel.invoiceUrl && (
                                      <Button
                                        type="button"
                                        onClick={() => window.open(payPanel.invoiceUrl!, "_blank", "noopener,noreferrer")}
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Abrir pagamento no Asaas
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => setPayPanel((prev) => prev && { ...prev, step: "choose", choice: null })}
                                    >
                                      Outra forma
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {provider === "asaas" && canCancel && (
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <Card>
            <CardHeader className="py-4">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                  <span className="text-sm font-medium text-muted-foreground">Mais opções</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium text-sm">Débito automático no cartão</p>
                  <p className="text-sm text-muted-foreground">
                    Opcional: cadastra o cartão uma vez para as próximas mensalidades.
                  </p>
                  <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void enableCardRecurring()}>
                    Cadastrar cartão para débito automático
                  </Button>
                </div>
                <div className="rounded-lg border border-destructive/30 p-4 space-y-2">
                  <p className="font-medium text-sm">Cancelar assinatura</p>
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void cancelBilling()}>
                    Solicitar cancelamento
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {provider === "manual" && (
        <Card>
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Cobrança manual. Contate {import.meta.env.VITE_SUPPORT_EMAIL || "suporte@octupuzz.com.br"}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Billing() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <BillingContent />
      </div>
    </MainLayout>
  );
}
