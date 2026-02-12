import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle,
  DollarSign,
  Percent,
  AlertTriangle,
  User,
  Stethoscope,
  Calculator,
  XCircle,
  ShieldAlert,
  Users,
  TrendingUp,
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
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { AgendaAppointment, leadSourceLabels } from '@/types/agenda';
import { PaymentMethod } from '@/types/financial';
import { CommissionRule, beneficiaryTypeLabels, calculationUnitLabels } from '@/types/commission';
import {
  findApplicableRules,
  calculateCommissionAmount,
  getProcedurePrice,
  formatCommissionInfo,
  validateAppointmentCompletion,
  ValidationResult,
} from '@/services/commissionService';
import { cn } from '@/lib/utils';

interface CompleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment | null;
  onComplete: (
    appointment: AgendaAppointment,
    serviceValue: number,
    paymentMethod: PaymentMethod,
    quantity: number
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
  const [quantity, setQuantity] = useState(1);
  const [applicableRules, setApplicableRules] = useState<CommissionRule[]>([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState<{rule: CommissionRule; amount: number}[]>([]);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [proceedWithoutRule, setProceedWithoutRule] = useState(false);

  useEffect(() => {
    if (appointment) {
      // Reset states
      setProceedWithoutRule(false);
      setQuantity(1);
      
      // Validate appointment completion
      const validationResult = validateAppointmentCompletion(
        appointment,
        commissionRules,
        [],
        true
      );
      setValidation(validationResult);

      // Get suggested price from procedure table
      const suggestedPrice = getProcedurePrice(
        appointment.procedure,
        appointment.clinic.id
      );
      setServiceValue(suggestedPrice);

      // Find ALL applicable commission rules (professional + seller + reception)
      const rules = findApplicableRules(
        commissionRules,
        appointment.professional.id,
        appointment.clinic.id,
        appointment.procedure,
        new Date(appointment.date),
        appointment.sellerId
      );
      setApplicableRules(rules);

      // Calculate breakdown
      const breakdown = rules.map(rule => ({
        rule,
        amount: calculateCommissionAmount(rule, suggestedPrice, 1)
      }));
      setCommissionBreakdown(breakdown);
    }
  }, [appointment, commissionRules]);

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

  const handleComplete = () => {
    if (!appointment || !canComplete()) return;
    onComplete(
      appointment,
      serviceValue,
      paymentMethod,
      quantity
    );
    onOpenChange(false);
  };

  if (!appointment) return null;

  const totalCommission = commissionBreakdown.reduce((sum, item) => sum + item.amount, 0);
  const netValue = serviceValue - totalCommission;
  const hasProfessionalRule = commissionBreakdown.some(b => b.rule.beneficiaryType === 'professional');

  // Check if procedure requires quantity input (ml, arch, unit, session)
  const needsQuantity = applicableRules.some(r => r.calculationUnit !== 'appointment');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Finalizar Atendimento
          </DialogTitle>
          <DialogDescription>
            Registre o pagamento e calcule as comissões
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
                  {appointment.procedure}
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
                      <span className="font-medium">{leadSourceLabels[appointment.leadSource]}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Payment Info */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="serviceValue">Valor do Atendimento</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="serviceValue"
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceValue}
                    onChange={(e) => setServiceValue(parseFloat(e.target.value) || 0)}
                    className="pl-10"
                    disabled={validation.errorCode === 'DUPLICATE'}
                  />
                </div>
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
              <Label>Forma de Pagamento</Label>
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
                        Nenhuma regra de comissão encontrada
                      </p>
                      <p className={cn(
                        "text-xs",
                        validation.errorCode === 'NO_RULE' && !proceedWithoutRule ? "text-destructive/80" : "text-amber-700"
                      )}>
                        {validation.errorCode === 'NO_RULE' && !proceedWithoutRule
                          ? 'Finalize somente se tiver certeza ou configure uma regra antes.'
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!canComplete()}
            className={cn(
              "bg-emerald-600 hover:bg-emerald-700",
              !canComplete() && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Finalizar e Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
