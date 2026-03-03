import { Button } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clinic } from '@/types/clinic';
import { Professional } from '@/types/agenda';
import { getClinicDisplayName } from '@/lib/utils';
import { Calendar, Download, FileSpreadsheet, Printer } from 'lucide-react';

export interface SellerOption {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  selectedClinic: string;
  selectedProfessional: string;
  selectedSeller?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClinicChange: (clinicId: string) => void;
  onProfessionalChange: (professionalId: string) => void;
  onSellerChange?: (sellerId: string) => void;
  clinics: Clinic[];
  professionals: Professional[];
  sellers?: SellerOption[];
  onExportPDF: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  /** Atalhos de período (ex: últimos 3, 6, 12 meses). Opcional. */
  onPeriodShortcut?: (months: '3' | '6' | '12') => void;
  activePeriodShortcut?: '3' | '6' | '12' | 'custom';
}

export function ReportFilters({
  startDate,
  endDate,
  selectedClinic,
  selectedProfessional,
  selectedSeller = 'all',
  onStartDateChange,
  onEndDateChange,
  onClinicChange,
  onProfessionalChange,
  onSellerChange,
  clinics,
  professionals,
  sellers = [],
  onExportPDF,
  onExportExcel,
  onPrint,
  onPeriodShortcut,
  activePeriodShortcut,
}: ReportFiltersProps) {
  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data Inicial
          </Label>
          <DateInput value={startDate} onChange={onStartDateChange} showCalendar />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data Final
          </Label>
          <DateInput value={endDate} onChange={onEndDateChange} showCalendar />
        </div>

        <div className="space-y-2">
          <Label>Clínica</Label>
          <Select value={selectedClinic} onValueChange={onClinicChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as clínicas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as clínicas</SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {getClinicDisplayName(clinic)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Profissional</Label>
          <Select value={selectedProfessional} onValueChange={onProfessionalChange}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {onSellerChange && (
          <div className="space-y-2">
            <Label>Vendedor(a)</Label>
            <Select value={selectedSeller} onValueChange={onSellerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {onPeriodShortcut && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <span className="text-sm text-muted-foreground mr-1">Atalhos:</span>
          <Button variant={activePeriodShortcut === '3' ? 'default' : 'outline'} size="sm" onClick={() => onPeriodShortcut('3')}>
            Últimos 3 meses
          </Button>
          <Button variant={activePeriodShortcut === '6' ? 'default' : 'outline'} size="sm" onClick={() => onPeriodShortcut('6')}>
            Últimos 6 meses
          </Button>
          <Button variant={activePeriodShortcut === '12' ? 'default' : 'outline'} size="sm" onClick={() => onPeriodShortcut('12')}>
            Últimos 12 meses
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onExportPDF}>
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
