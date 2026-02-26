import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Patient } from '@/types/patient';
import { FileDown, X, Phone, Mail, MapPin } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export type DocumentPrintType = 'atestado' | 'declaracao' | 'termo_ciencia' | 'recibo';

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
  clinicName: string;
  clinicCnpj: string;
  clinicRazaoSocial: string;
  clinicLogoUrl?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
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
    clinicName,
    clinicCnpj,
    clinicRazaoSocial,
    clinicLogoUrl,
    clinicAddress,
    clinicPhone,
    clinicEmail,
    primaryColor = '#000000',
    useDefaultColor = true,
    professionals = [],
    customContent,
    paymentValue = 0,
    paymentDescription = 'Servicos odontologicos',
  } = props;

  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [atestadoPaciente, setAtestadoPaciente] = useState('');
  const [atestadoRg, setAtestadoRg] = useState('');
  const [atestadoEndereco, setAtestadoEndereco] = useState('');
  const [atestadoHoraInicio, setAtestadoHoraInicio] = useState('14:00');
  const [atestadoHoraFim, setAtestadoHoraFim] = useState('16:00');
  const [atestadoData, setAtestadoData] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [atestadoConvalescenca, setAtestadoConvalescenca] = useState<'sim' | 'nao'>('nao');
  const [atestadoDias, setAtestadoDias] = useState('1');
  const [declaracaoPaciente, setDeclaracaoPaciente] = useState('');
  const [declaracaoCpf, setDeclaracaoCpf] = useState('');
  const [declaracaoTipo, setDeclaracaoTipo] = useState('comparecimento');
  const [declaracaoHoraInicio, setDeclaracaoHoraInicio] = useState('14:00');
  const [declaracaoHoraFim, setDeclaracaoHoraFim] = useState('16:00');
  const [termoConteudo, setTermoConteudo] = useState('');

  const selectedProf = professionals.find((p) => p.id === selectedProfId) || professionals[0];
  const profName = selectedProf?.name || '________________';
  const profCro = selectedProf?.cro || '00000000';
  const profSpecialty = selectedProf?.specialty || 'Odontologista';

  useEffect(() => {
    if (patient) {
      setAtestadoPaciente(patient.name);
      setAtestadoEndereco(patient.address || '');
      setDeclaracaoPaciente(patient.name);
      setDeclaracaoCpf(patient.cpf || '');
    }
  }, [patient]);

  useEffect(() => {
    if (professionals.length > 0 && !selectedProfId) {
      setSelectedProfId(professionals[0].id);
    }
  }, [professionals, selectedProfId]);

  const printRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleGeneratePdf = async () => {
    const printContent = printRef.current;
    if (!printContent) return;
    setGeneratingPdf(true);
    try {
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
      pdf.save(fileName);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const titles: Record<DocumentPrintType, string> = {
    atestado: 'Atestado',
    declaracao: 'Declaracao',
    termo_ciencia: 'Termo de Ciencia',
    recibo: 'Recibo de Pagamento',
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
            Atesto para os devidos fins que{' '}
            {forPrint ? (
              <span className="font-semibold">{atestadoPaciente || patient?.name || '________________'}</span>
            ) : (
              <InlineInput value={atestadoPaciente} onChange={setAtestadoPaciente} placeholder="Nome do paciente" />
            )}{' '}
            R.G.{' '}
            {forPrint ? (
              <span>{atestadoRg || '________________'}</span>
            ) : (
              <InlineInput value={atestadoRg} onChange={setAtestadoRg} placeholder="RG" />
            )}
          </p>
          <p>
            residente e domiciliado(a) a{' '}
            {forPrint ? (
              <span>{atestadoEndereco || patient?.address || '________________'}</span>
            ) : (
              <InlineInput value={atestadoEndereco} onChange={setAtestadoEndereco} placeholder="Endereco" className="min-w-[200px]" />
            )}
          </p>
          <p>
            esteve sob tratamento Odontologico neste consultorio, no periodo das{' '}
            {forPrint ? (
              <span>{atestadoHoraInicio}</span>
            ) : (
              <input type="time" value={atestadoHoraInicio} onChange={(e) => setAtestadoHoraInicio(e.target.value)} className="border-b border-foreground bg-transparent px-1" />
            )}{' '}
            as{' '}
            {forPrint ? (
              <span>{atestadoHoraFim}</span>
            ) : (
              <input type="time" value={atestadoHoraFim} onChange={(e) => setAtestadoHoraFim(e.target.value)} className="border-b border-foreground bg-transparent px-1" />
            )}{' '}
            horas do dia{' '}
            {forPrint ? (
              <span>{atestadoData}</span>
            ) : (
              <input type="text" value={atestadoData} onChange={(e) => setAtestadoData(e.target.value)} placeholder="dd/mm/aaaa" className="inline-block w-24 border-b border-foreground bg-transparent px-1 text-center" />
            )}
          </p>
          <p>
            Necessita de convalescenca? ({atestadoConvalescenca === 'sim' ? 'X' : ' '}) SIM ({atestadoConvalescenca === 'nao' ? 'X' : ' '}) NAO
            {!forPrint && (
              <span className="ml-2">
                <button type="button" onClick={() => setAtestadoConvalescenca('sim')} className="underline mr-2">Sim</button>
                <button type="button" onClick={() => setAtestadoConvalescenca('nao')} className="underline">Nao</button>
              </span>
            )}
          </p>
          {atestadoConvalescenca === 'sim' && (
            <p>
              Periodo{' '}
              {forPrint ? (
                <span>{atestadoDias} {parseInt(atestadoDias) === 1 ? 'dia' : 'dias'}</span>
              ) : (
                <>
                  <input type="number" min="1" value={atestadoDias} onChange={(e) => setAtestadoDias(e.target.value)} className="w-14 border-b border-foreground bg-transparent px-1 text-center" />{' '}
                  {parseInt(atestadoDias) === 1 ? 'dia' : 'dias'}
                </>
              )}
            </p>
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

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar e Imprimir - {titles[type]}</DialogTitle>
          <p className="text-sm text-muted-foreground">Edite os campos diretamente no documento. Apenas a assinatura do profissional (para carimbo e rubrica apos imprimir).</p>
        </DialogHeader>

        {type !== 'recibo' && professionals.length > 1 && (
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

        <div
          ref={printRef}
          className="bg-white p-8 border-0 rounded-none relative w-full max-w-[210mm] min-h-[297mm] mx-auto"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
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

          <div className="content text-black">{renderDocumentContent(false)}</div>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />Fechar
          </Button>
          <Button onClick={handleGeneratePdf} disabled={generatingPdf}>
            <FileDown className="mr-2 h-4 w-4" />{generatingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
