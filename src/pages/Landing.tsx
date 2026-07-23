import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Users,
  Wallet,
  Package,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Check,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Calendar, title: "Agenda inteligente", text: "Organize consultas e confirme pacientes sem planilha." },
  { icon: Users, title: "Pacientes e prontuário", text: "Cadastro, odontograma e histórico clínico no mesmo lugar." },
  { icon: Wallet, title: "Financeiro completo", text: "Caixa, lançamentos e visão clara do dia a dia." },
  { icon: Package, title: "Estoque", text: "Controle materiais e evite falta no consultório." },
  { icon: BarChart3, title: "Relatórios", text: "Acompanhe desempenho da clínica com clareza." },
  { icon: ShieldCheck, title: "Multi-usuário seguro", text: "Permissões por perfil e dados isolados por clínica." },
] as const;

const SCREENS = [
  {
    id: "dashboard",
    title: "Dashboard",
    caption: "Visão geral com gráfico de receitas e despesas",
    image: "/landing/landing-dashboard.png",
    alt: "Tela do dashboard HealthCare com gráfico Receitas vs Despesas",
  },
  {
    id: "pacientes",
    title: "Pacientes",
    caption: "Lista, busca e prontuário do paciente",
    image: "/landing/landing-pacientes.png",
    alt: "Tela de pacientes do HealthCare",
  },
  {
    id: "financeiro",
    title: "Financeiro",
    caption: "Caixa, entradas e movimentações do dia",
    image: "/landing/landing-financeiro.png",
    alt: "Tela financeiro e caixa do HealthCare",
  },
  {
    id: "profissionais",
    title: "Profissionais",
    caption: "Equipe, CRO e especialidades",
    image: "/landing/landing-profissionais.png",
    alt: "Tela de profissionais do HealthCare",
  },
] as const;

const PLANS = [
  {
    name: "Plano 1 - Básico",
    price: "189,00",
    description: "Acesso às funcionalidades essenciais.",
    features: [
      "Agenda",
      "Pacientes (básico)",
      "Financeiro (básico)",
      "Módulos essenciais da clínica",
    ],
    highlight: false,
  },
  {
    name: "Plano 2 - Profissional",
    price: "369,99",
    description: "Funcionalidades avançadas para clínicas em crescimento.",
    features: [
      "Agenda e pacientes",
      "Financeiro completo",
      "Profissionais",
      "Recursos avançados para operação",
    ],
    highlight: true,
  },
  {
    name: "Plano Premium",
    price: "589,90",
    description: "Acesso completo a todas as funcionalidades.",
    features: [
      "Agenda e pacientes",
      "Financeiro completo",
      "Relatórios",
      "Acesso a todos os módulos",
    ],
    highlight: false,
  },
] as const;

