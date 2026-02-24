import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, MessageSquare, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message || "Erro ao fazer login");
      setIsLoading(false);
    } else {
      toast.success("Login realizado com sucesso!");
      navigate("/");
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingContact(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        message: contactForm.message || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Solicitação enviada! Entraremos em contato em breve.");
      setContactDialogOpen(false);
      setContactForm({ name: "", email: "", phone: "", message: "" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar solicitação");
    } finally {
      setIsSubmittingContact(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{background: 'linear-gradient(145deg, hsl(215 55% 18%) 0%, hsl(204 70% 28%) 50%, hsl(215 55% 14%) 100%)'}}>
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="HealthCare" 
            className="h-12 w-12 rounded-xl object-cover shadow-lg"
          />
          <span className="text-2xl font-bold text-white">
            HealthCare
          </span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Gestão odontológica
            <br />
            simplificada.
          </h1>
          <p className="max-w-md text-lg text-white/75">
            Controle sua clínica odontológica de forma eficiente com nosso sistema completo de
            gestão. Agendamentos, pacientes, financeiro e muito mais.
          </p>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <p className="text-white/85 leading-relaxed">
              Sistema completo de gestão para clínicas odontológicas. 
              Controle agendamentos, pacientes, financeiro, estoque e muito mais 
              em uma única plataforma moderna e intuitiva.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-sky-400"></div>
              <div className="h-1.5 w-1.5 rounded-full bg-white/40"></div>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} HealthCare. Todos os direitos reservados.
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <img 
              src="/logo.png" 
              alt="HealthCare" 
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-2xl font-bold text-foreground">HealthCare</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-muted-foreground">
              Entre com suas credenciais para acessar sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Lembrar de mim
                </Label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="mt-8 space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Novo cliente? Entre em contato para criar sua conta.
            </p>
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Solicitar acesso
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Solicitar acesso</DialogTitle>
                  <DialogDescription>
                    Preencha o formulário. Entraremos em contato para criar sua conta.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleContactSubmit} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Nome completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="contact-name"
                        placeholder="Seu nome"
                        className="pl-10"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Mensagem (opcional)</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="Conte-nos sobre sua clínica..."
                      rows={3}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmittingContact} className="flex-1">
                      {isSubmittingContact ? "Enviando..." : "Enviar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <p className="text-center text-xs text-muted-foreground mt-4">
              <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
