import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, HelpCircle } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { getClinicDisplayName } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AgendaAppointment, Professional, LeadSource, leadSourceLabels } from '@/types/agenda';
import { PaymentMethod } from '@/types/financial';
import { Clinic } from '@/types/clinic';
import { usePatients } from '@/hooks/usePatients';
import { PROCEDURE_OPTIONS } from '@/lib/procedures';
import { toast } from 'sonner';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AgendaAppointment | null;
  professionals: Professional[];
  clinics: Clinic[];
  existingAppointments: AgendaAppointment[];
  onSave: (appointment: Partial<AgendaAppointment>) => Promise<void>;
  /** Pré-preenche paciente e procedimento (ex: vindo do Alerta de Retorno) */
  prefillPatientId?: string | null;
  prefillProcedure?: string;
  /** Data inicial ao criar (ex: data selecionada na Agenda) */
  initialDate?: Date;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  professionals,
  clinics,
  existingAppointments,
  onSave,
  prefillPatientId,
  prefillProcedure,
  initialDate,
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
  const [referralName, setReferralName] = useState('');
  const [customProcedure, setCustomProcedure] = useState('');
  const [bookingFee, setBookingFee] = useState<number | null>(null);
  const [bookingFeePaymentMethod, setBookingFeePaymentMethod] = useState<PaymentMethod | null>(null);

  const { patients } = usePatients();

  const isEditing = !!appointment;
  const prevOpenRef = useRef(false);

  // Só carrega dados quando o diálogo ABRE (transição closed → open)
  // Edição: usa sempre a data do agendamento. Novo: usa initialDate ou hoje.
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (!justOpened) return;

    if (appointment) {
      // Edição: preservar data e todos os dados do agendamento
      setDate(new Date(appointment.date));
      setStartTime(appointment.startTime);
      setEndTime(appointment.endTime);
      setPatientId(appointment.patientId);
      setProfessionalId(appointment.professional.id);
      setClinicId(appointment.clinic.id);
      setProcedure(PROCEDURE_OPTIONS.includes(appointment.procedure as any) ? appointment.procedure : 'Outros');
      setStatus(appointment.status);
      setPaymentStatus(appointment.paymentStatus);
      setNotes(appointment.notes || '');
      setSellerId(appointment.sellerId || '');
      setLeadSource(appointment.leadSource || '');
      setReferralName(appointment.referralName || '');
      setCustomProcedure(PROCEDURE_OPTIONS.includes(appointment.procedure as any) ? '' : appointment.procedure);
      setBookingFee(appointment.bookingFee ?? null);
      setBookingFeePaymentMethod(appointment.bookingFeePaymentMethod ?? null);
    } else {
      // Novo agendamento: data do dia selecionado na agenda ou hoje
      setDate(initialDate ? new Date(initialDate) : new Date());
      setStartTime('09:00');
      setEndTime('09:30');
      setPatientId(prefillPatientId || '');
      setProfessionalId('');
      setClinicId(clinics[0]?.id || '');
      setProcedure(prefillProcedure || '');
      setStatus('pending');
      setPaymentStatus('pending');
      setNotes('');
      setSellerId('');
      setLeadSource('');
      setReferralName('');
      setCustomProcedure('');
      setBookingFee(null);
      setBookingFeePaymentMethod(null);
    }
  }, [open, appointment, clinics, prefillPatientId, prefillProcedure, initialDate]);

  const checkConflict = (): boolean => {
    if (!professionalId || !date) return false;

    const dateStr = format(date, 'yyyy-MM-dd');
    const conflicting = existingAppointments.find(
      (apt) =>
        apt.id !== appointment?.id &&
        apt.professional.id === professionalId &&
        apt.date === dateStr &&
        apt.status !== 'cancelled' && apt.status !== 'no_show' &&
        ((startTime >= apt.startTime && startTime < apt.endTime) ||
          (endTime > apt.startTime && endTime <= apt.endTime) ||
          (startTime <= apt.startTime && endTime >= apt.endTime))
    );

    return !!conflicting;
  };

  const handleSave = async () => {
    const effectiveProcedure = procedure === 'Outros' && customProcedure.trim() ? customProcedure.trim() : procedure;
    if (!patientId || !professionalId || !clinicId || !procedure) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (procedure === 'Outros' && !customProcedure.trim()) {
      toast.error('Informe o nome do procedimento quando selecionar "Outros"');
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

    try {
      await onSave({
        id: appointment?.id,
        date: format(date, 'yyyy-MM-dd'),
        startTime,
        endTime,
        patientId,
        patientName: patient.name,
        professional,
        procedure: effectiveProcedure,
        status,
        paymentStatus,
        notes,
        bookingFee: bookingFee ?? undefined,
        bookingFeePaymentMethod: bookingFee ? (bookingFeePaymentMethod ?? undefined) : undefined,
        clinic,
        sellerId: sellerId || undefined,
        leadSource: leadSource || undefined,
        referralName: leadSource === 'referral' ? (referralName.trim() || undefined) : undefined,
      });

      // Fecha apenas se salvou com sucesso (evita toast "criado" + erro logo depois).
      onOpenChange(false);
    } catch (err) {
      // O caller (mutation) ja mostra toast de erro; mantemos o dialog aberto.
      console.error('Error saving appointment:', err);
    }
  };

  const timeOptions: string[] = [];
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    const result = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    return timeOptions.includes(result) ? result : timeOptions[timeOptions.indexOf(time) + 1] || time;
  };

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
                      {getClinicDisplayName(clinic)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Horário Início *</Label>
              <Select
                value={startTime}
                onValueChange={(v) => {
                  setStartTime(v);
                  const suggestedEnd = addMinutesToTime(v, 30);
                  if (suggestedEnd && suggestedEnd > v) setEndTime(suggestedEnd);
                }}
              >
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
            <Select value={procedure || ''} onValueChange={(v) => { setProcedure(v); if (v !== 'Outros') setCustomProcedure(''); }}>
              <SelectTrigger id="procedure">
                <SelectValue placeholder="Selecione o procedimento" />
              </SelectTrigger>
              <SelectContent>
                {PROCEDURE_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
                {procedure && !PROCEDURE_OPTIONS.includes(procedure as any) && (
                  <SelectItem value={procedure}>{procedure} (atual)</SelectItem>
                )}
              </SelectContent>
            </Select>
            {procedure === 'Outros' && (
              <Input
                placeholder="Ex: Facetas superiores, Harmonização labial..."
                value={customProcedure}
                onChange={(e) => setCustomProcedure(e.target.value)}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Use a mesma lista das regras de comissão para o cálculo bater ao finalizar.
            </p>
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
              <div className="flex items-center gap-1.5">
                <Label>Pagamento</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label="Ajuda"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[240px]">
                    <p>&quot;Pago&quot; só marca o status. Para gerar comissões e lançamentos, use &quot;Finalizar Atendimento&quot; no evento.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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

          {/* Taxa de agendamento */}
          <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bookingFee"
                checked={bookingFee !== null}
                onCheckedChange={(checked) => {
                  setBookingFee(checked ? 50 : null);
                  if (!checked) setBookingFeePaymentMethod(null);
                  else setBookingFeePaymentMethod((p) => p ?? 'pix');
                }}
              />
              <label htmlFor="bookingFee" className="text-sm font-medium cursor-pointer">
                Taxa de agendamento (R$ 50) — se faltar/desistir, valor entra no caixa
              </label>
            </div>
            {bookingFee !== null && (
              <div className="grid gap-2 pl-6">
                <Label className="text-xs text-muted-foreground">Forma de pagamento da taxa</Label>
                <Select
                  value={bookingFeePaymentMethod ?? 'pix'}
                  onValueChange={(v) => setBookingFeePaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit">Cartão Crédito</SelectItem>
                    <SelectItem value="debit">Cartão Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Lead Source */}
          <div className="grid gap-2">
            <Label>Origem do Lead</Label>
            <Select 
              value={leadSource || 'none'} 
              onValueChange={(v) => { setLeadSource(v === 'none' ? '' : v as LeadSource); if (v !== 'referral') setReferralName(''); }}
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
            {leadSource === 'referral' && (
              <Input
                placeholder="Nome de quem indicou (para bonificações)"
                value={referralName}
                onChange={(e) => setReferralName(e.target.value)}
              />
            )}
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
