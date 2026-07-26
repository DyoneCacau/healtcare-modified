import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle,
  DollarSign,
  User,
  Stethoscope,
  Calculator,
  XCircle,
  ShieldAlert,
  Users,
  TrendingUp,
  CalendarPlus,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DateInput } from '@/components/ui/date-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { AgendaAppointment } from '@/types/agenda';
import { LeadSourceBadge } from '@/components/crm/LeadSourceBadge';
import { PaymentMethod } from '@/types/financial';
import { CommissionRule, beneficiaryTypeLabels, calculationUnitLabels } from '@/types/commission';
import {
  findApplicableRules,
  calculateCommissionAmount,
  formatCommissionInfo,
  validateAppointmentCompletion,
  ValidationResult,
} from '@/services/commissionService';
import { cn } from '@/lib/utils';
import { remainingAfterBookingFee } from '@/lib/bookingFee';
import { AppointmentMaterialsEditor } from '@/components/agenda/AppointmentMaterialsEditor';
import { useProcedureMaterials } from '@/hooks/useProcedureMaterials';
import { useInventoryProducts } from '@/hooks/useInventory';
import { useClinicProcedures } from '@/hooks/useClinicProcedures';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { parseQuantityInput } from '@/lib/quantityInput';
import type { AppointmentMaterialUsageInput, ProcedureMaterialDraft } from '@/types/procedureMaterial';
import { toast } from 'sonner';

export interface CommissionBreakdownItem {
  rule: CommissionRule;
  amount: number;
}

export type BillingDestination = 'cash' | 'receivable';