const FAQ = [
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. O HealthCare roda com autenticação, permissões por perfil e isolamento por clínica (RLS no banco).",
  },
  {
    q: "Posso ter mais de uma unidade?",
    a: "Sim. O plano define o limite de clínicas. Cada unidade tem sua própria assinatura e cobrança.",
  },
  {
    q: "Como funciona a contratação?",
    a: "É venda assistida: você solicita demonstração, alinhamos o plano e ativamos sua clínica na plataforma.",
  },
  {
    q: "Preciso instalar algo?",
    a: "Não. É um sistema web. Basta acessar pelo navegador em computador ou tablet.",
  },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    clinic: "",
    message: "",
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % SCREENS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const messageParts = [
        form.clinic ? `Clínica: ${form.clinic}` : null,
        form.message || null,
        "Origem: landing",
      ].filter(Boolean);

      const { error } = await supabase.from("contact_requests").insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: messageParts.join("\n") || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Solicitação enviada! Entraremos em contato em breve.");
      setForm({ name: "", email: "", phone: "", clinic: "", message: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao enviar solicitação";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-root min-h-screen bg-[#f3f7fb] text-slate-900">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <a href="#topo" className="flex items-center gap-2.5 text-white">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg object-cover shadow-md" />
            <span className="font-landing text-xl font-semibold tracking-tight">HealthCare</span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-white/85 md:flex">
            <button type="button" className="hover:text-white" onClick={() => scrollToId("recursos")}>Recursos</button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("telas")}>Telas</button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("planos")}>Planos</button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("faq")}>FAQ</button>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("contato")}>Contato</button>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button
              className="bg-white text-sky-900 hover:bg-white/90"
              onClick={() => scrollToId("contato")}
            >
              Solicitar demo
            </Button>
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-white md:hidden"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#0f2a44]/95 px-4 py-4 backdrop-blur md:hidden">
            <div className="flex flex-col gap-3 text-sm text-white">
              {[
                ["recursos", "Recursos"],
                ["telas", "Telas"],
                ["planos", "Planos"],
                ["faq", "FAQ"],
                ["contato", "Contato"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="text-left"
                  onClick={() => {
                    setMenuOpen(false);
                    scrollToId(id);
                  }}
                >
                  {label}
                </button>
              ))}
              <Link to="/login" className="pt-2 font-medium" onClick={() => setMenuOpen(false)}>
                Entrar
              </Link>
            </div>
          </div>
        )}
      </header>

      <section
        id="topo"
        className="relative isolate min-h-[100svh] overflow-hidden text-white"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(1200px 600px at 70% 20%, hsl(199 90% 45% / 0.35), transparent 60%), linear-gradient(145deg, hsl(215 55% 12%) 0%, hsl(204 70% 24%) 48%, hsl(215 50% 10%) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />

        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 lg:justify-center lg:pb-16 lg:pt-24">
          <div className="grid items-end gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="landing-fade-up max-w-xl">
              <p className="font-landing text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                HealthCare
              </p>
              <h1 className="mt-4 max-w-lg text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
                Gestão completa para sua clínica — e mais tempo para cuidar de sorrisos.
              </h1>
              <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">
                Agenda, pacientes, financeiro e estoque em uma plataforma feita para odontologia.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="bg-amber-400 text-slate-900 hover:bg-amber-300"
                  onClick={() => scrollToId("contato")}
                >
                  Solicitar demonstração
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/login">Entrar</Link>
                </Button>
              </div>
            </div>

            <div className="landing-fade-up-delay relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="landing-float overflow-hidden rounded-2xl border border-white/15 bg-[#0b1726]/40 shadow-2xl shadow-black/30">
                <img
                  src="/landing/landing-dashboard.png"
                  alt="Dashboard HealthCare com gráfico de receitas e despesas"
                  className="h-auto w-full object-cover object-top"
                  width={1536}
                  height={1024}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-b border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-landing text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Tudo que a clínica precisa no dia a dia
            </h2>
            <p className="mt-3 text-slate-600">
              Um sistema pensado para odontologia — sem módulos genéricos que atrapalham a rotina.
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="telas" className="bg-[#f3f7fb] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="font-landing text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Telas que mostram o produto
              </h2>
              <p className="mt-3 text-slate-600">
                Veja o fluxo real da clínica: dashboard, pacientes, financeiro e equipe — sem dados sensíveis.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-sky-600" /> Mais organização no atendimento</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-sky-600" /> Equipe alinhada com permissões</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-sky-600" /> Financeiro e agenda no mesmo sistema</li>
              </ul>
            </div>

            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {SCREENS.map((screen, index) => (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreen(index)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm transition-colors",
                      activeScreen === index
                        ? "bg-sky-700 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {screen.title}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{SCREENS[activeScreen].title}</p>
                    <p className="text-xs text-slate-500">{SCREENS[activeScreen].caption}</p>
                  </div>
                  <span className="text-xs text-slate-400">prévia do sistema</span>
                </div>
                <div className="bg-slate-100 transition-opacity duration-500">
                  <img
                    key={SCREENS[activeScreen].id}
                    src={SCREENS[activeScreen].image}
                    alt={SCREENS[activeScreen].alt}
                    className="landing-screen-fade h-auto w-full object-cover object-top"
                    width={1536}
                    height={1024}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-landing text-3xl font-semibold tracking-tight sm:text-4xl">
              Planos para o tamanho da sua clínica
            </h2>
            <p className="mt-3 text-slate-600">
              Valores de referência. A contratação é feita após demonstração — ativamos sua unidade com o plano certo.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6",
                  plan.highlight
                    ? "border-sky-600 bg-sky-700 text-white shadow-xl shadow-sky-700/20"
                    : "border-slate-200 bg-slate-50 text-slate-900",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-slate-900">
                    Mais popular
                  </span>
                )}
                <h3 className="font-landing text-xl font-semibold">{plan.name}</h3>
                <p className={cn("mt-1 text-sm", plan.highlight ? "text-sky-100" : "text-slate-600")}>
                  {plan.description}
                </p>
                <p className="mt-5">
                  <span className="text-sm">a partir de</span>
                  <span className="ml-2 font-landing text-4xl font-semibold">R$ {plan.price}</span>
                  <span className={cn("text-sm", plan.highlight ? "text-sky-100" : "text-slate-500")}>/mês</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0", plan.highlight ? "text-amber-300" : "text-sky-600")} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    "mt-8 w-full",
                    plan.highlight
                      ? "bg-white text-sky-800 hover:bg-sky-50"
                      : "bg-sky-700 text-white hover:bg-sky-800",
                  )}
                  onClick={() => scrollToId("contato")}
                >
                  Solicitar demonstração
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f3f7fb] py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-landing text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="mt-10">
            {FAQ.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-slate-200">
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section id="contato" className="bg-sky-800 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="font-landing text-3xl font-semibold tracking-tight sm:text-4xl">
              Pronto para transformar a gestão da clínica?
            </h2>
            <p className="mt-3 max-w-md text-sky-100">
              Envie seus dados. Nossa equipe entra em contato para demonstração e ativação do seu acesso.
            </p>
            <p className="mt-6 text-sm text-sky-200">
              Já é cliente?{" "}
              <Link to="/login" className="font-medium text-white underline-offset-4 hover:underline">
                Entrar no sistema
              </Link>
            </p>
          </div>

          <form
            onSubmit={handleContactSubmit}
            className="space-y-4 rounded-2xl bg-white p-6 text-slate-900 shadow-xl shadow-sky-950/20"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="landing-name">Nome</Label>
                <Input
                  id="landing-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-email">E-mail</Label>
                <Input
                  id="landing-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="voce@clinica.com.br"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="landing-phone">Telefone / WhatsApp</Label>
                <Input
                  id="landing-phone"
                  required
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(85) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landing-clinic">Clínica</Label>
                <Input
                  id="landing-clinic"
                  value={form.clinic}
                  onChange={(e) => setForm((f) => ({ ...f, clinic: e.target.value }))}
                  placeholder="Nome da clínica"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="landing-message">Mensagem</Label>
              <Textarea
                id="landing-message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Conte rapidamente o que você precisa"
                rows={4}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-sky-700 hover:bg-sky-800">
              {submitting ? "Enviando..." : "Solicitar demonstração"}
            </Button>
            <p className="text-center text-xs text-slate-500">
              Ao enviar, você concorda com nossa{" "}
              <Link to="/privacidade" className="underline underline-offset-2">
                Política de Privacidade
              </Link>
              .
            </p>
          </form>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-[#0b1726] py-10 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-landing text-lg font-semibold text-white">HealthCare</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/login" className="hover:text-white">Entrar</Link>
            <Link to="/privacidade" className="hover:text-white">Privacidade</Link>
            <button type="button" className="hover:text-white" onClick={() => scrollToId("contato")}>
              Contato
            </button>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} HealthCare. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
