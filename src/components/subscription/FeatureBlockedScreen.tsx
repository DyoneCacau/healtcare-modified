import { useState } from 'react';
import { Lock, Sparkles, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FeatureBlockedScreenProps {
  featureName: string;
  planName: string;
}

/**
 * Tela de bloqueio exibida quando o usuário tenta acessar
 * uma funcionalidade não incluída no seu plano atual.
 * Permite solicitar upgrade manualmente.
 */
export function FeatureBlockedScreen({ featureName, planName }: FeatureBlockedScreenProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [notes, setNotes] = useState('');

  async function handleRequestUpgrade() {
    if (!user) {
      toast.error('Você precisa estar logado para solicitar upgrade');
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar clinic_id do usuário
      const { data: clinicUser } = await supabase
        .from('clinic_users')
        .select('clinic_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clinicUser) {
        toast.error('Clínica não encontrada');
        return;
      }

      // Buscar subscription atual
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id, plan_id')
        .eq('clinic_id', clinicUser.clinic_id)
        .maybeSingle();

      // Criar solicitação de upgrade
      const { error: requestError } = await supabase
        .from('upgrade_requests')
        .insert({
          clinic_id: clinicUser.clinic_id,
          subscription_id: subscription?.id || null,
          requested_by: user.id,
          requested_feature: featureName,
          current_plan_id: subscription?.plan_id || null,
          status: 'pending',
          notes: notes || `Solicitação de acesso ao módulo: ${featureName}`,
        });

      if (requestError) throw requestError;

      // Criar notificação para SuperAdmin
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'upgrade_request',
          title: 'Nova solicitação de upgrade',
          message: `Clínica solicitou acesso ao módulo "${featureName}"`,
          reference_type: 'upgrade_request',
          is_read: false,
        });

      setIsSubmitted(true);
      toast.success('Solicitação enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao solicitar upgrade:', error);
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-8">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-10 pb-8 space-y-6 text-center">
            {/* Ícone de bloqueio */}
            <div className="mx-auto h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-10 w-10 text-destructive" />
            </div>
            
            {/* Mensagem principal */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Seu plano não inclui {featureName}
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                Para acessar este módulo, solicite um upgrade do seu plano.
                Nossa equipe entrará em contato para ajudá-lo.
              </p>
            </div>

            {/* Detalhes */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Módulo:</span>
                <span className="font-semibold text-foreground">{featureName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Plano atual:</span>
                <span className="font-semibold text-foreground">{planName}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              <Button 
                onClick={() => setIsDialogOpen(true)}
                size="lg"
                className="gap-2 w-full"
              >
                <Sparkles className="h-5 w-5" />
                Solicitar Upgrade
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                size="lg"
                className="w-full"
              >
                Voltar ao Dashboard
              </Button>
            </div>

            {/* Informação adicional */}
            <p className="text-xs text-muted-foreground pt-2">
              Após a solicitação, nossa equipe analisará e entrará em contato
              com as opções de planos disponíveis.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de solicitação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isSubmitted ? 'Solicitação Enviada!' : 'Solicitar Upgrade'}
            </DialogTitle>
            <DialogDescription>
              {isSubmitted 
                ? 'Nossa equipe recebeu sua solicitação e entrará em contato em breve.'
                : `Você está solicitando acesso ao módulo "${featureName}".`
              }
            </DialogDescription>
          </DialogHeader>

          {isSubmitted ? (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-center text-muted-foreground">
                Aguarde o contato da nossa equipe para finalizar o upgrade do seu plano.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Mensagem (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Deixe uma mensagem para nossa equipe..."
                  rows={3}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Nossa equipe comercial receberá sua solicitação e entrará em contato
                para apresentar as opções de planos e valores.
              </p>
            </div>
          )}

          <DialogFooter>
            {isSubmitted ? (
              <Button onClick={() => {
                setIsDialogOpen(false);
                setIsSubmitted(false);
                setNotes('');
              }}>
                Entendi
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRequestUpgrade}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar Solicitação
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