interface CompleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment | null;
  onComplete: (
    appointment: AgendaAppointment,
    serviceValue: number,
    paymentMethod: PaymentMethod,
    quantity: number,
    commissionBreakdown: CommissionBreakdownItem[],
    scheduleReturn?: boolean,
    adjustmentReason?: string,
    billingDestination?: BillingDestination,
    dueDate?: string,
    materialsUsage?: AppointmentMaterialUsageInput[],
  ) => void;
  commissionRules?: CommissionRule[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function CompleteAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onComplete,
  commissionRules = [],
}: CompleteAppointmentDialogProps) {
  const [serviceValue, setServiceValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [billingDestination, setBillingDestination] = useState<BillingDestination>('cash');
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantity, setQuantity] = useState(1);
  const [applicableRules, setApplicableRules] = useState<CommissionRule[]>([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState<{rule: CommissionRule; amount: number}[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [proceedWithoutRule, setProceedWithoutRule] = useState(false);
  const [scheduleReturn, setScheduleReturn] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [materialDrafts, setMaterialDrafts] = useState<ProcedureMaterialDraft[]>([]);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('');
  const [materialsTouched, setMaterialsTouched] = useState(false);
  const [materialsConfirmed, setMaterialsConfirmed] = useState(false);

  const { isSuperAdmin } = useAuth();
  const { can } = usePermissions();
  const canOverrideStock = isSuperAdmin || can('estoque_liberar', 'can_edit');
  const { activeProcedures } = useClinicProcedures();
  const { materials: templateMaterials } = useProcedureMaterials(selectedProcedureId || null);
  const { activeProducts } = useInventoryProducts();

  const selectedProcedure = useMemo(
    () => activeProcedures.find((p) => p.id === selectedProcedureId) || null,
    [activeProcedures, selectedProcedureId],
  );

  // Reset do formulário ao abrir o diálogo (não depende de activeProcedures — isso apagava as linhas)
  useEffect(() => {
    if (!open || !appointment) return;

    setProceedWithoutRule(false);
    setScheduleReturn(false);
    setAdjustmentReason('');
    setQuantity(1);
    setBillingDestination('cash');
    setDueDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('pix');
    setOverrideEnabled(false);
    setOverrideReason('');
    setMaterialDrafts([
      {
        key: `material-${appointment.id}-seed`,
        productId: '',
        productName: '',
        productUnit: 'un',
        quantity: '',
        currentStock: 0,
        fromTemplate: false,
      },
    ]);
    setMaterialsTouched(false);
    setMaterialsConfirmed(false);
    setSelectedProcedureId(appointment.procedureId || '');
    setServiceValue(appointment.procedurePrice ?? 150);
  }, [open, appointment?.id]);

  // Validação e regras de comissão (não reseta materiais)
  useEffect(() => {
    if (!appointment) return;

    setValidation(
      validateAppointmentCompletion(appointment, commissionRules, [], true),
    );

    const rules = findApplicableRules(
      commissionRules,
      appointment.professional.id,
      appointment.clinic.id,
      appointment.procedure,
      new Date(appointment.date),
      appointment.sellerId,
    );
    setApplicableRules(rules);
  }, [
    appointment?.id,
    appointment?.professional.id,
    appointment?.clinic.id,
    appointment?.procedure,
    appointment?.date,
    appointment?.sellerId,
    commissionRules,
  ]);

  // Resolve procedimento do catálogo quando a lista carregar (sem limpar materiais nem sobrescrever troca manual)
  useEffect(() => {
    if (!appointment || activeProcedures.length === 0) return;

    setSelectedProcedureId((prev) => {
      if (prev && activeProcedures.some((p) => p.id === prev)) return prev;

      if (appointment.procedureId) {
        const byId = activeProcedures.find((p) => p.id === appointment.procedureId);
        if (byId) return byId.id;
      }

      const matchedByName = activeProcedures.find(
        (p) => p.name.trim().toLowerCase() === (appointment.procedure || '').trim().toLowerCase(),
      );
      return matchedByName?.id || prev || '';
    });
  }, [appointment?.id, appointment?.procedureId, appointment?.procedure, activeProcedures]);

  // Preço do catálogo só quando o agendamento não tem snapshot e ainda está no valor padrão
  useEffect(() => {
    if (!appointment || appointment.procedurePrice != null || !selectedProcedureId) return;
    const proc = activeProcedures.find((p) => p.id === selectedProcedureId);
    if (!proc) return;
    setServiceValue((prev) => (prev === 150 ? proc.default_price : prev));
  }, [appointment?.id, appointment?.procedurePrice, selectedProcedureId, activeProcedures]);

  // Preenche materiais sugeridos do procedimento (só se o usuário ainda não editou)
  useEffect(() => {
    if (!appointment || materialsTouched) return;

    if (templateMaterials.length > 0) {
      setMaterialDrafts(
        templateMaterials.map((m) => ({
          key: m.id,
          productId: m.product_id,
          productName: m.product_name || '',
          productUnit: m.product_unit || 'un',
          quantity: String(m.default_quantity).replace('.', ','),
          currentStock: Number(m.current_stock) || 0,
          fromTemplate: true,
        })),
      );
      return;
    }

    setMaterialDrafts((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          key: `material-${appointment.id}-empty`,
          productId: '',
          productName: '',
          productUnit: 'un',
          quantity: '',
          currentStock: 0,
          fromTemplate: false,
        },
      ];
    });
  }, [appointment?.id, selectedProcedureId, templateMaterials, materialsTouched]);

  const handleMaterialsChange = useCallback((next: ProcedureMaterialDraft[]) => {
    setMaterialsTouched(true);
    setMaterialDrafts(
      next.length > 0
        ? next
        : [
            {
              key: `material-${Date.now()}`,
              productId: '',
              productName: '',
              productUnit: 'un',
              quantity: '',
              currentStock: 0,
              fromTemplate: false,
            },
          ],
    );
  }, []);

  useEffect(() => {
    if (applicableRules.length > 0 && serviceValue > 0) {
      const breakdown = applicableRules.map(rule => ({
        rule,
        amount: calculateCommissionAmount(rule, serviceValue, quantity)
      }));
      setCommissionBreakdown(breakdown);
    }
  }, [serviceValue, quantity, applicableRules]);

  const canComplete = () => {
    // If duplicate, never allow
    if (validation.errorCode === 'DUPLICATE') return false;
    
    // If no rule but user acknowledged
    if (validation.errorCode === 'NO_RULE' && proceedWithoutRule) return true;
    
    // If valid
    return validation.isValid;
  };

  const buildMaterialsUsage = (): AppointmentMaterialUsageInput[] | null => {
    const usage: AppointmentMaterialUsageInput[] = [];
    for (const draft of materialDrafts) {
      if (!draft.productId && !draft.quantity.trim()) continue;
      if (!draft.productId) {
        toast.error('Selecione o material em todas as linhas preenchidas');
        return null;
      }
      const qty = parseQuantityInput(draft.quantity);
      if (qty == null) {
        toast.error(`Quantidade inválida em ${draft.productName || 'material'}. Digite um valor como 1 ou 0,2`);
        return null;
      }
      const insufficient = qty > draft.currentStock;
      if (insufficient && !(canOverrideStock && overrideEnabled)) {
        toast.error('Há material sem estoque suficiente. Libere com permissão ou ajuste a quantidade.');
        return null;
      }
      usage.push({
        productId: draft.productId,
        productName: draft.productName,
        productUnit: draft.productUnit,
        quantity: qty,
        overridden: insufficient,
        overrideReason: insufficient ? (overrideReason.trim() || 'Liberado sem saldo') : undefined,
      });
    }
    return usage;
  };

  const handleProcedureChange = (procedureId: string) => {
    setSelectedProcedureId(procedureId);
    setMaterialsTouched(false);
    setMaterialDrafts([]);
    const proc = activeProcedures.find((p) => p.id === procedureId);
    if (proc) {
      setServiceValue(proc.default_price);
    }
  };

  const handleComplete = () => {
    if (!appointment || !canComplete()) return;
    const materialsUsage = buildMaterialsUsage();
    if (materialsUsage == null) return;
    if (!materialsConfirmed) {
      toast.error('Confirme que conferiu os materiais usados no procedimento antes de finalizar');
      return;
    }

    const completedAppointment: AgendaAppointment = {
      ...appointment,
      procedureId: selectedProcedureId || appointment.procedureId,
      procedure: selectedProcedure?.name || appointment.procedure,
      procedurePrice: selectedProcedure?.default_price ?? appointment.procedurePrice,
    };

    onComplete(
      completedAppointment,
      serviceValue,
      paymentMethod,
      quantity,
      commissionBreakdown,
      scheduleReturn,
      adjustmentReason.trim() || undefined,
      billingDestination,
      billingDestination === 'receivable' ? dueDate : undefined,
      materialsUsage,
    );
    onOpenChange(false);
  };

  if (!appointment) return null;

  const bookingFee = appointment.bookingFee ?? 0;
  const remainingToCharge = remainingAfterBookingFee(serviceValue, bookingFee);
  const totalCommission = commissionBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const netValue = serviceValue - totalCommission;
  const hasProfessionalRule = commissionBreakdown.some(b => b.rule.beneficiaryType === 'professional');

  // Check if procedure requires quantity input (ml, arch, unit, session)
  const needsQuantity = applicableRules.some(r => r.calculationUnit !== 'appointment');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        // Evita o Dialog “roubar” o foco/clique do seletor de materiais
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Finalizar Atendimento
          </DialogTitle>
          <DialogDescription>
            {bookingFee > 0
              ? 'O sinal já pago é abatido do procedimento. Escolha o destino do saldo restante.'
              : 'Escolha receber agora no Caixa ou lançar em Contas a receber'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Errors */}
          {!validation.isValid && validation.errorCode === 'DUPLICATE' && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Cálculo Duplicado Detectado
                  </p>
                  <p className="text-xs text-destructive/80">
                    {validation.error}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appointment Info */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{appointment.patientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.professional.name}</span>
                <Badge variant="outline" className="ml-auto">
                  {selectedProcedure?.name || appointment.procedure}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}{' '}
                às {appointment.startTime}
              </div>
              {/* Seller and Lead Source info */}
              {(appointment.sellerName || appointment.leadSource) && (
                <div className="flex items-center gap-4 pt-2 border-t border-border/50 text-xs">
                  {appointment.sellerName && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Vendedor:</span>
                      <span className="font-medium">{appointment.sellerName}</span>
                    </div>
                  )}
                  {appointment.leadSource && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Origem:</span>
                      <LeadSourceBadge source={appointment.leadSource} className="text-[11px]" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-2">
            <Label>Procedimento realizado</Label>
            <Select
              value={selectedProcedureId || undefined}
              onValueChange={handleProcedureChange}
              disabled={validation.errorCode === 'DUPLICATE'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {activeProcedures.map((proc) => (
                  <SelectItem key={proc.id} value={proc.id}>
                    {proc.name}
                    {proc.category ? ` · ${proc.category}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ao trocar o procedimento, os materiais sugeridos são recarregados e podem ser editados.
            </p>
          </div>

          <AppointmentMaterialsEditor
            drafts={materialDrafts}
            products={activeProducts.map((p) => ({
              id: p.id,
              name: p.name,
              unit: p.unit,
              current_stock: Number(p.current_stock) || 0,
            }))}
            canOverride={canOverrideStock}
            overrideEnabled={overrideEnabled}
            overrideReason={overrideReason}
            procedureLabel={selectedProcedure?.name || appointment.procedure}
            onOverrideEnabledChange={setOverrideEnabled}
            onOverrideReasonChange={setOverrideReason}
            onChange={handleMaterialsChange}
          />

          <Separator />

          {/* Payment Info */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="serviceValue">Valor do Atendimento</Label>
                <CurrencyInput
                  id="serviceValue"
                  value={serviceValue}
                  onValueChange={setServiceValue}
                  disabled={validation.errorCode === 'DUPLICATE'}
                />
                <p className="text-xs text-muted-foreground">
                  Valor sugerido pelo catálogo. Edite para aplicar desconto, indicação ou negociação.
                </p>
              </div>

              {needsQuantity && (
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantidade/Unidades</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    disabled={validation.errorCode === 'DUPLICATE'}
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjustmentReason">Observação sobre preço (opcional)</Label>
              <Textarea
                id="adjustmentReason"
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                placeholder="Ex.: desconto por indicação, condição especial..."
                rows={2}
                disabled={validation.errorCode === 'DUPLICATE'}
              />
              {appointment.leadSource === 'referral' && (
                <p className="text-xs text-muted-foreground">
                  Atendimento por indicação{appointment.referralName ? `: ${appointment.referralName}` : ''}.
                </p>
              )}
            </div>

            {bookingFee > 0 && (
              <Card className="border-emerald-200 bg-emerald-50/60">
                <CardContent className="p-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Valor do procedimento</span>
                    <span className="font-medium">{formatCurrency(serviceValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sinal já pago no agendamento</span>
                    <span className="font-medium text-emerald-700">− {formatCurrency(bookingFee)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {remainingToCharge > 0
                        ? (billingDestination === 'receivable' ? 'Saldo a lançar a receber' : 'Saldo a receber agora')
                        : 'Saldo restante'}
                    </span>
                    <span className="font-semibold text-emerald-800">{formatCurrency(remainingToCharge)}</span>
                  </div>
                  {remainingToCharge <= 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      O procedimento fica quitado com o sinal já lançado no caixa. Nada será cobrado agora.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {remainingToCharge > 0 && (
              <>
                <div className="grid gap-2">
                  <Label>{bookingFee > 0 ? 'Destino do saldo' : 'Destino do valor'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={billingDestination === 'cash' ? 'default' : 'outline'}
                      className="justify-start h-auto py-3"
                      disabled={validation.errorCode === 'DUPLICATE'}
                      onClick={() => setBillingDestination('cash')}
                    >
                      <DollarSign className="mr-2 h-4 w-4 shrink-0" />
                      <span className="text-left">
                        <span className="block text-sm font-medium">Receber agora</span>
                        <span className="block text-xs font-normal opacity-80">
                          Lança {formatCurrency(remainingToCharge)} no Caixa
                        </span>
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant={billingDestination === 'receivable' ? 'default' : 'outline'}
                      className="justify-start h-auto py-3"
                      disabled={validation.errorCode === 'DUPLICATE'}
                      onClick={() => setBillingDestination('receivable')}
                    >
                      <Wallet className="mr-2 h-4 w-4 shrink-0" />
                      <span className="text-left">
                        <span className="block text-sm font-medium">Contas a receber</span>
                        <span className="block text-xs font-normal opacity-80">
                          Cobrar {formatCurrency(remainingToCharge)} depois
                        </span>
                      </span>
                    </Button>
                  </div>
                </div>

                {billingDestination === 'cash' ? (
                  <div className="grid gap-2">
                    <Label>{bookingFee > 0 ? 'Forma de Pagamento do saldo' : 'Forma de Pagamento'}</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                      disabled={validation.errorCode === 'DUPLICATE'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="credit">Cartão Crédito</SelectItem>
                        <SelectItem value="debit">Cartão Débito</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="voucher">Voucher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label>Vencimento</Label>
                    <DateInput
                      value={dueDate}
                      onChange={setDueDate}
                      disabled={validation.errorCode === 'DUPLICATE'}
                    />
                    <p className="text-xs text-muted-foreground">
                      O saldo fica em aberto até a baixa em Contas a receber (que gera o lançamento no Caixa).
                      O sinal já pago permanece no caixa com origem no agendamento.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Commission Calculation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="font-medium">Cálculo de Comissões</span>
              {commissionBreakdown.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {commissionBreakdown.length} regra(s)
                </Badge>
              )}
            </div>

            {commissionBreakdown.length > 0 ? (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  {/* Individual commission breakdowns */}
                  <div className="space-y-2">
                    {commissionBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 rounded-lg bg-background">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {beneficiaryTypeLabels[item.rule.beneficiaryType]}
                          </Badge>
                          <span className="text-muted-foreground">
                            {item.rule.beneficiaryName || appointment.professional.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {item.rule.calculationType === 'percentage' 
                              ? `${item.rule.value}%` 
                              : `R$ ${item.rule.value}/${calculationUnitLabels[item.rule.calculationUnit]?.split(' ')[1] || 'atend.'}`
                            }
                          </span>
                          <span className="font-semibold text-amber-700">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div className="p-2 rounded-lg bg-background">
                      <p className="text-xs text-muted-foreground">Valor Bruto</p>
                      <p className="font-semibold text-sm">{formatCurrency(serviceValue)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs text-amber-700">Total Comissões</p>
                      <p className="font-semibold text-sm text-amber-700">
                        {formatCurrency(totalCommission)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-xs text-emerald-700">Líquido Clínica</p>
                      <p className="font-semibold text-sm text-emerald-700">
                        {formatCurrency(netValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className={cn(
                "border-amber-200 bg-amber-50",
                validation.errorCode === 'NO_RULE' && !proceedWithoutRule && "border-destructive bg-destructive/10"
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className={cn(
                      "h-5 w-5 flex-shrink-0",
                      validation.errorCode === 'NO_RULE' && !proceedWithoutRule ? "text-destructive" : "text-amber-600"
                    )} />
                    <div>
                      <p className={cn(
                        "text-sm font-medium",
                        validation.errorCode === 'NO_RULE' && !proceedWithoutRule ? "text-destructive" : "text-amber-800"
                      )}>
                        {commissionRules.length === 0
                          ? 'Nenhuma regra de comissão cadastrada'
                          : 'Nenhuma regra de comissão encontrada para este atendimento'
                        }
                      </p>
                      <p className={cn(
                        "text-xs",
                        validation.errorCode === 'NO_RULE' && !proceedWithoutRule ? "text-destructive/80" : "text-amber-700"
                      )}>
                        {commissionRules.length === 0
                          ? 'Cadastre regras em Comissões antes de finalizar.'
                          : validation.errorCode === 'NO_RULE' && !proceedWithoutRule
                            ? `Nenhuma regra para ${appointment.professional.name} + ${appointment.procedure}. Adicione em Comissões ou use "Todos" para profissionais/procedimentos.`
                            : 'O atendimento será registrado sem comissão.'
                        }
                      </p>
                    </div>
                  </div>
                  
                  {validation.errorCode === 'NO_RULE' && (
                    <div className="flex items-center space-x-2 pt-2 border-t border-amber-200">
                      <Checkbox
                        id="proceedWithoutRule"
                        checked={proceedWithoutRule}
                        onCheckedChange={(checked) => setProceedWithoutRule(checked === true)}
                      />
                      <label
                        htmlFor="proceedWithoutRule"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Confirmo que desejo prosseguir sem regra de comissão
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Opção de agendar retorno */}
          <div className="flex items-center space-x-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <Checkbox
              id="scheduleReturn"
              checked={scheduleReturn}
              onCheckedChange={(checked) => setScheduleReturn(checked === true)}
            />
            <label
              htmlFor="scheduleReturn"
              className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
            >
              <CalendarPlus className="h-4 w-4 text-primary" />
              Agendar retorno após finalizar
            </label>
          </div>

          <div className="flex items-start space-x-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
            <Checkbox
              id="materialsConfirmed"
              checked={materialsConfirmed}
              onCheckedChange={(checked) => setMaterialsConfirmed(checked === true)}
              disabled={validation.errorCode === 'DUPLICATE'}
            />
            <label
              htmlFor="materialsConfirmed"
              className="text-sm leading-snug cursor-pointer"
            >
              <span className="font-medium">Confirmei os materiais usados no procedimento</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                Revise marca e quantidade (ml/un). Depois da finalização ainda é possível editar na Agenda; tudo fica na auditoria.
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!canComplete() || !materialsConfirmed}
            className={cn(
              "bg-emerald-600 hover:bg-emerald-700",
              (!canComplete() || !materialsConfirmed) && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {remainingToCharge <= 0
              ? 'Finalizar (quitado com sinal)'
              : billingDestination === 'receivable'
                ? 'Finalizar e lançar a receber'
                : 'Finalizar e Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
