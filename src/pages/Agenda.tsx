import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { NoShowFeeDialog } from '@/components/agenda/NoShowFeeDialog';
import { AgendaAppointment, AgendaView, Professional } from '@/types/agenda';
import { PaymentMethod } from '@/types/financial';
import { useAppointments, useAppointmentMutations } from '@/hooks/useAppointments';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useClinic, useClinics, useClinicsOfSameOwner } from '@/hooks/useClinic';
import { useCommissionRules, useCommissionMutations } from '@/hooks/useCommissions';
import type { CommissionBreakdownItem } from '@/components/agenda/CompleteAppointmentDialog';
import { useTransactionMutations } from '@/hooks/useFinancial';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Agenda() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [selectedClinic, setSelectedClinic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [view, setView] = useState<AgendaView>('day');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AgendaAppointment | null>(null);
  const [prefillPatientId, setPrefillPatientId] = useState<string | null>(null);
  const [prefillProcedure, setPrefillProcedure] = useState<string>('');
  const [prefillSlotDate, setPrefillSlotDate] = useState<Date | null>(null);
  const [prefillSlotStartTime, setPrefillSlotStartTime] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<AgendaAppointment | null>(null);
  const [noShowFeeDialogOpen, setNoShowFeeDialogOpen] = useState(false);
  const [noShowAppointment, setNoShowAppointment] = useState<AgendaAppointment | null>(null);

  const { clinic } = useClinic();
  const { clinics: userClinics } = useClinics();
  const { clinics: clinicsOfSameOwner } = useClinicsOfSameOwner();
  const { canSeeAllClinicsInAgenda } = usePermissions();
  const canSeeAll = canSeeAllClinicsInAgenda();

  // Com permissão "Agenda - todas as clínicas": listar e consultar todas as unidades do mesmo dono
  const allClinics = canSeeAll && clinicsOfSameOwner.length > 0
    ? clinicsOfSameOwner
    : userClinics;

  const clinicIdsForQuery =
    canSeeAll && allClinics.length
      ? allClinics.map((c: any) => c.id)
      : clinic?.id
      ? [clinic.id]
      : [];

  const { appointments: rawAppointments, isLoading: isLoadingAppointments } = useAppointments(
    undefined,
    clinicIdsForQuery,
  );
  const { activeProfessionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { createAppointment, updateAppointment } = useAppointmentMutations();
  const { createTransaction, syncBookingFeePaymentMethod } = useTransactionMutations();
  const { createCommission } = useCommissionMutations();
  const { rules: commissionRules } = useCommissionRules();

  // Mapa de clínicas por ID para preencher os dados da agenda
  const clinicsById = useMemo(() => {
    const map: Record<string, any> = {};
    (allClinics || []).forEach((c: any) => {
      if (c?.id) map[c.id] = c;
    });
    if (clinic?.id && !map[clinic.id]) {
      map[clinic.id] = clinic;
    }
    return map;
  }, [allClinics, clinic]);

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
      clinic: (() => {
        const c = clinicsById[apt.clinic_id] || clinic;
        return {
          id: apt.clinic_id,
          name: c?.name || '',
          address: c?.address || '',
          phone: c?.phone || '',
          cnpj: c?.cnpj || '',
        };
      })(),
      sellerId: apt.seller_id,
      leadSource: apt.lead_source,
      referralName: apt.referral_name ?? undefined,
      bookingFee: apt.booking_fee ?? undefined,
      bookingFeePaymentMethod: apt.booking_fee_payment_method ?? undefined,
    }));
  }, [rawAppointments, clinic]);

  // Lista de clínicas disponíveis na agenda
  const clinics = useMemo(() => {
    if (canSeeAll && allClinics.length) {
      return allClinics.map((c: any) => ({
        id: c.id,
        name: c.name,
        address: c.address || '',
        phone: c.phone || '',
        cnpj: c.cnpj || '',
      }));
    }
    if (!clinic) return [];
    return [{
      id: clinic.id,
      name: clinic.name,
      address: clinic.address || '',
      phone: clinic.phone || '',
      cnpj: clinic.cnpj || '',
    }];
  }, [clinic, allClinics, canSeeAll]);

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
      if (apt.status === 'cancelled') return false;
      if (selectedProfessional !== 'all' && apt.professional.id !== selectedProfessional) return false;
      if (selectedClinic !== 'all' && apt.clinic.id !== selectedClinic) return false;
      // Atendimentos finalizados e faltas sempre visíveis na agenda (registro do dia)
      if (apt.status === 'completed' || apt.status === 'no_show') return true;
      if (selectedStatus !== 'all' && apt.status !== selectedStatus) return false;
      return true;
    });
  }, [appointments, selectedProfessional, selectedClinic, selectedStatus]);

  const dateFilteredAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return filteredAppointments.filter((apt) => apt.date === dateStr);
  }, [filteredAppointments, selectedDate]);

  // Abrir formulário com paciente/procedimento pré-preenchidos (vindo do Alerta de Retorno)
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const procedure = searchParams.get('procedure');
    const fromAlert = searchParams.get('fromAlert');
    if (fromAlert && patientId) {
      setPrefillPatientId(patientId);
      setPrefillProcedure(procedure || 'Retorno');
      setFormDialogOpen(true);
      setEditingAppointment(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setPrefillPatientId(null);
    setPrefillProcedure('');
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

  const handleMarkNoShow = async (appointment: AgendaAppointment, paymentMethod?: PaymentMethod) => {
    await updateAppointment.mutateAsync({
      id: appointment.id,
      status: 'no_show',
    });
    const fee = appointment.bookingFee ?? 0;
    if (fee > 0) {
      await createTransaction.mutateAsync({
        type: 'income',
        amount: fee,
        description: `Taxa de agendamento - ${appointment.patientName} (faltou)`,
        category: 'Taxa de agendamento',
        payment_method: paymentMethod ?? 'cash',
        reference_type: 'appointment',
        reference_id: appointment.id,
      });
      const methodLabel = { cash: 'Dinheiro', pix: 'PIX', credit: 'Cartão Crédito', debit: 'Cartão Débito' }[paymentMethod ?? 'cash'];
      toast.success(`Marcado como faltou. Taxa de R$ ${fee.toFixed(2)} registrada no caixa (${methodLabel}).`);
    } else {
      toast.success('Marcado como faltou');
    }
  };

  const handleMarkNoShowClick = (appointment: AgendaAppointment) => {
    const fee = appointment.bookingFee ?? 0;
    const paymentMethod = appointment.bookingFeePaymentMethod;
    // Se já tem forma de pagamento definida no agendamento, usa direto; senão abre o diálogo
    if (fee > 0 && (paymentMethod === 'cash' || paymentMethod === 'pix' || paymentMethod === 'credit' || paymentMethod === 'debit')) {
      handleMarkNoShow(appointment, paymentMethod);
    } else if (fee > 0) {
      setNoShowAppointment(appointment);
      setNoShowFeeDialogOpen(true);
    } else {
      handleMarkNoShow(appointment);
    }
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
    quantity: number,
    commissionBreakdown: CommissionBreakdownItem[],
    scheduleReturn?: boolean
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

    // Registrar comissões no banco
    try {
      for (const { rule, amount } of commissionBreakdown) {
        const beneficiaryId =
          rule.beneficiaryType === 'professional'
            ? appointment.professional.id
            : rule.beneficiaryId || appointment.sellerId || appointment.professional.id;
        if (!beneficiaryId) continue; // seller/reception sem beneficiário definido
        await createCommission.mutateAsync({
          appointmentId: appointment.id,
          professionalId: appointment.professional.id,
          professionalName: appointment.professional.name,
          beneficiaryType: rule.beneficiaryType,
          beneficiaryId,
          beneficiaryName: rule.beneficiaryName || appointment.professional.name,
          clinicId: appointment.clinic.id,
          clinicName: appointment.clinic.name,
          procedure: appointment.procedure,
          serviceValue,
          quantity,
          commissionRuleId: rule.id,
          calculationType: rule.calculationType,
          calculationUnit: rule.calculationUnit,
          ruleValue: rule.value,
          commissionAmount: amount,
          date: appointment.date,
          status: 'pending',
        });
      }
    } catch (err) {
      console.error('Erro ao registrar comissão:', err);
      toast.error('Atendimento finalizado, mas a comissão não foi registrada. Execute o script RLS de comissões no Supabase.');
      setCompleteDialogOpen(false);
      setCompletingAppointment(null);
      return;
    }

    toast.success(`Atendimento finalizado! Valor: R$ ${serviceValue.toFixed(2)}`);

    if (scheduleReturn) {
      setCompleteDialogOpen(false);
      setCompletingAppointment(null);
      setPrefillPatientId(appointment.patientId);
      setPrefillProcedure('Retorno');
      setFormDialogOpen(true);
    }
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
        referral_name: data.referralName ?? null,
        booking_fee: data.bookingFee ?? null,
        booking_fee_payment_method: data.bookingFeePaymentMethod ?? null,
      });
      // Sincronizar forma de pagamento da taxa no financeiro (se já existe transação de no-show)
      if ((data.bookingFee ?? 0) > 0 && data.bookingFeePaymentMethod) {
        try {
          await syncBookingFeePaymentMethod.mutateAsync({
            appointmentId: data.id,
            paymentMethod: data.bookingFeePaymentMethod,
          });
        } catch {
          // Silencioso: transação pode não existir ainda (paciente não faltou)
        }
      }
    } else {
      // Create new
      await createAppointment.mutateAsync({
        clinic_id: data.clinic?.id,
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
        referral_name: data.referralName ?? null,
        booking_fee: data.bookingFee ?? null,
        booking_fee_payment_method: data.bookingFeePaymentMethod ?? null,
      });
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setView('day');
  };

  const handleSlotClickDay = (startTime: string) => {
    setPrefillSlotDate(selectedDate);
    setPrefillSlotStartTime(startTime);
    setEditingAppointment(null);
    setFormDialogOpen(true);
  };

  const handleSlotClickWeek = (day: Date, startTime: string) => {
    setPrefillSlotDate(day);
    setPrefillSlotStartTime(startTime);
    setEditingAppointment(null);
    setFormDialogOpen(true);
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
            onMarkNoShow={handleMarkNoShowClick}
            onWhatsApp={handleWhatsApp}
            onSlotClick={handleSlotClickDay}
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
            onMarkNoShow={handleMarkNoShowClick}
            onWhatsApp={handleWhatsApp}
            onSlotClick={handleSlotClickWeek}
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
        onOpenChange={(open) => {
          setFormDialogOpen(open);
          if (!open) {
            setEditingAppointment(null);
            setPrefillPatientId(null);
            setPrefillProcedure('');
            setPrefillSlotDate(null);
            setPrefillSlotStartTime(null);
          }
        }}
        appointment={editingAppointment}
        professionals={professionals}
        clinics={clinics}
        existingAppointments={appointments}
        onSave={handleSave}
        prefillPatientId={prefillPatientId}
        prefillProcedure={prefillProcedure}
        initialDate={prefillSlotDate ?? selectedDate}
        initialStartTime={prefillSlotStartTime ?? undefined}
      />

      {/* Complete Appointment Dialog */}
      <CompleteAppointmentDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        appointment={completingAppointment}
        onComplete={handleCompleteConfirm}
        commissionRules={commissionRules}
      />

      {/* No Show Fee - Forma de pagamento da taxa (Dinheiro, PIX, Cartão) */}
      <NoShowFeeDialog
        key={noShowAppointment?.id ?? 'closed'}
        open={noShowFeeDialogOpen}
        onOpenChange={(open) => {
          setNoShowFeeDialogOpen(open);
          if (!open) setNoShowAppointment(null);
        }}
        appointment={noShowAppointment}
        onConfirm={handleMarkNoShow}
      />
    </MainLayout>
  );
}
