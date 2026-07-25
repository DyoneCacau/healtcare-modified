import { useState } from "react";
import { CalendarPlus, UserPlus, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PatientFormDialog } from "@/components/patients/PatientFormDialog";
import { AppointmentFormDialog } from "@/components/agenda/AppointmentFormDialog";
import { PaymentForm } from "@/components/financial/PaymentForm";
import { DocumentPrintPreview, type DocumentPrintType } from "@/components/terms/DocumentPrintPreview";
import { usePatients, usePatientMutations } from "@/hooks/usePatients";
import { useAppointmentMutations, useAppointments } from "@/hooks/useAppointments";
import { useTransactionMutations } from "@/hooks/useFinancial";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useClinic } from "@/hooks/useClinic";
import { useClinicBranding } from "@/hooks/useTerms";
import { formatClinicAddress } from "@/lib/utils";
import type { AgendaAppointment } from "@/types/agenda";
import type { Patient } from "@/types/patient";

const DOCUMENT_TYPES: { value: DocumentPrintType; label: string }[] = [
  { value: 'atestado', label: 'Atestado' },
  { value: 'declaracao', label: 'Declaração' },
  { value: 'receituario', label: 'Receituário' },
];

function mapDbPatientToPatient(p: {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  clinical_notes: string | null;
  allergies: string[] | null;
  lead_source: string | null;
  referral_name: string | null;
  created_at: string;
  status: string;
}): Patient {
  return {
    id: p.id,
    name: p.name,
    cpf: p.cpf || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    birthDate: p.birth_date || '',
    clinicalNotes: p.clinical_notes || '',
    allergies: p.allergies || [],
    leadSource: p.lead_source || null,
    referralName: p.referral_name || null,
    createdAt: p.created_at,
    status: p.status as 'active' | 'inactive',
  };
}

export function QuickActions() {
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [documentPrintOpen, setDocumentPrintOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentPrintType>('atestado');
  const [documentPatientId, setDocumentPatientId] = useState('');
  const [documentPatient, setDocumentPatient] = useState<Patient | null>(null);

  const { createPatient } = usePatientMutations();
  const { patients } = usePatients();
  const { createAppointment } = useAppointmentMutations();
  const { createTransaction } = useTransactionMutations();
  const { activeProfessionals } = useProfessionals();
  const { clinic } = useClinic();
  const { branding } = useClinicBranding();
  // Mesma fonte de dados da Agenda: usada aqui só para detectar conflito de horário.
  const { appointments: rawAppointments } = useAppointments();

  const clinicForDialog = clinic
    ? { id: clinic.id, name: clinic.name, phone: clinic.phone || '', address: clinic.address || '', cnpj: clinic.cnpj || '' }
    : null;

  const existingAppointments: AgendaAppointment[] = rawAppointments.map((apt: any) => ({
    id: apt.id,
    date: apt.date,
    startTime: apt.start_time?.slice(0, 5) || '',
    endTime: apt.end_time?.slice(0, 5) || '',
    patientId: apt.patient_id,
    patientName: apt.patient?.name || 'Paciente',
    professional: {
      id: apt.professional?.id || apt.professional_id,
      name: apt.professional?.name || 'Profissional',
      specialty: apt.professional?.specialty || '',
      cro: apt.professional?.cro || '',
    },
    procedure: apt.procedure,
    procedureId: apt.procedure_id ?? undefined,
    procedurePrice: apt.procedure_price == null ? undefined : Number(apt.procedure_price),
    status: apt.status,
    paymentStatus: apt.payment_status,
    notes: apt.notes,
    clinic: clinicForDialog || { id: apt.clinic_id, name: '', address: '', phone: '', cnpj: '' },
  }));

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
      lead_source: patientData.leadSource || null,
      referral_name: patientData.referralName || null,
      status: patientData.status,
    });
    setPatientDialogOpen(false);
  };

  const handleSaveAppointment = async (appointmentData: any) => {
    // Transform from dialog format to database format
    await createAppointment.mutateAsync({
      clinic_id: appointmentData.clinic?.id,
      patient_id: appointmentData.patientId,
      professional_id: appointmentData.professional?.id || appointmentData.professionalId,
      date: appointmentData.date,
      start_time: appointmentData.startTime,
      end_time: appointmentData.endTime,
      procedure: appointmentData.procedure,
      procedure_id: appointmentData.procedureId ?? null,
      procedure_price: appointmentData.procedurePrice ?? null,
      status: appointmentData.status || 'pending',
      payment_status: appointmentData.paymentStatus || 'pending',
      notes: appointmentData.notes || null,
      seller_id: appointmentData.sellerId || null,
      lead_source: appointmentData.leadSource || null,
      referral_name: appointmentData.referralName ?? null,
      booking_fee: appointmentData.bookingFee ?? null,
      booking_fee_payment_method: appointmentData.bookingFeePaymentMethod ?? null,
    });
    setAppointmentDialogOpen(false);
  };

  const openDocumentDialog = () => {
    setDocumentType('atestado');
    setDocumentPatientId(patients[0]?.id || '');
    setDocumentDialogOpen(true);
  };

  const handleDocumentContinue = () => {
    const dbPatient = patients.find((p) => p.id === documentPatientId);
    setDocumentPatient(dbPatient ? mapDbPatientToPatient(dbPatient) : null);
    setDocumentDialogOpen(false);
    setDocumentPrintOpen(true);
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
    {
      icon: FileText,
      label: "Emitir Documento",
      description: "Atestado, declaração ou receituário",
      onClick: openDocumentDialog,
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
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <div key={action.label} className="min-w-0">
                  <Button
                    variant="outline"
                    className="flex h-auto w-full flex-col items-center gap-2 p-4 hover:border-primary hover:bg-accent"
                    onClick={action.onClick}
                  >
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-center w-full space-y-0.5">
                      <p className="text-sm font-medium leading-tight">
                        {action.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {action.description}
                      </p>
                    </div>
                  </Button>
                </div>
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
        clinics={clinicForDialog ? [clinicForDialog] : []}
        existingAppointments={existingAppointments}
      />

      {/* Payment Form Dialog */}
      <PaymentForm
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSave={handleSaveTransaction}
        type="income"
      />

      {/* Emitir Documento: escolher tipo + paciente, depois abre o preview/impressão */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir Documento</DialogTitle>
            <DialogDescription>
              Escolha o tipo de documento e o paciente. Você poderá editar o conteúdo antes de gerar o PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentPrintType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={documentPatientId} onValueChange={setDocumentPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {patients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum paciente cadastrado. Você ainda pode emitir o documento e preencher o nome manualmente.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDocumentContinue}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPrintPreview
        open={documentPrintOpen}
        onOpenChange={setDocumentPrintOpen}
        type={documentType}
        patient={documentPatient}
        clinicName={clinic?.name || ''}
        clinicCnpj={clinic?.cnpj || ''}
        clinicRazaoSocial={clinic?.razao_social || clinic?.name || ''}
        clinicLogoUrl={branding?.logo}
        clinicAddress={clinic ? formatClinicAddress(clinic) || undefined : undefined}
        clinicPhone={clinic?.phone || undefined}
        clinicEmail={clinic?.email || undefined}
        primaryColor={branding?.primaryColor || '#000000'}
        useDefaultColor={!branding?.hasCustomColor}
        professionals={activeProfessionals.map((p) => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty,
          cro: p.cro,
        }))}
      />
    </>
  );
}
