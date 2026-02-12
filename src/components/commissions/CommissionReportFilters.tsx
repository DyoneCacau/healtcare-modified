import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, Download } from 'lucide-react';
import { Clinic } from '@/types/clinic';
import { BeneficiaryType, beneficiaryTypeLabels } from '@/types/commission';

interface CommissionReportFiltersProps {
  startDate: string;
  endDate: string;
  selectedClinic: string;
  selectedBeneficiaryType: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClinicChange: (clinicId: string) => void;
  onBeneficiaryTypeChange: (type: string) => void;
  clinics: Clinic[];
  onExport?: () => void;
}

export function CommissionReportFilters({
  startDate,
  endDate,
  selectedClinic,
  selectedBeneficiaryType,
  onStartDateChange,
  onEndDateChange,
  onClinicChange,
  onBeneficiaryTypeChange,
  clinics,
  onExport,
}: CommissionReportFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filtros:</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Data Inicial</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="pl-9 w-[150px]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Data Final</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="pl-9 w-[150px]"
          />
        </div>
      </div>

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

      {onExport && (
        <Button variant="outline" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      )}
    </div>
  );
}
