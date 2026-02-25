import { Building2, Mail, Phone, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function ContactAdminScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-2">
            <Building2 className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>Clínica pendente de ativação</CardTitle>
          <CardDescription>
            Sua clínica foi vinculada, mas ainda precisa ser ativada pelo administrador.
            Entre em contato para concluir a configuração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Como proceder:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Entre em contato com o administrador do sistema</li>
              <li>Informe o e-mail da sua conta</li>
              <li>Aguarde a ativação da assinatura</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" asChild>
              <a href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@healthcare.com.br'}`}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar e-mail
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={`https://wa.me/${(import.meta.env.VITE_SUPPORT_WHATSAPP || '5511999999999').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Phone className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
