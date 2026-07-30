import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Plus, Trash2 } from 'lucide-react';
import {
  WEEKDAYS_BUSINESS,
  WEEKDAYS_DISPLAY,
  WEEKDAY_LABELS,
  type Weekday,
  type WorkSchedulePeriodInput,
} from '@/types/schedule';
import { validateWorkSchedulePeriods } from '@/lib/scheduleValidation';

interface ProfessionalOption {
  id: string;
  name: string;
}

interface WorkScheduleEditorProps {
  periods: WorkSchedulePeriodInput[];
  onChange: (periods: WorkSchedulePeriodInput[]) => void;
  professionals?: ProfessionalOption[];
  selectedProfessionalId?: string;
  onProfessionalChange?: (professionalId: string) => void;
  disabled?: boolean;
  showProfessionalSelect?: boolean;
}

export function WorkScheduleEditor({
  periods,
  onChange,
  professionals = [],
  selectedProfessionalId,
  onProfessionalChange,
  disabled = false,
  showProfessionalSelect = false,
}: WorkScheduleEditorProps) {
  const updatePeriod = (index: number, patch: Partial<WorkSchedulePeriodInput>) => {
    onChange(periods.map((period, i) => (i === index ? { ...period, ...patch } : period)));
  };

  const removePeriod = (index: number) => {
    onChange(periods.filter((_, i) => i !== index));
  };

  const addPeriod = (weekday: Weekday) => {
    onChange([
      ...periods,
      { weekday, start_time: '08:00', end_time: '12:00', is_active: true },
    ]);
  };

  const toggleDay = (weekday: Weekday, enabled: boolean) => {
    if (enabled) {
      if (!periods.some((p) => p.weekday === weekday)) addPeriod(weekday);
      return;
    }
    onChange(periods.filter((p) => p.weekday !== weekday));
  };

  const copyMondayToBusinessDays = () => {
    const mondayPeriods = periods.filter((p) => p.weekday === 1);
    if (mondayPeriods.length === 0) return;
    const others = periods.filter((p) => !WEEKDAYS_BUSINESS.includes(p.weekday) || p.weekday === 1);
    const copied = WEEKDAYS_BUSINESS.filter((d) => d !== 1).flatMap((weekday) =>
      mondayPeriods.map((p) => ({
        weekday,
        start_time: p.start_time,
        end_time: p.end_time,
        is_active: p.is_active !== false,
      })),
    );
    onChange([...others, ...copied]);
  };

  const validationError = validateWorkSchedulePeriods(periods);

  return (
    <div className="space-y-4">
      {showProfessionalSelect && (
        <div className="space-y-1">
          <Label>Profissional</Label>
          <Select
            value={selectedProfessionalId || ''}
            onValueChange={(value) => onProfessionalChange?.(value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o profissional" />
            </SelectTrigger>
            <SelectContent>
              {professionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>
                  {professional.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Configure os dias e períodos de atendimento nesta clínica.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !periods.some((p) => p.weekday === 1)}
          onClick={copyMondayToBusinessDays}
        >
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copiar segunda para dias úteis
        </Button>
      </div>

      {WEEKDAYS_DISPLAY.map((weekday) => {
        const dayPeriods = periods
          .map((period, index) => ({ period, index }))
          .filter(({ period }) => period.weekday === weekday);
        const enabled = dayPeriods.length > 0;

        return (
          <div
            key={weekday}
            className="rounded-md border border-border/60 p-3 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={enabled}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggleDay(weekday, checked === true)}
                />
                {WEEKDAY_LABELS[weekday]}
              </label>
              {enabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => addPeriod(weekday)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Período
                </Button>
              )}
            </div>

            {dayPeriods.map(({ period, index }) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
              >
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Início</Label>
                  <Input
                    type="time"
                    value={period.start_time}
                    disabled={disabled || period.is_active === false}
                    onChange={(e) => updatePeriod(index, { start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <Input
                    type="time"
                    value={period.end_time}
                    disabled={disabled || period.is_active === false}
                    onChange={(e) => updatePeriod(index, { end_time: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    checked={period.is_active !== false}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      updatePeriod(index, { is_active: checked })
                    }
                  />
                  <span className="text-xs text-muted-foreground">Ativo</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => removePeriod(index)}
                  aria-label="Remover período"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        );
      })}

      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}
    </div>
  );
}
