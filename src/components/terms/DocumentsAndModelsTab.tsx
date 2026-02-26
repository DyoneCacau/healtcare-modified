import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Upload, Printer, FileUp, Trash2 } from 'lucide-react';
import { useClinicDocuments, useClinicBranding } from '@/hooks/useTerms';
import { useClinic } from '@/hooks/useClinic';
import { usePatients } from '@/hooks/usePatients';
import { useProfessionals } from '@/hooks/useProfessionals';
import { Patient } from '@/types/patient';
import { ClinicDocumentType } from '@/types/terms';
import { DocumentPrintPreview, DocumentPrintType } from './DocumentPrintPreview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MODEL_TYPES: { value: DocumentPrintType; label: string }[] = [
  { value: 'atestado', label: 'Atestado' },
  { value: 'declaracao', label: 'Declaracao' },
  { value: 'termo_ciencia', label: 'Termo de Ciencia' },
  { value: 'recibo', label: 'Recibo de Pagamento' },
];

export function DocumentsAndModelsTab() {
  const { clinic } = useClinic();
  const { branding } = useClinicBranding();
  const { documents, uploadDocument, deleteDocument } = useClinicDocuments();
  const { patients } = usePatients();
  const { activeProfessionals } = useProfessionals();
  const [printOpen, setPrintOpen] = useState(false);
  const [printType, setPrintType] = useState<DocumentPrintType>('atestado');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [reciboValue, setReciboValue] = useState('');
  const [reciboDesc, setReciboDesc] = useState('Servicos odontologicos');
  const [reciboDialogOpen, setReciboDialogOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<ClinicDocumentType>('outro');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePatient: Patient | null = patients[0]
    ? {
        id: patients[0].id,
        name: patients[0].name,
        cpf: patients[0].cpf || '',
        phone: patients[0].phone || '',
        email: patients[0].email || '',
        address: patients[0].address || '',
        birthDate: patients[0].birth_date || '',
        clinicalNotes: patients[0].clinical_notes || '',
        allergies: patients[0].allergies || [],
        createdAt: patients[0].created_at,
        status: patients[0].status as 'active' | 'inactive',
      }
    : null;

  const handlePrintModel = (type: DocumentPrintType) => {
    setPrintType(type);
    setSelectedPatient(samplePatient);
    if (type === 'recibo') {
      setReciboValue('');
      setReciboDesc('Servicos odontologicos');
      setReciboDialogOpen(true);
    } else {
      setPrintOpen(true);
    }
  };

  const handleReciboConfirm = () => {
    setReciboDialogOpen(false);
    setPrintOpen(true);
  };

  const handleUpload = () => {
    if (!selectedFile || !uploadName.trim()) return;
    uploadDocument.mutate(
      { file: selectedFile, name: uploadName.trim(), type: uploadType },
      {
        onSuccess: () => {
          setUploadName('');
          setUploadType('outro');
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      }
    );
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
            Modelos para Impressao
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Atestados, declaracoes, termos de ciencia e recibo de pagamento. Dados da clinica (CNPJ, razao social) vêm de Configuracao - Dados da Clinica.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Enviar Documento
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Envie PDF ou Word para usar como modelo da clinica.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do documento</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Ex: Termo de responsabilidade"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as ClinicDocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atestado">Atestado</SelectItem>
                  <SelectItem value="declaracao">Declaracao</SelectItem>
                  <SelectItem value="termo_ciencia">Termo de Ciencia</SelectItem>
                  <SelectItem value="recibo">Recibo</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Selecionar arquivo
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadName.trim() || !selectedFile || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30"
                >
                  <FileText className="h-4 w-4" />
                  <span>{d.name}</span>
                  {d.fileUrl && (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      Abrir
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteDocument.mutate(d.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={reciboDialogOpen} onOpenChange={setReciboDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recibo de Pagamento</DialogTitle>
            <DialogDescription>Informe o valor e a descricao do servico para imprimir o recibo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={reciboValue}
                onChange={(e) => setReciboValue(e.target.value)}
                placeholder="0,00"
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

      <DocumentPrintPreview
        open={printOpen}
        onOpenChange={setPrintOpen}
        type={printType}
        patient={selectedPatient}
        clinicName={clinicName}
        clinicCnpj={clinicCnpj}
        clinicRazaoSocial={clinicRazaoSocial}
        clinicLogoUrl={branding?.logo}
        clinicAddress={clinic?.address || undefined}
        clinicPhone={clinic?.phone || undefined}
        clinicEmail={clinic?.email || undefined}
        primaryColor={branding?.primaryColor || '#000000'}
        useDefaultColor={!branding?.hasCustomColor}
        professionals={activeProfessionals.map((p) => ({ id: p.id, name: p.name, specialty: p.specialty, cro: p.cro }))}
        paymentValue={printType === 'recibo' ? parseFloat(reciboValue) || 0 : undefined}
        paymentDescription={printType === 'recibo' ? reciboDesc : undefined}
      />
    </div>
  );
}
