import { useState } from "react";
import { CalendarPlus, UserPlus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientFormDialog } from "@/components/patients/PatientFormDialog";
import { AppointmentFormDialog } from "@/components/agenda/AppointmentFormDialog";
import { PaymentForm } from "@/components/financial/PaymentForm";
import { usePatientMutations } from "@/hooks/usePatients";
import { useAppointmentMutations } from "@/hooks/useAppointments";
import { useTransactionMutations } from "@/hooks/useFinancial";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useClinic } from "@/hooks/useClinic";

export function QuickActions() {
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { createPatient } = usePatientMutations();
  const { createAppointment } = useAppointmentMutations();
  const { createTransaction } = useTransactionMutations();
  const { activeProfessionals } = useProfessionals();
  const { clinic, clinicId } = useClinic();

  const handleSavePatient = async (patientData: any) => {
    await createPatient.mutateAsync({
      name: patientData.name,
      cpf: patientData.cpf,
      phone: patientData.phone,
      email: patientData.email,
      address: patientData.address,
      birth_date: patientData.birthDate || null,
      clinical_notes: patientData.clinicalNotes,
      allergies: patientData.allergies,
      status: patientData.status,
    });
    setPatientDialogOpen(false);
  };

  const handleSaveAppointment = async (appointmentData: any) => {
    // Transform from dialog format to database format
    await createAppointment.mutateAsync({
      patient_id: appointmentData.patientId,
      professional_id: appointmentData.professional?.id || appointmentData.professionalId,
      date: appointmentData.date,
      start_time: appointmentData.startTime,
      end_time: appointmentData.endTime,
      procedure: appointmentData.procedure,
      status: appointmentData.status || 'pending',
      payment_status: appointmentData.paymentStatus || 'pending',
      notes: appointmentData.notes || null,
      seller_id: appointmentData.sellerId || null,
      lead_source: appointmentData.leadSource || null,
      booking_fee: appointmentData.bookingFee ?? null,
    });
    setAppointmentDialogOpen(false);
  };

  const handleSaveTransaction = async (transaction: any) => {
    await createTransaction.mutateAsync({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      payment_method: transaction.paymentMethod,
      patient_id: transaction.patientId || null,
      notes: transaction.notes || null,
      voucher_discount: transaction.voucherDiscount || null,
      payment_split: transaction.paymentSplit || null,
    });
  };

  const actions = [
    {
      icon: CalendarPlus,
      label: "Novo Agendamento",
      description: "Agendar consulta",
      onClick: () => setAppointmentDialogOpen(true),
    },
    {
      icon: UserPlus,
      label: "Novo Paciente",
      description: "Cadastrar paciente",
      onClick: () => setPatientDialogOpen(true),
    },
    {
      icon: Receipt,
      label: "Novo Lançamento",
      description: "Registrar movimento",
      onClick: () => setPaymentDialogOpen(true),
    },
  ];

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">Ações Rápidas</h3>
          <p className="text-sm text-muted-foreground">Atalhos para tarefas comuns</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="flex h-auto flex-col items-center gap-2 p-4 hover:border-primary hover:bg-accent"
                onClick={action.onClick}
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Button>
            );
          })}
          </div>
        </div>
      </div>

      {/* Patient Form Dialog */}
      <PatientFormDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        patient={null}
        onSave={handleSavePatient}
      />

      {/* Appointment Form Dialog */}
      <AppointmentFormDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        onSave={handleSaveAppointment}
        professionals={activeProfessionals.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          cro: p.cro,
        }))}
        clinics={clinic ? [{
          id: clinic.id,
          name: clinic.name,
          phone: clinic.phone || '',
          address: clinic.address || '',
          cnpj: clinic.cnpj || '',
        }] : []}
        existingAppointments={[]}
      />

      {/* Payment Form Dialog */}
      <PaymentForm
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSave={handleSaveTransaction}
        type="income"
      />
    </>
  );
}
