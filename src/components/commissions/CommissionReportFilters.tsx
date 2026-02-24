import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Filter, Download } from 'lucide-react';
import { Clinic } from '@/types/clinic';
import { BeneficiaryType, beneficiaryTypeLabels } from '@/types/commission';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ProfessionalOption {
  id: string;
  name: string;
}

export type PeriodType = 'day' | 'week' | 'month' | 'custom';

interface CommissionReportFiltersProps {
  startDate: string;
  endDate: string;
  periodType: PeriodType;
  selectedClinic: string;
  selectedBeneficiaryType: string;
  selectedProfessional: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onPeriodTypeChange: (type: PeriodType) => void;
  onClinicChange: (clinicId: string) => void;
  onBeneficiaryTypeChange: (type: string) => void;
  onProfessionalChange: (professionalId: string) => void;
  clinics: Clinic[];
  professionals: ProfessionalOption[];
  onExport?: () => void;
}

export function CommissionReportFilters({
  startDate,
  endDate,
  periodType,
  selectedClinic,
  selectedBeneficiaryType,
  selectedProfessional,
  onStartDateChange,
  onEndDateChange,
  onPeriodTypeChange,
  onClinicChange,
  onBeneficiaryTypeChange,
  onProfessionalChange,
  clinics,
  professionals,
  onExport,
}: CommissionReportFiltersProps) {
  const startDateObj = startDate ? new Date(startDate + 'T12:00:00') : new Date();
  const endDateObj = endDate ? new Date(endDate + 'T12:00:00') : new Date();

  const handleDateSelect = (date: Date | undefined, isStart: boolean) => {
    if (!date) return;
    const iso = format(date, 'yyyy-MM-dd');
    if (periodType === 'day') {
      onStartDateChange(iso);
      onEndDateChange(iso);
    } else if (periodType === 'week') {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      onStartDateChange(format(weekStart, 'yyyy-MM-dd'));
      onEndDateChange(format(weekEnd, 'yyyy-MM-dd'));
    } else if (periodType === 'month') {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      onStartDateChange(format(monthStart, 'yyyy-MM-dd'));
      onEndDateChange(format(monthEnd, 'yyyy-MM-dd'));
    } else {
      if (isStart) onStartDateChange(iso);
      else onEndDateChange(iso);
    }
  };

  const dateLabel = periodType === 'day' ? 'Dia' : periodType === 'week' ? 'Semana (clique para escolher)' : periodType === 'month' ? 'Mês (clique para escolher)' : 'Data Inicial';

  return (
    <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Período</Label>
        <Select value={periodType} onValueChange={(v) => onPeriodTypeChange(v as PeriodType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Dia</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {periodType !== 'custom' ? (
        <div className="space-y-1.5">
          <Label className="text-xs">{dateLabel}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-[150px] justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDateObj, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDateObj}
                onSelect={(d) => handleDateSelect(d, true)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-[150px] justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDateObj, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDateObj}
                  onSelect={(d) => { if (d) onStartDateChange(format(d, 'yyyy-MM-dd')); }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Data Final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-[150px] justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDateObj, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDateObj}
                  onSelect={(d) => { if (d) onEndDateChange(format(d, 'yyyy-MM-dd')); }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Clínica</Label>
        <Select value={selectedClinic} onValueChange={onClinicChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as clínicas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as clínicas</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de Beneficiário</Label>
        <Select value={selectedBeneficiaryType} onValueChange={onBeneficiaryTypeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(Object.entries(beneficiaryTypeLabels) as [BeneficiaryType, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Profissional</Label>
        <Select value={selectedProfessional} onValueChange={onProfessionalChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {onExport && (
        <Button variant="outline" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      )}
    </div>
  );
}
