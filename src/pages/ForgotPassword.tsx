import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Por favor, insira seu email');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      toast.error(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <img 
            src="/logo.png" 
            alt="HealthCare" 
            className="h-12 w-12 rounded-full object-cover mx-auto mb-2"
          />
          <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
          <CardDescription>
            {emailSent
              ? 'Verifique seu email'
              : 'Digite seu email para receber instruções de recuperação'}
          </CardDescription>
        </CardHeader>

        {emailSent ? (
          <CardContent className="space-y-4">
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-900">
                Enviamos um link de recuperação para <strong>{email}</strong>. Verifique sua caixa de entrada e
                spam.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>• O link expira em 1 hora</p>
              <p>• Caso não receba o email, verifique a pasta de spam</p>
              <p>• Você pode solicitar um novo link após alguns minutos</p>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  Enviaremos um link para redefinir sua senha. O link será válido por 1 hora.
                </AlertDescription>
              </Alert>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>

              <Link to="/login" className="w-full">
                <Button type="button" variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Login
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}

        {emailSent && (
          <CardFooter className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
              variant="outline"
              className="w-full"
            >
              Enviar para outro email
            </Button>

            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Login
              </Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
