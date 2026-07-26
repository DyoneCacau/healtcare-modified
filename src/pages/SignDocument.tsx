import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, FileWarning, Loader2, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SignaturePayload {
  documentType: string;
  documentName: string;
  clinicName: string;
  signerName: string;
  signerCpf: string | null;
  consentText: string;
  status: 'pending' | 'viewed' | 'signed' | 'cancelled' | 'expired';
  signedAt: string | null;
  documentUrl: string | null;
}

/**
 * Página pública (sem login) de assinatura eletrônica simples de documentos.
 * Aberta a partir do link enviado por WhatsApp. Não exige conta no sistema.
 */
export default function SignDocument() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SignaturePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data: result, error } = await supabase.functions.invoke('document-signature', {
        body: { action: 'fetch', token },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result as SignaturePayload);
    } catch (err) {
      console.error('Erro ao carregar documento para assinatura:', err);
      setLoadError('Não foi possível carregar este link. Ele pode ter expirado ou ser inválido.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSign = async () => {
    if (!token || !agreed) return;
    setSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('document-signature', {
        body: { action: 'sign', token, accept: true },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      toast.success('Documento assinado com sucesso!');
      await fetchData();
    } catch (err) {
      console.error('Erro ao confirmar assinatura:', err);
      toast.error(err instanceof Error ? err.message : 'Não foi possível confirmar a assinatura.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Assinatura eletrônica de documento</h1>
          {data?.clinicName && <p className="text-muted-foreground">{data.clinicName}</p>}
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Carregando documento...</p>
              </div>
            ) : loadError || !data ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileWarning className="h-10 w-10 text-destructive" />
                <p className="font-medium">{loadError || 'Link inválido.'}</p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com a clínica que enviou este link para receber um novo.
                </p>
              </div>
            ) : data.status === 'signed' ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                <p className="text-lg font-semibold">Documento já assinado</p>
                {data.signedAt && (
                  <p className="text-sm text-muted-foreground">
                    Assinado em {format(parseISO(data.signedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {data.documentUrl && (
                  <a href={data.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                    Ver documento assinado
                  </a>
                )}
              </div>
            ) : data.status === 'cancelled' ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileWarning className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Esta solicitação de assinatura foi cancelada.</p>
              </div>
            ) : data.status === 'expired' ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileWarning className="h-10 w-10 text-amber-600" />
                <p className="font-medium">Este link de assinatura expirou.</p>
                <p className="text-sm text-muted-foreground">Peça à clínica para enviar um novo link.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <CardTitle className="mb-1">{data.documentName}</CardTitle>
                  <CardDescription>
                    Assinante: <strong>{data.signerName}</strong>
                    {data.signerCpf && ` — CPF: ${data.signerCpf}`}
                  </CardDescription>
                </div>

                {data.documentUrl ? (
                  <iframe
                    src={data.documentUrl}
                    title="Documento para assinatura"
                    className="w-full h-[60vh] rounded border border-border"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Documento indisponível para pré-visualização.</p>
                )}

                <div className="rounded-md border border-border bg-muted/40 p-4">
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox checked={agreed} onCheckedChange={(c) => setAgreed(c === true)} className="mt-0.5" />
                    <span>{data.consentText}</span>
                  </label>
                </div>

                <Button className="w-full" size="lg" disabled={!agreed || submitting} onClick={handleSign}>
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  {submitting ? 'Confirmando...' : 'Assinar eletronicamente'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Assinatura eletrônica simples nos termos da Lei nº 14.063/2020. Não é um certificado digital ICP-Brasil.
        </p>
      </div>
    </div>
  );
}
