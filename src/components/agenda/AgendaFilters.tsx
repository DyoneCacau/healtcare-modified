import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Professional, AgendaView } from '@/types/agenda';
import { Clinic } from '@/types/clinic';

interface AgendaFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedProfessional: string;
  onProfessionalChange: (professional: string) => void;
  selectedClinic: string;
  onClinicChange: (clinic: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  view: AgendaView;
  onViewChange: (view: AgendaView) => void;
  professionals: Professional[];
  clinics: Clinic[];
}

export function AgendaFilters({
  selectedDate,
  onDateChange,
  selectedProfessional,
  onProfessionalChange,
  selectedClinic,
  onClinicChange,
  selectedStatus,
  onStatusChange,
  view,
  onViewChange,
  professionals,
  clinics,
}: AgendaFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    onDateChange(newDate);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'min-w-[200px] justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onDateChange(date);
                  setCalendarOpen(false);
                }
              }}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={goToToday}>
          Hoje
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={view} onValueChange={(v) => onViewChange(v as AgendaView)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Visualização" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Dia</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedClinic} onValueChange={onClinicChange}>
          <SelectTrigger className="w-[180px]">
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

        <Select value={selectedProfessional} onValueChange={onProfessionalChange}>
          <SelectTrigger className="w-[180px]">
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

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="return">Retorno</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
