import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AgendaAppointment, Professional, LeadSource, leadSourceLabels } from '@/types/agenda';
import { Clinic } from '@/types/clinic';
import { usePatients } from '@/hooks/usePatients';
import { toast } from 'sonner';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AgendaAppointment | null;
  professionals: Professional[];
  clinics: Clinic[];
  existingAppointments: AgendaAppointment[];
  onSave: (appointment: Partial<AgendaAppointment>) => void;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  professionals,
  clinics,
  existingAppointments,
  onSave,
}: AppointmentFormDialogProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [procedure, setProcedure] = useState('');
  const [status, setStatus] = useState<AgendaAppointment['status']>('pending');
  const [paymentStatus, setPaymentStatus] = useState<AgendaAppointment['paymentStatus']>('pending');
  const [notes, setNotes] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sellerId, setSellerId] = useState<string>('');
  const [leadSource, setLeadSource] = useState<LeadSource | ''>('');

  const { patients } = usePatients();

  const isEditing = !!appointment;

  useEffect(() => {
    if (appointment) {
      setDate(new Date(appointment.date));
      setStartTime(appointment.startTime);
      setEndTime(appointment.endTime);
      setPatientId(appointment.patientId);
      setProfessionalId(appointment.professional.id);
      setClinicId(appointment.clinic.id);
      setProcedure(appointment.procedure);
      setStatus(appointment.status);
      setPaymentStatus(appointment.paymentStatus);
      setNotes(appointment.notes || '');
      setSellerId(appointment.sellerId || '');
      setLeadSource(appointment.leadSource || '');
    } else {
      // Reset form
      setDate(new Date());
      setStartTime('09:00');
      setEndTime('09:30');
      setPatientId('');
      setProfessionalId('');
      setClinicId(clinics[0]?.id || '');
      setProcedure('');
      setStatus('pending');
      setPaymentStatus('pending');
      setNotes('');
      setSellerId('');
      setLeadSource('');
    }
  }, [appointment, open, clinics]);

  const checkConflict = (): boolean => {
    if (!professionalId || !date) return false;

    const dateStr = format(date, 'yyyy-MM-dd');
    const conflicting = existingAppointments.find(
      (apt) =>
        apt.id !== appointment?.id &&
        apt.professional.id === professionalId &&
        apt.date === dateStr &&
        apt.status !== 'cancelled' &&
        ((startTime >= apt.startTime && startTime < apt.endTime) ||
          (endTime > apt.startTime && endTime <= apt.endTime) ||
          (startTime <= apt.startTime && endTime >= apt.endTime))
    );

    return !!conflicting;
  };

  const handleSave = () => {
    if (!patientId || !professionalId || !clinicId || !procedure) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (checkConflict()) {
      toast.error('Conflito de horário detectado para este profissional');
      return;
    }

    const patient = patients.find((p) => p.id === patientId);
    const professional = professionals.find((p) => p.id === professionalId);
    const clinic = clinics.find((c) => c.id === clinicId);

    if (!patient || !professional || !clinic) {
      toast.error('Dados inválidos');
      return;
    }

    onSave({
      id: appointment?.id,
      date: format(date, 'yyyy-MM-dd'),
      startTime,
      endTime,
      patientId,
      patientName: patient.name,
      professional,
      procedure,
      status,
      paymentStatus,
      notes,
      clinic,
      sellerId: sellerId || undefined,
      leadSource: leadSource || undefined,
    });

    onOpenChange(false);
    toast.success(isEditing ? 'Agendamento atualizado!' : 'Agendamento criado!');
  };

  const timeOptions = [];
  for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  const activePatients = patients.filter((p) => p.status === 'active');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Agendamento' : 'Novo Agendamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do agendamento'
              : 'Preencha os dados para criar um novo agendamento'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="patient">Paciente *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {activePatients.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum paciente cadastrado
                  </SelectItem>
                ) : (
                  activePatients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Data *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy') : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="clinic">Clínica *</Label>
              <Select value={clinicId} onValueChange={setClinicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Horário Início *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Horário Fim *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="professional">Profissional *</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum profissional cadastrado
                  </SelectItem>
                ) : (
                  professionals.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name} - {prof.specialty}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="procedure">Procedimento *</Label>
            <Input
              id="procedure"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="Ex: Consulta geral, Limpeza dental..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AgendaAppointment['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="return">Retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Pagamento</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) =>
                  setPaymentStatus(v as AgendaAppointment['paymentStatus'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lead Source */}
          <div className="grid gap-2">
            <Label>Origem do Lead</Label>
            <Select 
              value={leadSource || 'none'} 
              onValueChange={(v) => setLeadSource(v === 'none' ? '' : v as LeadSource)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não informado</SelectItem>
                {(Object.entries(leadSourceLabels) as [LeadSource, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações adicionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Salvar Alterações' : 'Criar Agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
