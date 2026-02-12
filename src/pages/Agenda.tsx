import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { AgendaFilters } from '@/components/agenda/AgendaFilters';
import { AgendaStats } from '@/components/agenda/AgendaStats';
import { DayView } from '@/components/agenda/DayView';
import { WeekView } from '@/components/agenda/WeekView';
import { MonthView } from '@/components/agenda/MonthView';
import { AppointmentFormDialog } from '@/components/agenda/AppointmentFormDialog';
import { CompleteAppointmentDialog } from '@/components/agenda/CompleteAppointmentDialog';
import { AgendaAppointment, AgendaView, Professional } from '@/types/agenda';
import { PaymentMethod } from '@/types/financial';
import { useAppointments, useAppointmentMutations } from '@/hooks/useAppointments';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useClinic } from '@/hooks/useClinic';
import { useTransactionMutations } from '@/hooks/useFinancial';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [view, setView] = useState<AgendaView>('day');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AgendaAppointment | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<AgendaAppointment | null>(null);

  const { clinic } = useClinic();
  const { appointments: rawAppointments, isLoading: isLoadingAppointments } = useAppointments();
  const { activeProfessionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { createAppointment, updateAppointment } = useAppointmentMutations();
  const { createTransaction } = useTransactionMutations();

  // Transform DB appointments to UI format
  const appointments: AgendaAppointment[] = useMemo(() => {
    return rawAppointments.map((apt: any) => ({
      id: apt.id,
      date: apt.date,
      startTime: apt.start_time?.slice(0, 5) || '',
      endTime: apt.end_time?.slice(0, 5) || '',
      patientId: apt.patient_id,
      patientName: apt.patient?.name || 'Paciente',
      patientPhone: apt.patient?.phone || undefined,
      professional: {
        id: apt.professional?.id || apt.professional_id,
        name: apt.professional?.name || 'Profissional',
        specialty: apt.professional?.specialty || '',
        cro: apt.professional?.cro || '',
      } as Professional,
      procedure: apt.procedure,
      status: apt.status as AgendaAppointment['status'],
      paymentStatus: apt.payment_status as AgendaAppointment['paymentStatus'],
      notes: apt.notes,
      clinic: {
        id: clinic?.id || '',
        name: clinic?.name || '',
        address: clinic?.address || '',
        phone: clinic?.phone || '',
        cnpj: clinic?.cnpj || '',
      },
      sellerId: apt.seller_id,
      leadSource: apt.lead_source,
    }));
  }, [rawAppointments, clinic]);

  // Clinics list (current clinic only for now)
  const clinics = useMemo(() => {
    if (!clinic) return [];
    return [{
      id: clinic.id,
      name: clinic.name,
      address: clinic.address || '',
      phone: clinic.phone || '',
      cnpj: clinic.cnpj || '',
    }];
  }, [clinic]);

  // Professionals for select
  const professionals: Professional[] = useMemo(() => {
    return activeProfessionals.map((p: any) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      cro: p.cro,
    }));
  }, [activeProfessionals]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (apt.status === 'cancelled' || apt.status === 'completed') return false;
      if (selectedProfessional !== 'all' && apt.professional.id !== selectedProfessional) return false;
      if (selectedClinic !== 'all' && apt.clinic.id !== selectedClinic) return false;
      if (selectedStatus !== 'all' && apt.status !== selectedStatus) return false;
      return true;
    });
  }, [appointments, selectedProfessional, selectedClinic, selectedStatus]);

  const dateFilteredAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return filteredAppointments.filter((apt) => apt.date === dateStr);
  }, [filteredAppointments, selectedDate]);

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (appointment: AgendaAppointment) => {
    setEditingAppointment(appointment);
    setFormDialogOpen(true);
  };

  const handleCancel = async (appointment: AgendaAppointment) => {
    await updateAppointment.mutateAsync({
      id: appointment.id,
      status: 'cancelled',
    });
    toast.success('Agendamento cancelado');
  };

  const handleConfirm = async (appointment: AgendaAppointment) => {
    await updateAppointment.mutateAsync({
      id: appointment.id,
      status: 'confirmed',
    });
    toast.success('Agendamento confirmado');
  };

  const handleComplete = (appointment: AgendaAppointment) => {
    setCompletingAppointment(appointment);
    setCompleteDialogOpen(true);
  };

  const handleCompleteConfirm = async (
    appointment: AgendaAppointment,
    serviceValue: number,
    paymentMethod: PaymentMethod,
    quantity: number
  ) => {
    // Update appointment status
    await updateAppointment.mutateAsync({
      id: appointment.id,
      status: 'completed',
      payment_status: 'paid',
    });

    // Create financial transaction
    await createTransaction.mutateAsync({
      type: 'income',
      amount: serviceValue,
      description: `${appointment.procedure} - ${appointment.patientName}`,
      category: 'Procedimento',
      payment_method: paymentMethod,
      reference_type: 'appointment',
      reference_id: appointment.id,
    });

    toast.success(`Atendimento finalizado! Valor: R$ ${serviceValue.toFixed(2)}`);
  };

  const handleWhatsApp = (appointment: AgendaAppointment) => {
    const message = `Olá! Confirmando sua consulta:\n📅 Data: ${format(new Date(appointment.date), 'dd/MM/yyyy')}\n⏰ Horário: ${appointment.startTime}\n👨‍⚕️ Profissional: ${appointment.professional.name}\n📍 Local: ${appointment.clinic.name}\n\nPor favor, confirme sua presença respondendo esta mensagem.`;
    const phoneDigits = (appointment.patientPhone || '').replace(/\D/g, '');
    if (!phoneDigits) {
      toast.error('Paciente sem telefone cadastrado');
      return;
    }
    const phone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSave = async (data: Partial<AgendaAppointment>) => {
    if (data.id) {
      // Edit existing
      await updateAppointment.mutateAsync({
        id: data.id,
        patient_id: data.patientId,
        professional_id: data.professional?.id,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        procedure: data.procedure,
        status: data.status,
        payment_status: data.paymentStatus,
        notes: data.notes,
        seller_id: data.sellerId || null,
        lead_source: data.leadSource || null,
      });
    } else {
      // Create new
      await createAppointment.mutateAsync({
        patient_id: data.patientId!,
        professional_id: data.professional!.id,
        date: data.date!,
        start_time: data.startTime!,
        end_time: data.endTime!,
        procedure: data.procedure!,
        status: data.status || 'pending',
        payment_status: data.paymentStatus || 'pending',
        notes: data.notes,
        seller_id: data.sellerId || null,
        lead_source: data.leadSource || null,
      });
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  if (isLoadingAppointments || isLoadingProfessionals) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os agendamentos da clínica
            </p>
          </div>
          <Button onClick={handleNewAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>

        {/* Stats */}
        <AgendaStats appointments={dateFilteredAppointments} />

        {/* Filters */}
        <AgendaFilters
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedProfessional={selectedProfessional}
          onProfessionalChange={setSelectedProfessional}
          selectedClinic={selectedClinic}
          onClinicChange={setSelectedClinic}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          view={view}
          onViewChange={setView}
          professionals={professionals}
          clinics={clinics}
        />

        {/* Calendar Views */}
        {view === 'day' && (
          <DayView
            date={selectedDate}
            appointments={dateFilteredAppointments}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            onComplete={handleComplete}
            onWhatsApp={handleWhatsApp}
          />
        )}

        {view === 'week' && (
          <WeekView
            date={selectedDate}
            appointments={filteredAppointments}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
            onComplete={handleComplete}
            onWhatsApp={handleWhatsApp}
          />
        )}

        {view === 'month' && (
          <MonthView
            date={selectedDate}
            appointments={filteredAppointments}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Form Dialog */}
      <AppointmentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        appointment={editingAppointment}
        professionals={professionals}
        clinics={clinics}
        existingAppointments={appointments}
        onSave={handleSave}
      />

      {/* Complete Appointment Dialog */}
      <CompleteAppointmentDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        appointment={completingAppointment}
        onComplete={handleCompleteConfirm}
      />
    </MainLayout>
  );
}
