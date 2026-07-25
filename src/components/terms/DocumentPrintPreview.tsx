import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Patient } from '@/types/patient';
import { FileDown, X, Phone, Mail, MapPin, ChevronsUpDown, MessageCircle, PenLine } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateWhatsAppUrl } from '@/utils/whatsapp';
import { useClinicMedications, useClinicMedicationMutations } from '@/hooks/useClinicMedications';
import { useCid10Search } from '@/hooks/useCid10';
import { useDocumentSignatureMutations } from '@/hooks/useDocumentSignatures';
import { SIGNATURE_CONSENT_TEXT } from '@/types/documentSignature';
import { SendForSignatureDialog, type SendForSignatureResult } from './SendForSignatureDialog';

export type DocumentPrintType = 'atestado' | 'declaracao' | 'termo_ciencia' | 'recibo' | 'receituario';

/** Desativado por pedido do cliente — reative trocando pra `true` quando for retomar a feature. */
const ENABLE_SEND_FOR_SIGNATURE = false;

/** Posologias comuns pra montar a linha do medicamento sem digitar tudo na mão. */
const FREQUENCY_OPTIONS = [
  '4/4h',
  '6/6h',
  '8/8h',
  '12/12h',
  '24/24h',
  '1x ao dia',
  '2x ao dia',
  '3x ao dia',
  'Se necessário (SOS)',
];

export interface ProfessionalOption {
  id: string;
  name: string;
  specialty: string;
  cro: string;
}

interface DocumentPrintPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: DocumentPrintType;
  patient: Patient | null;
  /** Usado pra salvar medicamentos no catálogo da clínica e pra anexar o PDF ao enviar por WhatsApp/e-mail */
  clinicId?: string | null;
  clinicName: string;
  clinicCnpj: string;
  clinicRazaoSocial: string;
  clinicLogoUrl?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  /** Cidade/UF cadastrados na clinica, usados na localidade da data de emissao (ex: "Fortaleza, CE") */
  clinicCity?: string;
  clinicState?: string;
  primaryColor?: string;
  useDefaultColor?: boolean;
  professionals?: ProfessionalOption[];
  customContent?: string;
  paymentValue?: number;
  paymentDescription?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const InlineInput = ({ value, onChange, placeholder, className = '' }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`inline-block min-w-[120px] border-b border-foreground bg-transparent px-1 py-0.5 focus:outline-none focus:ring-0 ${className}`}
    style={{ fontFamily: 'inherit', fontSize: 'inherit' }}
  />
);

