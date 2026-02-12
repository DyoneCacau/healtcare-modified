import { useEffect, useMemo, useState } from 'react';
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

let mpInitialized = false;

interface CardSubscriptionFormProps {
  amount: number;
  planId: string;
  payerEmail: string;
  userId: string;
  notes?: string | null;
  accessToken?: string | null;
  onSuccess?: () => void;
}

export function CardSubscriptionForm({
  amount,
  planId,
  payerEmail,
  userId,
  notes,
  accessToken,
  onSuccess,
}: CardSubscriptionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;

  useEffect(() => {
    if (!publicKey) return;
    if (!mpInitialized) {
      initMercadoPago(publicKey);
      mpInitialized = true;
    }
    setIsReady(true);
  }, [publicKey]);

  const initialization = useMemo(() => ({ amount }), [amount]);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token || accessToken || null;
    const refreshed = await supabase.auth.refreshSession();
    if (refreshed.data.session?.access_token) {
      token = refreshed.data.session.access_token;
    }
    return token;
  };

  if (!publicKey) {
    return (
      <div className="rounded-lg border p-3 text-sm text-destructive">
        Chave pública do Mercado Pago não configurada. Defina `VITE_MERCADOPAGO_PUBLIC_KEY` no `.env`.
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="rounded-lg border p-3 text-sm text-muted-foreground">
        Carregando formulário de cartão...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-3 text-sm text-muted-foreground">
        Cobrança recorrente mensal no cartão. Você preencherá os dados abaixo.
      </div>

      <CardPayment
        initialization={initialization}
        onSubmit={async (formData) => {
          try {
            setIsSubmitting(true);
            const payload = {
              plan_id: planId,
              user_id: userId,
              card_token_id: formData.token,
              payment_method_id: formData.payment_method_id,
              issuer_id: formData.issuer_id,
              installments: formData.installments,
              payer: formData.payer,
              payer_email: payerEmail,
              notes: notes || null,
            };

            const token = await getAccessToken();
            if (!token) {
              toast.error('Sessão inválida. Faça login novamente.');
              return;
            }
            const headers = {
              Authorization: `Bearer ${token}`,
            };
            const { data, error } = await supabase.functions.invoke('mp-create-subscription', {
              body: payload,
              headers,
            });

            if (error) throw error;
            if (data?.preapproval_id) {
              toast.success('Assinatura criada com sucesso!');
              onSuccess?.();
            } else {
              toast.error('Não foi possível criar a assinatura.');
            }
          } catch (err) {
            console.error('Error creating subscription:', err);
            toast.error('Erro ao criar assinatura no cartão.');
          } finally {
            setIsSubmitting(false);
          }
        }}
        onError={(error) => {
          console.error('CardPayment error', error);
          toast.error('Erro ao carregar pagamento no cartão.');
        }}
      />

      {isSubmitting && (
        <p className="text-xs text-muted-foreground">Processando assinatura...</p>
      )}
    </div>
  );
}
