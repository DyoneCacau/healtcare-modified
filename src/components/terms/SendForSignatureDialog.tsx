import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateInput } from '@/components/ui/date-input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { BRAZILIAN_STATES } from '@/lib/brazilianStates';
import { SIGNATURE_CONSENT_TEXT } from '@/types/documentSignature';
import type { ProfessionalOption } from './DocumentPrintPreview';

export interface SendForSignatureResult {
  signerName: string;
  signerCpf: string;
  signerCro: string;
  signerState: string;
  signerWhatsapp: string;
  signerBirthDate: string;
}

interface SendForSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionals: ProfessionalOption[];
  defaultSignerName: string;
  defaultCpf: string;
  defaultWhatsapp: string;
  documentUrl: string | null;
  isSubmitting: boolean;
  onConfirm: (result: SendForSignatureResult) => void | Promise<void>;
}

/**
 * Diálogo de envio pra assinatura eletrônica simples (não é certificado
 * ICP-Brasil). Confirma os dados do assinante antes de gerar o link.
 */
export function SendForSignatureDialog({
  open,
  onOpenChange,
  professionals,
  defaultSignerName,
  defaultCpf,
  defaultWhatsapp,
  documentUrl,
  isSubmitting,
  onConfirm,
}: SendForSignatureDialogProps) {
  const [signerProfessionalId, setSignerProfessionalId] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerCpf, setSignerCpf] = useState('');
  const [signerCro, setSignerCro] = useState('');
  const [signerState, setSignerState] = useState('');
  const [signerWhatsapp, setSignerWhatsapp] = useState('');
  const [signerBirthDate, setSignerBirthDate] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) {
      setSignerProfessionalId('');
      setSignerName(defaultSignerName);
      setSignerCpf(defaultCpf);
      setSignerCro('');
      setSignerState('');
      setSignerWhatsapp(defaultWhatsapp);
      setSignerBirthDate('');
      setAgreed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleProfessionalChange = (id: string) => {
    setSignerProfessionalId(id);
    const prof = professionals.find((p) => p.id === id);
    if (prof) {
      setSignerName(prof.name);
      setSignerCro(prof.cro || '');
    }
  };

  const handleContinue = async () => {
    if (!signerName.trim()) {
      toast.error('Informe o nome do assinante');
      return;
    }
    if (!signerWhatsapp.trim()) {
      toast.error('Informe o WhatsApp do assinante para enviar o link');
      return;
    }
    if (!agreed) {
      toast.error('É preciso marcar que está ciente antes de continuar');
      return;
    }
    await onConfirm({
      signerName: signerName.trim(),
      signerCpf: signerCpf.trim(),
      signerCro: signerCro.trim(),
      signerState: signerState,
      signerWhatsapp: signerWhatsapp.trim(),
      signerBirthDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar para assinatura</DialogTitle>
          <DialogDescription>Confirme os dados do assinante antes de completar o envio.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Profissional <span className="text-muted-foreground">Opcional</span></Label>
              <Select value={signerProfessionalId} onValueChange={handleProfessionalChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do assinante *</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nome completo" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input value={signerCpf} onChange={(e) => setSignerCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-2">
              <Label>Número do CRO</Label>
              <Input value={signerCro} onChange={(e) => setSignerCro(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={signerState || 'none'} onValueChange={(v) => setSignerState(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {BRAZILIAN_STATES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input value={signerWhatsapp} onChange={(e) => setSignerWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data de nasc. <span className="text-muted-foreground">Opcional</span></Label>
            <DateInput value={signerBirthDate} onChange={setSignerBirthDate} />
          </div>

          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Visualizar documento
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
            <span>{SIGNATURE_CONSENT_TEXT}</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button onClick={handleContinue} disabled={!agreed || isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