export function DocumentPrintPreview(props: DocumentPrintPreviewProps) {
  const {
    open,
    onOpenChange,
    type,
    patient,
    clinicId,
    clinicName,
    clinicCnpj,
    clinicRazaoSocial,
    clinicLogoUrl,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    clinicCity,
    clinicState,
    primaryColor = '#000000',
    useDefaultColor = true,
    professionals = [],
    customContent,
    paymentValue = 0,
    paymentDescription = 'Servicos odontologicos',
  } = props;

  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [atestadoPaciente, setAtestadoPaciente] = useState('');
  const [atestadoDias, setAtestadoDias] = useState('');
  const [atestadoCid, setAtestadoCid] = useState('');
  const [atestadoCidQuery, setAtestadoCidQuery] = useState('');
  const [atestadoCidComboOpen, setAtestadoCidComboOpen] = useState(false);
  const { results: cidResults, loading: cidLoading } = useCid10Search(atestadoCidQuery);
  const [declaracaoPaciente, setDeclaracaoPaciente] = useState('');
  const [declaracaoCpf, setDeclaracaoCpf] = useState('');
  const [declaracaoTipo, setDeclaracaoTipo] = useState('comparecimento');
  const [declaracaoHoraInicio, setDeclaracaoHoraInicio] = useState('14:00');
  const [declaracaoHoraFim, setDeclaracaoHoraFim] = useState('16:00');
  const [termoConteudo, setTermoConteudo] = useState('');
  const [receituarioPaciente, setReceituarioPaciente] = useState('');
  const [receituarioCpf, setReceituarioCpf] = useState('');
  const [receituarioConteudo, setReceituarioConteudo] = useState('');
  const [receituarioUso, setReceituarioUso] = useState('');
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState(FREQUENCY_OPTIONS[2]);
  const [medDuration, setMedDuration] = useState('');
  const [medItemCount, setMedItemCount] = useState(0);
  const [medIsControlled, setMedIsControlled] = useState(false);
  const [medSaveToCatalog, setMedSaveToCatalog] = useState(true);
  const [medComboOpen, setMedComboOpen] = useState(false);
  /** Uma vez marcado, o receituário inteiro sai no formato de Controle Especial (2 vias). */
  const [hasControlledMedication, setHasControlledMedication] = useState(false);
  const [sharingChannel, setSharingChannel] = useState<'whatsapp' | 'email' | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureFilePath, setSignatureFilePath] = useState<string | null>(null);
  const [signatureDocumentUrl, setSignatureDocumentUrl] = useState<string | null>(null);
  const [preparingSignature, setPreparingSignature] = useState(false);
  const [submittingSignature, setSubmittingSignature] = useState(false);

  const { createSignatureRequest } = useDocumentSignatureMutations();

  const { activeMedications } = useClinicMedications(clinicId);
  const { createMedication } = useClinicMedicationMutations();
  const isKnownMedication = useMemo(
    () => activeMedications.some((m) => m.name.trim().toLowerCase() === medName.trim().toLowerCase()),
    [activeMedications, medName]
  );

  const selectedProf = professionals.find((p) => p.id === selectedProfId) || professionals[0];
  const profName = selectedProf?.name || '________________';
  const profCro = selectedProf?.cro || '00000000';
  const profSpecialty = selectedProf?.specialty || 'Odontologista';

  useEffect(() => {
    if (patient) {
      setAtestadoPaciente(patient.name);
      setDeclaracaoPaciente(patient.name);
      setDeclaracaoCpf(patient.cpf || '');
      setReceituarioPaciente(patient.name);
      setReceituarioCpf(patient.cpf || '');
    }
  }, [patient]);

  useEffect(() => {
    if (open && type === 'atestado') {
      setAtestadoCid('');
      setAtestadoCidQuery('');
    }
  }, [open, type]);

  useEffect(() => {
    if (open && type === 'receituario') {
      setReceituarioConteudo(
        'Rp.\n\n1. _______________________________________________\n   Uso: ___________________________________________\n\n2. _______________________________________________\n   Uso: ___________________________________________'
      );
      setReceituarioUso('');
      setMedName('');
      setMedDosage('');
      setMedFrequency(FREQUENCY_OPTIONS[2]);
      setMedDuration('');
      setMedItemCount(0);
      setMedIsControlled(false);
      setMedSaveToCatalog(true);
      setHasControlledMedication(false);
    }
  }, [open, type]);

  /**
   * Monta a linha "N. medicamento — dose, frequência, por X dias" e adiciona
   * na prescrição. Na primeira adição, substitui o modelo de preenchimento
   * manual; depois disso, o textarea continua 100% editável na mão.
   * Se marcado como controle especial, o receituário inteiro passa a sair
   * no formato de 2 vias (Farmácia/Paciente) ao gerar o PDF.
   */
  const handleAddMedication = () => {
    const trimmedName = medName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do medicamento');
      return;
    }
    const nextNumber = medItemCount + 1;
    const dosePart = medDosage.trim() ? `${medDosage.trim()} — ` : '';
    const durationPart = medDuration.trim() ? `, por ${medDuration.trim()}` : '';
    const controlledTag = medIsControlled ? ' [Controle Especial]' : '';
    const line = `${nextNumber}. ${trimmedName}${controlledTag}\n   Uso: ${dosePart}${medFrequency}${durationPart}`;

    setReceituarioConteudo((prev) => (medItemCount === 0 ? `Rp.\n\n${line}` : `${prev}\n\n${line}`));
    setMedItemCount(nextNumber);
    if (medIsControlled) setHasControlledMedication(true);

    if (medSaveToCatalog && !isKnownMedication && clinicId) {
      createMedication.mutate({
        name: trimmedName,
        is_controlled: medIsControlled,
        default_posologia: null,
        is_active: true,
      });
    }

    setMedName('');
    setMedDosage('');
    setMedDuration('');
    setMedIsControlled(false);
    setMedSaveToCatalog(true);
  };

  useEffect(() => {
    if (professionals.length > 0 && !selectedProfId) {
      setSelectedProfId(professionals[0].id);
    }
  }, [professionals, selectedProfId]);

  const printRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  /** Faz o screenshot do documento offscreen e monta o jsPDF (sem salvar/baixar ainda). */
  const buildPdf = async (): Promise<{ pdf: jsPDF; fileName: string }> => {
    const printContent = printRef.current;
    if (!printContent) throw new Error('Não foi possível preparar o conteúdo do documento.');
    const canvas = await html2canvas(printContent, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgW = canvas.width;
    const imgH = canvas.height;
    const pxToMm = 25.4 / 96;
    const imgWmm = imgW * pxToMm;
    const imgHmm = imgH * pxToMm;
    const ratio = Math.min((pdfW - 10) / imgWmm, (pdfH - 10) / imgHmm);
    const finalW = imgWmm * ratio;
    const finalH = imgHmm * ratio;
    const imgX = (pdfW - finalW) / 2;
    const imgY = 5;
    pdf.addImage(imgData, 'PNG', imgX, imgY, finalW, finalH);
    const fileName = `${titles[type].replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    return { pdf, fileName };
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { pdf, fileName } = await buildPdf();
      pdf.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  /**
   * Gera o PDF, anexa ao prontuário do paciente (patient_files) e abre o
   * WhatsApp/e-mail com um link assinado pra ele. Não há envio automático
   * por e-mail transacional hoje — abre o cliente de e-mail do usuário com
   * o link já preenchido (mesma ideia do WhatsApp, sem precisar anexar).
   */
  const handleShareDocument = async (channel: 'whatsapp' | 'email') => {
    if (!patient) {
      toast.error('Selecione um paciente antes de enviar.');
      return;
    }
    if (channel === 'whatsapp' && !patient.phone) {
      toast.error('Este paciente não tem telefone cadastrado.');
      return;
    }
    if (channel === 'email' && !patient.email) {
      toast.error('Este paciente não tem e-mail cadastrado.');
      return;
    }
    if (!clinicId) {
      toast.error('Clínica não identificada.');
      return;
    }

    setSharingChannel(channel);
    try {
      const { pdf, fileName } = await buildPdf();
      const blob = pdf.output('blob') as Blob;
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${clinicId}/${patient.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-files')
        .upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { error: insertError } = await supabase.from('patient_files').insert({
        clinic_id: clinicId,
        patient_id: patient.id,
        name: fileName,
        file_path: path,
        mime_type: 'application/pdf',
        file_size: blob.size,
        category: 'documento',
      });
      if (insertError) {
        console.error('Falha ao registrar o documento no prontuário:', insertError);
      }

      const { data: signed, error: signError } = await supabase.storage
        .from('patient-files')
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signError || !signed?.signedUrl) {
        throw new Error('Não foi possível gerar o link do documento.');
      }

      const firstName = patient.name?.split(' ')[0] || patient.name;
      const message = `Olá${firstName ? `, ${firstName}` : ''}! Segue seu(sua) ${titles[type].toLowerCase()} da ${clinicName || clinicRazaoSocial}:\n${signed.signedUrl}\n\nO link fica disponível por 7 dias.`;

      if (channel === 'whatsapp') {
        window.open(generateWhatsAppUrl(patient.phone, message), '_blank');
      } else {
        const subject = encodeURIComponent(`${titles[type]} - ${clinicName || clinicRazaoSocial}`);
        const body = encodeURIComponent(message);
        window.open(`mailto:${patient.email}?subject=${subject}&body=${body}`, '_blank');
      }
    } catch (err) {
      console.error('Erro ao compartilhar documento:', err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível preparar o documento para envio.');
    } finally {
      setSharingChannel(null);
    }
  };

  /**
   * Gera e anexa o PDF ao prontuário (igual handleShareDocument) e só então
   * abre o diálogo de "Enviar para assinatura" com o link de visualização.
   */
  const handleOpenSignatureDialog = async () => {
    if (!patient) {
      toast.error('Selecione um paciente antes de enviar para assinatura.');
      return;
    }
    if (!clinicId) {
      toast.error('Clínica não identificada.');
      return;
    }
    setPreparingSignature(true);
    try {
      const { pdf, fileName } = await buildPdf();
      const blob = pdf.output('blob') as Blob;
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${clinicId}/${patient.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient-files')
        .upload(path, blob, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { error: insertError } = await supabase.from('patient_files').insert({
        clinic_id: clinicId,
        patient_id: patient.id,
        name: fileName,
        file_path: path,
        mime_type: 'application/pdf',
        file_size: blob.size,
        category: 'documento',
      });
      if (insertError) console.error('Falha ao registrar o documento no prontuário:', insertError);

      const { data: signed } = await supabase.storage.from('patient-files').createSignedUrl(path, 60 * 30);

      setSignatureFilePath(path);
      setSignatureDocumentUrl(signed?.signedUrl ?? null);
      setSignatureDialogOpen(true);
    } catch (err) {
      console.error('Erro ao preparar documento para assinatura:', err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível preparar o documento.');
    } finally {
      setPreparingSignature(false);
    }
  };

  const handleConfirmSignatureRequest = async (result: SendForSignatureResult) => {
    if (!signatureFilePath || !clinicId) return;
    setSubmittingSignature(true);
    try {
      const created = await createSignatureRequest.mutateAsync({
        patient_id: patient?.id || null,
        document_type: type,
        document_name: titles[type],
        file_path: signatureFilePath,
        signer_name: result.signerName,
        signer_cpf: result.signerCpf || null,
        signer_cro: result.signerCro || null,
        signer_state: result.signerState || null,
        signer_whatsapp: result.signerWhatsapp,
        signer_birth_date: result.signerBirthDate || null,
        consent_text: SIGNATURE_CONSENT_TEXT,
      });

      const signLink = `${window.location.origin}/assinar/${created.token}`;
      const firstName = result.signerName.split(' ')[0] || result.signerName;
      const message = `Olá, ${firstName}! Você recebeu um documento para assinatura eletrônica: ${titles[type]} (${clinicName || clinicRazaoSocial}).\n\nAbra o link pra visualizar e assinar:\n${signLink}`;
      window.open(generateWhatsAppUrl(result.signerWhatsapp, message), '_blank');

      toast.success('Solicitação de assinatura enviada por WhatsApp!');
      setSignatureDialogOpen(false);
    } catch (err) {
      console.error('Erro ao enviar para assinatura:', err);
      toast.error('Não foi possível enviar para assinatura.');
    } finally {
      setSubmittingSignature(false);
    }
  };

  const currentDateOnly = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const clinicLocation = [clinicCity, clinicState].filter(Boolean).join(', ');
  const currentDate = clinicLocation ? `${clinicLocation}, ${currentDateOnly}` : currentDateOnly;

  const titles: Record<DocumentPrintType, string> = {
    atestado: 'Atestado',
    declaracao: 'Declaracao',
    termo_ciencia: 'Termo de Ciencia',
    recibo: 'Recibo de Pagamento',
    receituario: 'Receituario',
  };

  const renderDocumentContent = (forPrint: boolean) => {
    const val = (v: string, d: string) => (forPrint ? (v || d) : null);
    const Inline = forPrint
      ? ({ value, def }: { value: string; def: string }) => <span>{value || def}</span>
      : ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
          <InlineInput value={value} onChange={onChange} placeholder={placeholder} />
        );

    if (type === 'recibo') {
      return (
        <>
          <p className="mb-4">
            Recebemos de <strong>{patient?.name || '________________'}</strong>, CPF <strong>{patient?.cpf || '________________'}</strong>, a quantia de{' '}
            <strong>{formatCurrency(paymentValue)}</strong> ({paymentDescription}) referente a servicos prestados.
          </p>
          <p className="mb-4">Para clareza, firmamos o presente recibo.</p>
        </>
      );
    }

    if (type === 'atestado') {
      return (
        <div className="space-y-4 text-justify">
          <p>
            Atesto, para os devidos fins, que o(a) Sr.(a){' '}
            {forPrint ? (
              <span className="font-semibold">{atestadoPaciente || patient?.name || '________________'}</span>
            ) : (
              <InlineInput value={atestadoPaciente} onChange={setAtestadoPaciente} placeholder="Nome do paciente" />
            )}{' '}
            foi submetido(a) a procedimentos nesta data.
          </p>
          <p>
            Em decorrência, deverá permanecer afastado(a) de suas atividades por um período de{' '}
            {forPrint ? (
              <span>{atestadoDias ? `${atestadoDias} ${parseInt(atestadoDias) === 1 ? 'dia' : 'dias'}` : '________'}</span>
            ) : (
              <input
                type="number"
                min="1"
                value={atestadoDias}
                onChange={(e) => setAtestadoDias(e.target.value)}
                placeholder="0"
                className="inline-block w-16 border-b border-foreground bg-transparent px-1 text-center"
              />
            )}{' '}
            {!forPrint && (parseInt(atestadoDias) === 1 ? 'dia' : 'dias')}, a partir desta data.
          </p>
          {(atestadoCid || !forPrint) && (
            <div className="mt-2">
              <p className="font-medium mb-1">CID:</p>
              {forPrint ? (
                atestadoCid && <span>{atestadoCid}</span>
              ) : (
                <Popover open={atestadoCidComboOpen} onOpenChange={setAtestadoCidComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="h-9 w-full max-w-md justify-between rounded border-border bg-background px-2 text-sm font-normal"
                    >
                      <span className="truncate">{atestadoCid || 'Buscar por código ou nome da doença...'}</span>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        value={atestadoCidQuery}
                        onValueChange={setAtestadoCidQuery}
                        placeholder="Ex: K08 ou periodontite..."
                      />
                      <CommandList>
                        <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
                          {atestadoCidQuery.trim().length < 2
                            ? 'Digite ao menos 2 letras para buscar.'
                            : cidLoading
                              ? 'Carregando base da CID-10...'
                              : 'Nenhum CID encontrado.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {cidResults.map((cid) => (
                            <CommandItem
                              key={cid.code}
                              value={cid.code}
                              onSelect={() => {
                                setAtestadoCid(cid.code);
                                setAtestadoCidComboOpen(false);
                              }}
                            >
                              <span className="font-medium mr-2">{cid.code}</span>
                              <span className="truncate text-muted-foreground">{cid.description}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              {!forPrint && atestadoCid && (
                <button
                  type="button"
                  onClick={() => {
                    setAtestadoCid('');
                    setAtestadoCidQuery('');
                  }}
                  className="mt-1 text-xs text-muted-foreground underline"
                >
                  Remover CID
                </button>
              )}
            </div>
          )}
          <p className="text-right mt-6">{currentDate}</p>
        </div>
      );
    }

    if (type === 'declaracao') {
      return (
        <div className="space-y-4 text-justify">
          <p>
            Declaramos para os devidos fins que{' '}
            {forPrint ? (
              <span className="font-semibold">{declaracaoPaciente || patient?.name || '________________'}</span>
            ) : (
              <InlineInput value={declaracaoPaciente} onChange={setDeclaracaoPaciente} placeholder="Nome" />
            )}{' '}
            , CPF{' '}
            {forPrint ? (
              <span>{declaracaoCpf || patient?.cpf || '________________'}</span>
            ) : (
              <InlineInput value={declaracaoCpf} onChange={setDeclaracaoCpf} placeholder="CPF" />
            )}{' '}
            , e paciente de nossa clinica.
          </p>
          <p>
            Declaracao de {forPrint ? declaracaoTipo : <InlineInput value={declaracaoTipo} onChange={setDeclaracaoTipo} placeholder="ex: comparecimento" />}: compareceu em nossa clinica no dia {format(new Date(), 'dd/MM/yyyy')} das{' '}
            {forPrint ? <span>{declaracaoHoraInicio}</span> : <input type="time" value={declaracaoHoraInicio} onChange={(e) => setDeclaracaoHoraInicio(e.target.value)} className="border-b border-foreground bg-transparent px-1" />} as{' '}
            {forPrint ? <span>{declaracaoHoraFim}</span> : <input type="time" value={declaracaoHoraFim} onChange={(e) => setDeclaracaoHoraFim(e.target.value)} className="border-b border-foreground bg-transparent px-1" />} horas.
          </p>
          <p className="text-right mt-6">{currentDate}</p>
        </div>
      );
    }

    if (type === 'termo_ciencia') {
      const content = customContent || termoConteudo || `Ciente das informacoes prestadas, o(a) paciente ${patient?.name || '________________'} declara ter ciencia dos procedimentos e condicoes descritas acima.`;
      return (
        <div className="space-y-4">
          {forPrint ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <textarea
              value={termoConteudo || customContent || ''}
              onChange={(e) => setTermoConteudo(e.target.value)}
              className="w-full min-h-[200px] border border-border rounded p-3 bg-transparent resize-y"
              placeholder="Conteudo do termo..."
            />
          )}
          <p className="text-right mt-6">{currentDate}</p>
        </div>
      );
    }

    if (type === 'receituario') {
      return (
        <div className="space-y-4 text-justify">
          <p>
            Paciente:{' '}
            {forPrint ? (
              <span className="font-semibold">{receituarioPaciente || patient?.name || '________________'}</span>
            ) : (
              <InlineInput
                value={receituarioPaciente}
                onChange={setReceituarioPaciente}
                placeholder="Nome do paciente"
                className="min-w-[220px]"
              />
            )}
          </p>
          <p>
            CPF:{' '}
            {forPrint ? (
              <span>{receituarioCpf || patient?.cpf || '________________'}</span>
            ) : (
              <InlineInput value={receituarioCpf} onChange={setReceituarioCpf} placeholder="CPF" />
            )}
          </p>
          <div className="mt-4">
            <p className="font-semibold mb-2">Prescricao:</p>
            {!forPrint && (
              <div className="mb-3 space-y-2 rounded-md border border-dashed border-border bg-muted/20 p-3">
                <p className="text-sm font-medium">Adicionar medicamento</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Popover open={medComboOpen} onOpenChange={setMedComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="h-9 justify-between rounded border-border bg-background px-2 text-sm font-normal"
                      >
                        <span className="truncate">{medName || 'Medicamento (ex: Amoxicilina 500mg)'}</span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput
                          value={medName}
                          onValueChange={(v) => {
                            setMedName(v);
                            setMedIsControlled(false);
                          }}
                          placeholder="Buscar ou digitar medicamento..."
                        />
                        <CommandList>
                          <CommandEmpty className="px-3 py-2 text-sm text-muted-foreground">
                            Nenhum medicamento salvo com esse nome. Pode digitar um novo.
                          </CommandEmpty>
                          <CommandGroup heading={activeMedications.length > 0 ? 'Catálogo da clínica' : undefined}>
                            {activeMedications.map((m) => (
                              <CommandItem
                                key={m.id}
                                value={m.name}
                                onSelect={() => {
                                  setMedName(m.name);
                                  setMedIsControlled(m.is_controlled);
                                  setMedComboOpen(false);
                                }}
                              >
                                <span className="flex-1 truncate">{m.name}</span>
                                {m.is_controlled && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">
                                    Controlado
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="Quantidade/dose (ex: 1 cápsula)"
                    className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Select value={medFrequency} onValueChange={setMedFrequency}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="text"
                    value={medDuration}
                    onChange={(e) => setMedDuration(e.target.value)}
                    placeholder="Duração (ex: 7 dias) - opcional"
                    className="rounded border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddMedication}>
                    Adicionar
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox checked={medIsControlled} onCheckedChange={(c) => setMedIsControlled(c === true)} />
                  Este medicamento exige receita de controle especial
                </label>
                {medName.trim() && !isKnownMedication && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={medSaveToCatalog} onCheckedChange={(c) => setMedSaveToCatalog(c === true)} />
                    Salvar "{medName.trim()}" no catálogo da clínica pra sugerir da próxima vez
                  </label>
                )}
                {hasControlledMedication && (
                  <p className="text-xs font-medium text-destructive">
                    ⚠ Este receituário sairá no formato de Controle Especial (2 vias) ao gerar o PDF, pois inclui medicamento controlado.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Preenche a prescrição abaixo automaticamente. Você pode editar o texto na mão a qualquer momento, inclusive depois de adicionar.
                </p>
              </div>
            )}
            {forPrint ? (
              <div className="whitespace-pre-wrap min-h-[160px]">{receituarioConteudo}</div>
            ) : (
              <textarea
                value={receituarioConteudo}
                onChange={(e) => setReceituarioConteudo(e.target.value)}
                className="w-full min-h-[180px] border border-border rounded p-3 bg-transparent resize-y"
                placeholder="Medicamentos, dosagem e posologia..."
              />
            )}
          </div>
          {(receituarioUso || !forPrint) && (
            <div>
              <p className="font-semibold mb-2">Orientacoes:</p>
              {forPrint ? (
                <div className="whitespace-pre-wrap">{receituarioUso}</div>
              ) : (
                <textarea
                  value={receituarioUso}
                  onChange={(e) => setReceituarioUso(e.target.value)}
                  className="w-full min-h-[80px] border border-border rounded p-3 bg-transparent resize-y"
                  placeholder="Orientacoes ao paciente (opcional)"
                />
              )}
            </div>
          )}
          <p className="text-right mt-6">{currentDate}</p>
        </div>
      );
    }

    return null;
  };

  // Casco do documento (marca d'agua, cabecalho, conteudo, assinatura, rodape).
  // Renderizado 2x: visivel (forPrint=false, com inputs/textarea p/ editar) e
  // uma copia fora da tela (forPrint=true, so texto) usada pra gerar o PDF —
  // assim o formulario de "Adicionar medicamento" e os proprios campos de
  // edicao nunca aparecem no PDF, e textos com quebra de linha (ex.: a
  // prescricao do receituario) saem corretos (html2canvas nao renderiza bem
  // o valor de <textarea>/<input> com varias linhas).
  const renderDocumentShell = (forPrint: boolean) => (
    <>
      {/* Marca d'agua centralizada e transparente */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ opacity: 0.06 }}>
        {clinicLogoUrl ? (
          <img src={clinicLogoUrl} alt="" className="max-w-[280px] max-h-[280px] object-contain" />
        ) : (
          <span className="text-6xl font-bold text-black/10" style={{ fontFamily: "'Times New Roman', serif" }}>
            {clinicName || clinicRazaoSocial || 'Clinica'}
          </span>
        )}
      </div>

      <div className="relative z-10 flex flex-col min-h-[calc(297mm-4rem)]">
      <div className="flex flex-col items-center text-center mb-6 pb-4" style={{ borderBottom: `2px solid ${primaryColor}` }}>
        {clinicLogoUrl ? (
          <img src={clinicLogoUrl} alt="Logo" className="w-16 h-16 object-contain mb-2" />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${primaryColor}20` }}>
            <svg viewBox="0 0 24 24" fill={primaryColor} className="w-10 h-10">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
        )}
        <h2 className="text-lg font-bold text-black">{clinicName || clinicRazaoSocial}</h2>
        {clinicRazaoSocial && clinicRazaoSocial !== (clinicName || clinicRazaoSocial) && (
          <p className="text-sm text-muted-foreground">{clinicRazaoSocial}</p>
        )}
        {clinicCnpj && <p className="text-sm text-muted-foreground">CNPJ: {clinicCnpj}</p>}
      </div>

      <h2 className="text-center text-lg font-bold mb-6 uppercase text-black">{titles[type]}</h2>

      {type === 'recibo' && (
        <div className="bg-muted/30 p-4 rounded mb-6">
          <p><strong>Paciente:</strong> {patient?.name || '________________'}</p>
          <p><strong>CPF:</strong> {patient?.cpf || '________________'}</p>
        </div>
      )}

      <div className="content text-black">{renderDocumentContent(forPrint)}</div>

      <div className="mt-12 flex justify-end">
        <div className="text-center w-[45%]">
          <div className="border-t-2 mt-16 pt-2" style={{ borderColor: primaryColor }}>
            <p className="font-medium">{profName}</p>
            <p className="text-sm text-black/80">{profSpecialty}</p>
            <p className="text-xs text-black/80">CRO {profCro}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        {useDefaultColor ? (
          <div className="-mx-8 -mb-8 pt-6 pb-6 px-8 border-t border-black/20 flex flex-wrap gap-x-6 gap-y-2 text-black text-sm">
            {(clinicName || clinicRazaoSocial) && <span>{clinicName || clinicRazaoSocial}</span>}
            {clinicCnpj && <span>CNPJ: {clinicCnpj}</span>}
            {clinicPhone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 flex-shrink-0" />{clinicPhone}</span>}
            {clinicEmail && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 flex-shrink-0" />{clinicEmail}</span>}
            {clinicAddress && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 flex-shrink-0" />{clinicAddress}</span>}
          </div>
        ) : (
          <div className="relative -mx-8 -mb-8 overflow-hidden">
            <svg className="absolute w-full h-12" viewBox="0 0 1200 48" preserveAspectRatio="none">
              <path fill={`${primaryColor}30`} d="M0,24 Q300,0 600,24 T1200,24 L1200,48 L0,48 Z" />
              <path fill={primaryColor} d="M0,36 Q300,12 600,36 T1200,36 L1200,48 L0,48 Z" />
            </svg>
            <div className="relative pt-12 pb-6 px-8 flex flex-wrap gap-x-6 gap-y-2 text-white text-sm" style={{ backgroundColor: primaryColor }}>
              {clinicPhone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 flex-shrink-0" />{clinicPhone}</span>}
              {clinicEmail && <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 flex-shrink-0" />{clinicEmail}</span>}
              {clinicAddress && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 flex-shrink-0" />{clinicAddress}</span>}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );

  /**
   * Formato de Notificação de Receita / Controle Especial (Portaria 344/98
   * ANVISA): 2 vias (Farmácia e Paciente), cada uma com a identificação do
   * comprador e do fornecedor. Usado só na geração do PDF quando algum
   * medicamento adicionado foi marcado como controle especial — a edição
   * continua no mesmo formulário simples de sempre.
   */
  const renderControlledVia = (viaLabel: string, viaOwner: string) => (
    <div className="pb-6 mb-6 border-b-2 border-dashed border-black/40 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex items-center justify-between text-xs mb-4">
        <span className="font-semibold">{clinicName || clinicRazaoSocial}</span>
        <span className="text-right font-semibold">
          {viaLabel}
          <br />
          <span className="font-normal text-black/70">{viaOwner}</span>
        </span>
      </div>
      <h2 className="text-center text-lg font-bold mb-4 uppercase">Receituário de Controle Especial</h2>
      <p className="mb-4">
        <strong>Paciente:</strong> {receituarioPaciente || patient?.name || '________________'}
      </p>
      <div className="whitespace-pre-wrap min-h-[100px] mb-8">{receituarioConteudo}</div>
      {receituarioUso && <p className="mb-8 whitespace-pre-wrap"><strong>Orientações:</strong> {receituarioUso}</p>}

      <div className="text-center w-[60%] mx-auto mt-8 mb-8">
        <div className="border-t-2 pt-2" style={{ borderColor: primaryColor }}>
          <p className="font-medium">{profName}</p>
          <p className="text-sm text-black/80">{profSpecialty}</p>
          <p className="text-xs text-black/80">CRO {profCro}</p>
          <p className="text-xs text-black/80 mt-1">{currentDate}</p>
        </div>
      </div>

      <table className="w-full border border-black text-xs">
        <thead>
          <tr>
            <th className="border border-black p-2 w-1/2">IDENTIFICAÇÃO DO COMPRADOR</th>
            <th className="border border-black p-2 w-1/2">IDENTIFICAÇÃO DO FORNECEDOR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-3 align-top">
              <p className="mb-4">Nome: ________________________________</p>
              <p className="mb-4">Ident.: _____________ Org. Emissor: ________</p>
              <p className="mb-4">End.: __________________________________</p>
              <p className="mb-4">Cidade: __________________ UF: ______</p>
              <p>Telefone: _______________________________</p>
            </td>
            <td className="border border-black p-3 align-top">
              <div className="mt-16 flex justify-between gap-2 px-1">
                <span className="flex-1 border-t border-black pt-1 text-center">ASSINATURA DO FARMACÊUTICO</span>
                <span className="w-1/3 border-t border-black pt-1 text-center">DATA</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  const renderControlledPrescriptionShell = () => (
    <div className="relative z-10 flex flex-col text-black">
      {renderControlledVia('1ª VIA', 'FARMÁCIA')}
      {renderControlledVia('2ª VIA', 'PACIENTE')}
    </div>
  );

  const isControlledReceituario = type === 'receituario' && hasControlledMedication;

  const documentShellClassName =
    "bg-white p-8 border-0 rounded-none relative w-full max-w-[210mm] min-h-[297mm] mx-auto";
  const documentShellStyle = { fontFamily: "'Times New Roman', serif" } as const;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar e Imprimir - {titles[type]}</DialogTitle>
          <DialogDescription>
            Edite os campos diretamente no documento. Apenas a assinatura do profissional (para carimbo e rubrica apos imprimir).
          </DialogDescription>
        </DialogHeader>

        {type !== 'recibo' && professionals.length >= 1 && (
          <div className="flex items-center gap-2">
            <Label>Profissional responsavel:</Label>
            <Select value={selectedProfId} onValueChange={setSelectedProfId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - {p.specialty} (CRO {p.cro})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Versao visivel para edicao (inputs/textarea) */}
        <div className={documentShellClassName} style={documentShellStyle}>
          {renderDocumentShell(false)}
        </div>

        {/*
          Versao fora da tela, so texto — e a que vira o PDF. Renderizada via
          portal direto no body: o DialogContent do Radix tem `translate-x/y`
          fixo (pra centralizar), o que criaria um "containing block" novo
          pra elementos `fixed` dentro dele e faria esse offscreen ficar
          cortado pelo `overflow-y-auto` do dialog. Fora da arvore do dialog
          isso nao acontece.
        */}
        {createPortal(
          <div
            ref={printRef}
            aria-hidden
            className={`${documentShellClassName} fixed left-[-9999px] top-0 pointer-events-none`}
            style={documentShellStyle}
          >
            {isControlledReceituario ? renderControlledPrescriptionShell() : renderDocumentShell(true)}
          </div>,
          document.body
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />Fechar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleShareDocument('whatsapp')}
            disabled={sharingChannel !== null || !patient?.phone}
            title={!patient?.phone ? 'Paciente sem telefone cadastrado' : undefined}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {sharingChannel === 'whatsapp' ? 'Preparando...' : 'WhatsApp'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleShareDocument('email')}
            disabled={sharingChannel !== null || !patient?.email}
            title={!patient?.email ? 'Paciente sem e-mail cadastrado' : undefined}
          >
            <Mail className="mr-2 h-4 w-4" />
            {sharingChannel === 'email' ? 'Preparando...' : 'E-mail'}
          </Button>
          {ENABLE_SEND_FOR_SIGNATURE && (
            <Button
              variant="outline"
              onClick={handleOpenSignatureDialog}
              disabled={preparingSignature || !patient}
              title={!patient ? 'Selecione um paciente' : undefined}
            >
              <PenLine className="mr-2 h-4 w-4" />
              {preparingSignature ? 'Preparando...' : 'Enviar para assinatura'}
            </Button>
          )}
          <Button onClick={handleGeneratePdf} disabled={generatingPdf}>
            <FileDown className="mr-2 h-4 w-4" />{generatingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {ENABLE_SEND_FOR_SIGNATURE && (
      <SendForSignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        professionals={professionals}
        defaultSignerName={patient?.name || ''}
        defaultCpf={patient?.cpf || ''}
        defaultWhatsapp={patient?.phone || ''}
        documentUrl={signatureDocumentUrl}
        isSubmitting={submittingSignature}
        onConfirm={handleConfirmSignatureRequest}
      />
    )}
    </>
  );
}
