import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus, Clock } from 'lucide-react';
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
import { EditAppointmentMaterialsDialog } from '@/components/agenda/EditAppointmentMaterialsDialog';
import { AgendaScheduleSettingsDialog } from '@/components/agenda/AgendaScheduleSettingsDialog';
import { AgendaAppointment, AgendaView, Professional, LeadSource } from '@/types/agenda';
import { PaymentMethod } from '@/types/financial';
import { useAppointments, useAppointmentMutations } from '@/hooks/useAppointments';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useClinic, useClinics, useClinicsOfSameOwner } from '@/hooks/useClinic';
import { useCommissionRules, useCommissionMutations } from '@/hooks/useCommissions';
import type { CommissionBreakdownItem, BillingDestination } from '@/components/agenda/CompleteAppointmentDialog';
import { useTransactionMutations } from '@/hooks/useFinancial';
import { useReceivableMutations } from '@/hooks/useReceivables';
import { useCrmLeadMutations } from '@/hooks/useCrmLeads';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { prepareAgendaWhatsAppMessage } from '@/utils/whatsapp';
import { remainingAfterBookingFee } from '@/lib/bookingFee';
import { useProcedureMaterialMutations } from '@/hooks/useProcedureMaterials';
import type { AppointmentMaterialUsageInput } from '@/types/procedureMaterial';

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
  const [prefillLeadSource, setPrefillLeadSource] = useState<LeadSource | ''>('');
  const [prefillReferralName, setPrefillReferralName] = useState('');
  const [prefillSellerId, setPrefillSellerId] = useState('');
  const [prefillNotes, setPrefillNotes] = useState('');
  const [crmLeadId, setCrmLeadId] = useState<string | null>(null);
  const [crmTargetStage, setCrmTargetStage] = useState<'scheduled' | 'won'>('scheduled');
  const [prefillSlotDate, setPrefillSlotDate] = useState<Date | null>(null);
  const [prefillSlotStartTime, setPrefillSlotStartTime] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<AgendaAppointment | null>(null);
  const [noShowFeeDialogOpen, setNoShowFeeDialogOpen] = useState(false);
  const [noShowAppointment, setNoShowAppointment] = useState<AgendaAppointment | null>(null);
  const [editMaterialsOpen, setEditMaterialsOpen] = useState(false);
  const [editingMaterialsAppointment, setEditingMaterialsAppointment] = useState<AgendaAppointment | null>(null);
  const [scheduleSettingsOpen, setScheduleSettingsOpen] = useState(false);

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
  const {
    createTransaction,
    syncBookingFeePaymentMethod,
    ensureBookingFeeIncome,
    findBookingFeeTransaction,
  } = useTransactionMutations();
  const { createReceivable } = useReceivableMutations();
  const { createCommission } = useCommissionMutations();
  const { recordAppointmentMaterials } = useProcedureMaterialMutations();
  const { updateLead } = useCrmLeadMutations();
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
      procedureId: apt.procedure_id ?? undefined,
      procedurePrice: apt.procedure_price == null ? undefined : Number(apt.procedure_price),
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

  // Abrir formulário com paciente/procedimento pré-preenchidos (Alerta de Retorno ou CRM)
  useEffect(() => {
    const patientId = searchParams.get('patientId');
    const procedure = searchParams.get('procedure');
    const fromAlert = searchParams.get('fromAlert');
    const fromCrm = searchParams.get('fromCrm');
    const leadSource = searchParams.get('leadSource') as LeadSource | null;
    const referralName = searchParams.get('referralName');
    const sellerId = searchParams.get('sellerId');
    const notes = searchParams.get('notes');
    const leadId = searchParams.get('crmLeadId');
    const targetStage = searchParams.get('crmTargetStage');

    if ((fromAlert || fromCrm) && patientId) {
      setPrefillPatientId(patientId);
      setPrefillProcedure(procedure || (fromCrm ? '' : 'Retorno'));
      setPrefillLeadSource(leadSource || '');
      setPrefillReferralName(referralName || '');
      setPrefillSellerId(sellerId || '');
      setPrefillNotes(notes || '');
      setCrmLeadId(fromCrm ? leadId : null);
      setCrmTargetStage(targetStage === 'won' ? 'won' : 'scheduled');
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
    const fee = appointment.bookingFee ?? 0;
    if (fee > 0) {
      // Sinal já lançado no agendamento permanece no caixa (não reembolsado).
      try {
        await ensureBookingFeeIncome.mutateAsync({
          appointmentId: appointment.id,
          amount: fee,
          paymentMethod: appointment.bookingFeePaymentMethod || 'pix',
          patientName: appointment.patientName,
          patientId: appointment.patientId,
          descriptionSuffix: 'cancelou — retido',
          silent: true,
        });
      } catch (err) {
        console.error('Erro ao atualizar origem do sinal no cancelamento:', err);
      }
      toast.success(`Agendamento cancelado. Sinal de R$ ${fee.toFixed(2)} permanece no caixa.`);
    } else {
      toast.success('Agendamento cancelado');
    }
  };

  const handleMarkNoShow = async (appointment: AgendaAppointment, paymentMethod?: PaymentMethod) => {
    await updateAppointment.mutateAsync({
      id: appointment.id,
      status: 'no_show',
    });
    const fee = appointment.bookingFee ?? 0;
    if (fee > 0) {
      const method = paymentMethod ?? appointment.bookingFeePaymentMethod ?? 'pix';
      // Idempotente: se o sinal já entrou no caixa ao agendar, só atualiza a origem.
      await ensureBookingFeeIncome.mutateAsync({
        appointmentId: appointment.id,
        amount: fee,
        paymentMethod: method,
        patientName: appointment.patientName,
        patientId: appointment.patientId,
        descriptionSuffix: 'faltou — retido',
        silent: true,
      });
      toast.success(`Marcado como faltou. Sinal de R$ ${fee.toFixed(2)} permanece no caixa (não reembolsado).`);
    } else {
      toast.success('Marcado como faltou');
    }
  };

  const handleMarkNoShowClick = async (appointment: AgendaAppointment) => {
    const fee = appointment.bookingFee ?? 0;
    if (!(fee > 0)) {
      handleMarkNoShow(appointment);
      return;
    }

    const paymentMethod = appointment.bookingFeePaymentMethod;
    try {
      const existing = await findBookingFeeTransaction(appointment.id);
      // Sinal já no caixa ou forma já definida: não precisa perguntar de novo.
      if (existing || paymentMethod === 'cash' || paymentMethod === 'pix' || paymentMethod === 'credit' || paymentMethod === 'debit') {
        await handleMarkNoShow(appointment, paymentMethod || undefined);
        return;
      }
    } catch (err) {
      console.error('Erro ao consultar sinal do agendamento:', err);
    }

    // Legado: taxa marcada sem forma/lançamento — pede a forma antes de registrar.
    setNoShowAppointment(appointment);
    setNoShowFeeDialogOpen(true);
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

  const handleEditMaterials = (appointment: AgendaAppointment) => {
    setEditingMaterialsAppointment(appointment);
    setEditMaterialsOpen(true);
  };

  // Abrir direto um agendamento especifico (ex: clique em "Próximas Consultas"
  // no Dashboard) já na tela de edição, ou já no fluxo de finalizar.
  useEffect(() => {
    const focusId = searchParams.get('focusAppointmentId');
    if (!focusId) return;
    if (isLoadingAppointments) return;

    const target = appointments.find((apt) => apt.id === focusId);
    if (!target) {
      toast.error('Agendamento não encontrado');
      setSearchParams({}, { replace: true });
      return;
    }

    setSelectedDate(parseISO(target.date));
    setView('day');
    if (searchParams.get('focusAction') === 'complete' && (target.status === 'pending' || target.status === 'confirmed')) {
      handleComplete(target);
    } else {
      handleEdit(target);
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, appointments, isLoadingAppointments]);

  const handleCompleteConfirm = async (
    appointment: AgendaAppointment,
    serviceValue: number,
    paymentMethod: PaymentMethod,
    quantity: number,
    commissionBreakdown: CommissionBreakdownItem[],
    scheduleReturn?: boolean,
    adjustmentReason?: string,
    billingDestination: BillingDestination = 'cash',
    dueDate?: string,
    materialsUsage: AppointmentMaterialUsageInput[] = [],
  ) => {
    const isReceivable = billingDestination === 'receivable';
    const bookingFee = appointment.bookingFee ?? 0;
    const remaining = remainingAfterBookingFee(serviceValue, bookingFee);
    // Com saldo zero após o sinal, não há nada a receber depois.
    const paymentStatus = isReceivable && remaining > 0 ? 'pending' : 'paid';

    await updateAppointment.mutateAsync({
      id: appointment.id,
      status: 'completed',
      payment_status: paymentStatus,
      procedure: appointment.procedure,
      procedure_id: appointment.procedureId ?? null,
      procedure_price: appointment.procedurePrice ?? null,
    });

    const feeNote = bookingFee > 0
      ? `Sinal R$ ${bookingFee.toFixed(2)} abatido`
      : null;
    const description = [
      `${appointment.procedure} - ${appointment.patientName}`,
      feeNote,
      adjustmentReason ? `Ajuste: ${adjustmentReason}` : null,
    ].filter(Boolean).join(' | ');

    if (remaining > 0) {
      if (isReceivable) {
        await createReceivable.mutateAsync({
          patient_id: appointment.patientId || null,
          appointment_id: appointment.id,
          description,
          amount: remaining,
          due_date: dueDate || format(new Date(), 'yyyy-MM-dd'),
        });
      } else {
        await createTransaction.mutateAsync({
          type: 'income',
          amount: remaining,
          description,
          category: 'Procedimento',
          payment_method: paymentMethod,
          reference_type: 'appointment',
          reference_id: appointment.id,
          patient_id: appointment.patientId || null,
        });
      }
    } else if (bookingFee > 0) {
      // Procedimento quitado só com o sinal já lançado no agendamento.
      try {
        await ensureBookingFeeIncome.mutateAsync({
          appointmentId: appointment.id,
          amount: bookingFee,
          paymentMethod: appointment.bookingFeePaymentMethod || paymentMethod,
          patientName: appointment.patientName,
          patientId: appointment.patientId,
          descriptionSuffix: 'abatido no procedimento',
          silent: true,
        });
      } catch (err) {
        console.error('Erro ao atualizar origem do sinal na finalização:', err);
      }
    }

    // Registrar comissões no banco (sobre o valor bruto do procedimento)
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

    if (materialsUsage.length > 0) {
      try {
        await recordAppointmentMaterials.mutateAsync({
          appointmentId: appointment.id,
          patientName: appointment.patientName,
          procedureName: appointment.procedure,
          items: materialsUsage,
        });
        toast.success(`${materialsUsage.length} material(is) baixado(s) do estoque e registrados no histórico.`);
      } catch (err) {
        console.error('Erro ao baixar materiais:', err);
      }
    }

    if (remaining <= 0 && bookingFee > 0) {
      toast.success(`Atendimento finalizado. Procedimento quitado com o sinal de R$ ${bookingFee.toFixed(2)} já no caixa.`);
    } else if (isReceivable) {
      const feeMsg = bookingFee > 0 ? ` (sinal R$ ${bookingFee.toFixed(2)} abatido)` : '';
      toast.success(`Atendimento finalizado. R$ ${remaining.toFixed(2)} em Contas a receber${feeMsg}.`);
    } else {
      const feeMsg = bookingFee > 0 ? ` (sinal R$ ${bookingFee.toFixed(2)} abatido)` : '';
      toast.success(`Atendimento finalizado! R$ ${remaining.toFixed(2)} no Caixa${feeMsg}.`);
    }

    if (scheduleReturn) {
      setCompleteDialogOpen(false);
      setCompletingAppointment(null);
      setPrefillPatientId(appointment.patientId);
      setPrefillProcedure('Retorno');
      setFormDialogOpen(true);
    }
  };

  const handleWhatsApp = (appointment: AgendaAppointment) => {
    const prepared = prepareAgendaWhatsAppMessage(appointment);
    if (!prepared) {
      toast.error('Paciente sem telefone cadastrado');
      return;
    }
    window.open(prepared.whatsappUrl, '_blank');
    toast.success('Abrindo WhatsApp...', {
      description: `Mensagem preparada para ${appointment.patientName}`,
    });
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
        procedure_id: data.procedureId ?? null,
        procedure_price: data.procedurePrice ?? null,
        status: data.status,
        payment_status: data.paymentStatus,
        notes: data.notes,
        seller_id: data.sellerId || null,
        lead_source: data.leadSource || null,
        referral_name: data.referralName ?? null,
        booking_fee: data.bookingFee ?? null,
        booking_fee_payment_method: data.bookingFeePaymentMethod ?? null,
      });
      // Garante sinal no caixa se a taxa foi marcada/alterada na edição
      if ((data.bookingFee ?? 0) > 0 && data.bookingFeePaymentMethod) {
        try {
          await ensureBookingFeeIncome.mutateAsync({
            appointmentId: data.id,
            amount: data.bookingFee!,
            paymentMethod: data.bookingFeePaymentMethod,
            patientName: data.patientName || 'Paciente',
            patientId: data.patientId,
          });
        } catch {
          try {
            await syncBookingFeePaymentMethod.mutateAsync({
              appointmentId: data.id,
              paymentMethod: data.bookingFeePaymentMethod,
            });
          } catch {
            // Melhor esforço: não bloqueia a edição do agendamento
          }
        }
      }
    } else {
      // Create new
      const created = await createAppointment.mutateAsync({
        clinic_id: data.clinic?.id,
        patient_id: data.patientId!,
        professional_id: data.professional!.id,
        date: data.date!,
        start_time: data.startTime!,
        end_time: data.endTime!,
        procedure: data.procedure!,
        procedure_id: data.procedureId ?? null,
        procedure_price: data.procedurePrice ?? null,
        status: data.status || 'pending',
        payment_status: data.paymentStatus || 'pending',
        notes: data.notes,
        seller_id: data.sellerId || null,
        lead_source: data.leadSource || null,
        referral_name: data.referralName ?? null,
        booking_fee: data.bookingFee ?? null,
        booking_fee_payment_method: data.bookingFeePaymentMethod ?? null,
      });

      // Sinal entra no caixa/financeiro na criação, com origem no agendamento
      if (created?.id && (data.bookingFee ?? 0) > 0) {
        try {
          await ensureBookingFeeIncome.mutateAsync({
            appointmentId: created.id,
            amount: data.bookingFee!,
            paymentMethod: data.bookingFeePaymentMethod || 'pix',
            patientName: data.patientName || 'Paciente',
            patientId: data.patientId,
          });
        } catch (err) {
          console.error('Erro ao lançar sinal de agendamento:', err);
          toast.error('Agendamento criado, mas o sinal não entrou no caixa. Lance manualmente no Financeiro.');
        }
      }

      // Vínculo de volta ao CRM (origem + paciente + agendamento)
      if (crmLeadId && created?.id) {
        try {
          await updateLead.mutateAsync({
            id: crmLeadId,
            patient_id: data.patientId || null,
            appointment_id: created.id,
            stage: crmTargetStage,
          });
        } catch (err) {
          console.error('Erro ao vincular lead do CRM:', err);
        }
      }
      setCrmLeadId(null);
      setCrmTargetStage('scheduled');
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleSettingsOpen(true)}
            >
              <Clock className="mr-2 h-4 w-4" />
              Horários e bloqueios
            </Button>
            <Button onClick={handleNewAppointment}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
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
            onEditMaterials={handleEditMaterials}
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
            onEditMaterials={handleEditMaterials}
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
            setPrefillLeadSource('');
            setPrefillReferralName('');
            setPrefillSellerId('');
            setPrefillNotes('');
            setCrmLeadId(null);
            setCrmTargetStage('scheduled');
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
        prefillLeadSource={prefillLeadSource}
        prefillReferralName={prefillReferralName}
        prefillSellerId={prefillSellerId}
        prefillNotes={prefillNotes}
        initialDate={prefillSlotDate ?? selectedDate}
        initialStartTime={prefillSlotStartTime ?? undefined}
        defaultClinicId={clinic?.id}
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

      <EditAppointmentMaterialsDialog
        open={editMaterialsOpen}
        onOpenChange={(open) => {
          setEditMaterialsOpen(open);
          if (!open) setEditingMaterialsAppointment(null);
        }}
        appointment={editingMaterialsAppointment}
      />

      <AgendaScheduleSettingsDialog
        open={scheduleSettingsOpen}
        onOpenChange={setScheduleSettingsOpen}
        clinicId={clinic?.id}
        professionals={activeProfessionals.map((p: { id: string; name: string }) => ({
          id: p.id,
          name: p.name,
        }))}
      />
    </MainLayout>
  );
}
