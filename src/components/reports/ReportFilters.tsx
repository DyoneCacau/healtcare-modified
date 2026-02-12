import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Calendar, Download, FileSpreadsheet, Printer } from 'lucide-react';

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  selectedClinic: string;
  selectedProfessional: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClinicChange: (clinicId: string) => void;
  onProfessionalChange: (professionalId: string) => void;
  clinics: Clinic[];
  professionals: Professional[];
  onExportPDF: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

export function ReportFilters({
  startDate,
  endDate,
  selectedClinic,
  selectedProfessional,
  onStartDateChange,
  onEndDateChange,
  onClinicChange,
  onProfessionalChange,
  clinics,
  professionals,
  onExportPDF,
  onExportExcel,
  onPrint,
}: ReportFiltersProps) {
  return (
    <div className="space-y-4 bg-card p-4 rounded-lg border">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data Inicial
          </Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Data Final
          </Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
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
                  {clinic.name}
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
      </div>

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
