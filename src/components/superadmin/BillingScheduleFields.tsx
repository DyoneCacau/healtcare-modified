import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import {
  BILLING_DAYS,
  buildBillingSchedulePreview,
  billingDayFromIsoDate,
  defaultPromoFirstDueDate,
} from "@/lib/billingDay";

export interface BillingScheduleValue {
  billingDay: number;
  scheduleFirstCharge: boolean;
  firstDueDate: string;
}

interface Props {
  monthlyFee: number;
  value: BillingScheduleValue;
  onChange: (next: BillingScheduleValue) => void;
}

export function BillingScheduleFields({ monthlyFee, value, onChange }: Props) {
  const preview = buildBillingSchedulePreview(monthlyFee, value.billingDay, {
    scheduleFirstCharge: value.scheduleFirstCharge,
    firstDueDate: value.firstDueDate,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-md border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="schedule-first-charge">Agendar 1ª mensalidade (promo)</Label>
          <p className="text-xs text-muted-foreground">
            Desligado = cobrança imediata com proporcional. Ligado = você escolhe a data no calendário.
          </p>
        </div>
        <Switch
          id="schedule-first-charge"
          checked={value.scheduleFirstCharge}
          onCheckedChange={(checked) => {
            onChange({
              ...value,
              scheduleFirstCharge: checked,
              firstDueDate: checked
                ? (value.firstDueDate || defaultPromoFirstDueDate())
                : value.firstDueDate,
            });
          }}
        />
      </div>

      {value.scheduleFirstCharge ? (
        <div className="space-y-2">
          <Label>Data da 1ª mensalidade *</Label>
          <DateInput
            showCalendar
            value={value.firstDueDate}
            onChange={(iso) => {
              if (!iso) return;
              onChange({
                billingDay: billingDayFromIsoDate(iso),
                scheduleFirstCharge: true,
                firstDueDate: iso,
              });
            }}
          />
          <p className="text-xs text-muted-foreground">
            O dia do mês dessa data vira o vencimento recorrente (máx. dia 28).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Dia de vencimento recorrente *</Label>
          <Select
            value={String(value.billingDay)}
            onValueChange={(v) =>
              onChange({ ...value, billingDay: Number(v), scheduleFirstCharge: false })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o dia" />
            </SelectTrigger>
            <SelectContent>
              {BILLING_DAYS.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  Todo dia {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {monthlyFee > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          {preview.summary}
        </div>
      )}
    </div>
  );
}
