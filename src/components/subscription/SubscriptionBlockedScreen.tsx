import { AlertTriangle, CreditCard, LogOut, Mail, Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';

const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@octupuzz.com.br';
const supportWhatsApp = (import.meta.env.VITE_SUPPORT_WHATSAPP || '5511999999999').replace(/\D/g, '');

/**
 * Tela exibida quando a assinatura está suspensa, bloqueada ou cancelada.
 * A cobrança automática usa somente links hospedados pelo Asaas.
 */
export function SubscriptionBlockedScreen() {
  const { signOut } = useAuth();
  const { refreshSubscription } = useSubscription();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="HealthCare" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-lg font-semibold">HealthCare</span>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-semibold text-destructive">Acesso suspenso</h1>
              <p className="text-sm text-muted-foreground mt-1">
                O acesso é bloqueado somente após 7 dias de tolerância do vencimento. Regularize
                a cobrança online ou fale com nossa equipe.
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-4">
            <p className="text-sm font-medium">Como proceder</p>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Entre em contato pelo e-mail ou WhatsApp abaixo</li>
              <li>Informe o e-mail da conta utilizada no sistema</li>
              <li>Aguarde a regularização pelo administrador</li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button className="flex-1" asChild>
                <Link to="/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Regularizar agora
                </Link>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a href={`mailto:${supportEmail}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar e-mail
                </a>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a
                  href={`https://wa.me/${supportWhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() => refreshSubscription()}
            >
              <RefreshCw className="h-4 w-4" />
              Já regularizei — tentar novamente
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} HealthCare. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
