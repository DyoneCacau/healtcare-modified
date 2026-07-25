import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { FileText, Printer } from 'lucide-react';
import { useClinicBranding } from '@/hooks/useTerms';
import { formatClinicAddress } from '@/lib/utils';
import { useClinic } from '@/hooks/useClinic';
import { usePatients } from '@/hooks/usePatients';
import { useProfessionals } from '@/hooks/useProfessionals';
import { Patient } from '@/types/patient';
import { ClinicBranding } from '@/types/terms';
import { DocumentPrintPreview, DocumentPrintType } from './DocumentPrintPreview';
import { ClinicBrandingEditor } from './ClinicBrandingEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MODEL_TYPES: { value: DocumentPrintType; label: string }[] = [
  { value: 'atestado', label: 'Atestado' },
  { value: 'declaracao', label: 'Declaracao' },
  { value: 'termo_ciencia', label: 'Termo de Ciencia' },
  { value: 'recibo', label: 'Recibo de Pagamento' },
  { value: 'receituario', label: 'Receituario' },
];

function mapDbPatient(p: {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  clinical_notes: string | null;
  allergies: string[] | null;
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
    leadSource: null,
    referralName: null,
    createdAt: p.created_at,
    status: p.status as 'active' | 'inactive',
  };
}

export function DocumentsAndModelsTab() {
  const { clinic } = useClinic();
  const { branding, updateBranding, uploadLogo } = useClinicBranding();
  const { patients } = usePatients();
  const { activeProfessionals } = useProfessionals();
  const [printOpen, setPrintOpen] = useState(false);
  const [printType, setPrintType] = useState<DocumentPrintType>('atestado');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [reciboValue, setReciboValue] = useState(0);
  const [reciboDesc, setReciboDesc] = useState('Servicos odontologicos');
  const [reciboDialogOpen, setReciboDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [pendingType, setPendingType] = useState<DocumentPrintType | null>(null);
  const [patientSelectId, setPatientSelectId] = useState('');

  const samplePatient: Patient | null = patients[0] ? mapDbPatient(patients[0]) : null;

  const handlePrintModel = (type: DocumentPrintType) => {
    setPrintType(type);
    if (type === 'recibo') {
      setSelectedPatient(samplePatient);
      setReciboValue(0);
      setReciboDesc('Servicos odontologicos');
      setReciboDialogOpen(true);
      return;
    }

    if (type === 'receituario') {
      setPendingType(type);
      setPatientSelectId(patients[0]?.id || '');
      setPatientDialogOpen(true);
      return;
    }

    setSelectedPatient(samplePatient);
    setPrintOpen(true);
  };

  const handleReciboConfirm = () => {
    setReciboDialogOpen(false);
    setPrintOpen(true);
  };

  const handlePatientConfirm = () => {
    const dbPatient = patients.find((p) => p.id === patientSelectId);
    setSelectedPatient(dbPatient ? mapDbPatient(dbPatient) : samplePatient);
    setPrintType(pendingType || 'receituario');
    setPatientDialogOpen(false);
    setPendingType(null);
    setPrintOpen(true);
  };

  const handleSaveBranding = (data: ClinicBranding) => {
    updateBranding.mutate(data);
  };

  const clinicCnpj = clinic?.cnpj || '';
  const clinicRazaoSocial = clinic?.razao_social || clinic?.name || '';
  const clinicName = clinic?.name || '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modelos para Impressão
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Atestados, declarações, termos de ciência, recibo e receituário. Dados da clínica (CNPJ, razão social) vêm de Configuração - Dados da Clínica.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {MODEL_TYPES.map((m) => (
              <Button
                key={m.value}
                variant="outline"
                className="h-auto py-6 flex flex-col gap-2"
                onClick={() => handlePrintModel(m.value)}
              >
                <Printer className="h-8 w-8" />
                {m.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <ClinicBrandingEditor
        branding={branding}
        onSave={handleSaveBranding}
        onUploadLogo={uploadLogo}
      />

      <Dialog open={reciboDialogOpen} onOpenChange={setReciboDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recibo de Pagamento</DialogTitle>
            <DialogDescription>Informe o valor e a descricao do servico para imprimir o recibo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <CurrencyInput
                value={reciboValue}
                onValueChange={setReciboValue}
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao do servico</Label>
              <Input
                value={reciboDesc}
                onChange={(e) => setReciboDesc(e.target.value)}
                placeholder="Servicos odontologicos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReciboDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleReciboConfirm}>Imprimir Recibo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={patientDialogOpen} onOpenChange={setPatientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receituário</DialogTitle>
            <DialogDescription>
              Selecione o paciente para preencher o receituário. Você poderá editar os medicamentos antes de gerar o PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={patientSelectId} onValueChange={setPatientSelectId}>
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
                  Nenhum paciente cadastrado. Você ainda pode emitir o receituário e preencher o nome manualmente.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePatientConfirm}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentPrintPreview
        open={printOpen}
        onOpenChange={setPrintOpen}
        type={printType}
        patient={selectedPatient}
        clinicId={clinic?.id}
        clinicName={clinicName}
        clinicCnpj={clinicCnpj}
        clinicRazaoSocial={clinicRazaoSocial}
        clinicLogoUrl={branding?.logo}
        clinicAddress={clinic ? formatClinicAddress(clinic) || undefined : undefined}
        clinicPhone={clinic?.phone || undefined}
        clinicEmail={clinic?.email || undefined}
        primaryColor={branding?.primaryColor || '#000000'}
        useDefaultColor={!branding?.hasCustomColor}
        professionals={activeProfessionals.map((p) => ({ id: p.id, name: p.name, specialty: p.specialty, cro: p.cro }))}
        paymentValue={printType === 'recibo' ? reciboValue : undefined}
        paymentDescription={printType === 'recibo' ? reciboDesc : undefined}
      />
    </div>
  );
}
