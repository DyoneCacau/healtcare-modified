import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Handle PASSWORD_RECOVERY event fired when user clicks the email link
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasError(false);
      }
    });

    // Also verify session exists (fallback check after 1.5s to allow event to fire first)
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setHasError(true);
          toast.error('Link inválido ou expirado. Solicite um novo link.');
        }
      });
    }, 1500);

    return () => {
      authSub.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const validatePassword = () => {
    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setPasswordChanged(true);
      toast.success('Senha alterada com sucesso!');

      // Redireciona para login após 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-2">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Link Inválido</CardTitle>
            <CardDescription>
              O link de recuperação está inválido ou expirou
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/forgot-password')} className="w-full">
              Solicitar Novo Link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (passwordChanged) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-2">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Senha Alterada!</CardTitle>
            <CardDescription>
              Sua senha foi alterada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-emerald-200 bg-emerald-50">
              <AlertDescription className="text-emerald-900">
                Redirecionando para a página de login...
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir para Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <img 
            src="/logo.png" 
            alt="HealthCare" 
            className="h-12 w-12 rounded-full object-cover mx-auto mb-2"
          />
          <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleResetPassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-sm space-y-1">
                <p>• Mínimo de 6 caracteres</p>
                <p>• Use letras, números e símbolos para maior segurança</p>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Alterando...
                </>
              ) : (
                'Alterar Senha'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
