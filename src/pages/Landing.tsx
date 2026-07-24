import { FormEvent, useEffect, useMemo, useState } from "react";
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
  KanbanSquare,
  FileText,
  Clock,
  Building2,
  Stethoscope,
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
import { parsePlanFeatures } from "@/lib/planFeatures";
import { FEATURE_LABELS } from "@/components/subscription/RequireFeature";
import {
  FacebookGlyph,
  InstagramGlyph,
  LeadSourceBadge,
  WhatsAppGlyph,
} from "@/components/crm/LeadSourceBadge";

const MODULE_HIGHLIGHTS = [
  {
    id: "agenda",
    icon: Calendar,
    title: "Agenda odontológica",
    text: "Organize o dia por profissional, confirme pacientes e reduza faltas sem planilha.",
    points: [
      "Visão diária e semanal por dentista",
      "Status claro: confirmado, aguardando, concluído",
      "Origem do lead e vendedor no agendamento",
    ],
    image: "/landing/landing-dashboard.png",
    alt: "Prévia da agenda e operação no HealthCare",
    reverse: false,
  },
  {
    id: "pacientes",
    icon: Users,
    title: "Pacientes e prontuário",
    text: "Cadastro completo, odontograma, evoluções e histórico clínico no mesmo lugar.",
    points: [
      "Prontuário digital por paciente",
      "Galeria de exames e arquivos clínicos",
      "Receituário e evoluções no fluxo",
    ],
    image: "/landing/landing-pacientes.png",
    alt: "Tela de pacientes do HealthCare",
    reverse: true,
  },
  {
    id: "financeiro",
    icon: Wallet,
    title: "Caixa e contas a receber",
    text: "Receba no caixa do dia ou lance parcelas futuras — com visão clara do dinheiro da clínica.",
    points: [
      "Caixa diário com entradas e saídas",
      "Contas a receber com vencimentos",
      "Ponte direta da Agenda para o financeiro",
    ],
    image: "/landing/landing-financeiro.png",
    alt: "Tela de caixa e financeiro do HealthCare",
    reverse: false,
  },
  {
    id: "crm",
    icon: KanbanSquare,
    title: "CRM de Vendas",
    text: "Pipeline de leads separado da agenda: contato, follow-up e conversão em paciente.",
    points: [
      "Kanban: Novo → Contato → Agendado → Fechado",
      "Origem com logo Instagram, WhatsApp e Facebook",
      "Um clique para criar paciente e abrir a Agenda",
    ],
    image: null,
    alt: "CRM de vendas HealthCare",
    reverse: true,
    crmPreview: true,
  },
] as const;

const EXTRA_MODULES = [
  { icon: Package, title: "Estoque", text: "Materiais sob controle para não faltar no consultório." },
  { icon: BarChart3, title: "Relatórios", text: "Desempenho da clínica com números claros." },
  { icon: Stethoscope, title: "Procedimentos", text: "Catálogo de procedimentos e valores da clínica." },
  { icon: FileText, title: "Termos e contratos", text: "Documentos e termos no fluxo do atendimento." },
  { icon: Clock, title: "Ponto eletrônico", text: "Registro de ponto da equipe na mesma plataforma." },
  { icon: Building2, title: "Multi-clínica", text: "Várias unidades, cada uma com sua assinatura." },
  { icon: ShieldCheck, title: "Permissões", text: "Perfis e acessos por função — dados isolados por clínica." },
  { icon: Users, title: "Comissões", text: "Regras por vendedor, profissional e origem do lead." },
] as const;

const SCREENS = [
  {
    id: "dashboard",
    title: "Dashboard",
    caption: "Visão geral com receitas e despesas",
    image: "/landing/landing-dashboard.png",
    alt: "Dashboard HealthCare",
  },
  {
    id: "pacientes",
    title: "Pacientes",
    caption: "Lista, busca e prontuário",
    image: "/landing/landing-pacientes.png",
    alt: "Pacientes HealthCare",
  },
  {
    id: "financeiro",
    title: "Caixa",
    caption: "Movimentações do dia",
    image: "/landing/landing-financeiro.png",
    alt: "Caixa HealthCare",
  },
  {
    id: "profissionais",
    title: "Profissionais",
    caption: "Equipe, CRO e especialidades",
    image: "/landing/landing-profissionais.png",
    alt: "Profissionais HealthCare",
  },
  {
    id: "procedimentos",
    title: "Procedimentos",
    caption: "Catálogo e preços",
    image: "/mockups/mockup-procedimentos-precos-lista.png",
    alt: "Procedimentos HealthCare",
  },
] as const;

const FALLBACK_PLANS = [
  {
    id: "fallback-1",
    name: "Plano Essencial",
    listPriceMonthly: 189,
    priceMonthly: 189,
    priceYearly: 1890,
    description: "Agenda, pacientes e caixa para começar organizado.",
    features: ["Agenda", "Pacientes", "Caixa", "Administração"],
    highlight: false,
  },
  {
    id: "fallback-2",
    name: "Plano Profissional",
    listPriceMonthly: 369.99,
    priceMonthly: 369.99,
    priceYearly: 3699,
    description: "Operação completa para clínicas em crescimento.",
    features: ["Agenda e pacientes", "Caixa e contas a receber", "CRM de Vendas", "Profissionais"],
    highlight: true,
  },
  {
    id: "fallback-3",
    name: "Plano Premium",
    listPriceMonthly: 589.9,
    priceMonthly: 589.9,
    priceYearly: 5899,
    description: "Acesso amplo aos módulos da plataforma.",
    features: ["Todos os módulos principais", "Relatórios", "Multi-clínica", "Comissões e estoque"],
    highlight: false,
  },
] as const;

type LandingPlanCard = {
  id: string;
  name: string;
  /** Preço de tabela mensal (antes) */
  listPriceMonthly: number;
  /** Preço mensal vigente (promo ou tabela) */
  priceMonthly: number;
  priceYearly: number | null;
  description: string;
  features: string[];
  highlight: boolean;
};

function formatPlanPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function yearlySavings(monthly: number, yearly: number | null): {
  amount: number;
  percent: number;
  equivalentMonthly: number;
} | null {
  if (!yearly || yearly <= 0 || monthly <= 0) return null;
  const fullYear = monthly * 12;
  if (yearly >= fullYear) return null;
  const amount = fullYear - yearly;
  const percent = Math.round((amount / fullYear) * 100);
  return {
    amount,
    percent: Math.max(percent, 1),
    equivalentMonthly: yearly / 12,
  };
}

function featureLabel(slug: string): string {
  if (FEATURE_LABELS[slug]) return FEATURE_LABELS[slug];
  if (slug === "financeiro_basico" || slug === "financeiro") return "Caixa";
  if (slug === "pacientes_basico" || slug === "pacientes") return "Pacientes";
  if (slug === "multi_clinica") return "Multi-Clínica";
  if (slug === "crm") return "CRM de Vendas";
  return slug.replace(/_/g, " ");
}

const FAQ = [
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. O HealthCare usa autenticação, permissões por perfil e isolamento por clínica (RLS no banco).",
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
  {
    q: "O CRM substitui a Agenda?",
    a: "Não. O CRM cuida do funil de vendas (leads). Quando o lead agenda, você cria o paciente e segue na Agenda normalmente.",
  },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CrmPreviewMock() {
  const columns = [
    {
      title: "Novo",
      leads: [
        { name: "Ana Souza", source: "instagram" as const, interest: "Clareamento" },
        { name: "Bruno Lima", source: "facebook" as const, interest: "Ortodontia" },
      ],
    },
    {
      title: "Em contato",
      leads: [{ name: "Carla Mendes", source: "whatsapp" as const, interest: "Implante" }],
    },
    {
      title: "Agendado",
      leads: [{ name: "Diego Alves", source: "instagram" as const, interest: "Avaliação" }],
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="font-medium text-slate-900">CRM de Vendas</p>
          <p className="text-xs text-slate-500">Pipeline com origem das redes</p>
        </div>
        <div className="flex items-center gap-1.5">
          <InstagramGlyph className="h-4 w-4" gradientId="landing-ig" />
          <WhatsAppGlyph className="h-4 w-4" />
          <FacebookGlyph className="h-4 w-4" />
        </div>
      </div>
      <div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-3">
        {columns.map((col) => (
          <div key={col.title} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {col.title}
            </p>
            <div className="space-y-2">
              {col.leads.map((lead) => (
                <div key={lead.name} className="rounded-lg border border-slate-100 p-2.5">
                  <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{lead.interest}</p>
                  <div className="mt-2">
                    <LeadSourceBadge source={lead.source} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingProductStack() {
  return (
    <div className="landing-fade-up-delay relative mx-auto h-[340px] w-full max-w-xl sm:h-[420px] lg:h-[480px] lg:max-w-none">
      <div
        className="landing-float-slow absolute left-[4%] top-[12%] w-[72%] overflow-hidden rounded-xl border border-white/20 bg-[#0b1726]/50 shadow-2xl shadow-black/40 sm:rounded-2xl"
        style={{ transform: "rotate(-6deg)" }}
      >
        <img
          src="/landing/landing-pacientes.png"
          alt=""
          className="h-auto w-full object-cover object-top opacity-90"
          width={1536}
          height={1024}
        />
      </div>
      <div
        className="landing-float-delayed absolute right-[2%] top-[4%] w-[68%] overflow-hidden rounded-xl border border-white/20 bg-[#0b1726]/50 shadow-2xl shadow-black/40 sm:rounded-2xl"
        style={{ transform: "rotate(5deg)" }}
      >
        <img
          src="/landing/landing-financeiro.png"
          alt=""
          className="h-auto w-full object-cover object-top opacity-90"
          width={1536}
          height={1024}
        />
      </div>
      <div className="landing-float absolute bottom-0 left-[8%] right-[8%] overflow-hidden rounded-xl border border-white/25 bg-[#0b1726]/60 shadow-2xl shadow-black/50 sm:rounded-2xl">
        <img
          src="/landing/landing-dashboard.png"
          alt="Telas do HealthCare: dashboard, pacientes e caixa"
          className="h-auto w-full object-cover object-top"
          width={1536}
          height={1024}
        />
      </div>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState(0);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<LandingPlanCard[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("plans")
          .select(
            "id, name, slug, description, price_monthly, price_yearly, promo_active, promo_price_monthly, features, is_active",
          )
          .eq("is_active", true)
          .order("price_monthly", { ascending: true });

        if (error) throw error;
        if (cancelled) return;

        const mapped: LandingPlanCard[] = (data || []).map((plan, index, arr) => {
          const listPriceMonthly = Number(plan.price_monthly) || 0;
          const priceMonthly =
            plan.promo_active && plan.promo_price_monthly != null
              ? Number(plan.promo_price_monthly)
              : listPriceMonthly;
          const priceYearly =
            plan.price_yearly != null && Number(plan.price_yearly) > 0
              ? Number(plan.price_yearly)
              : null;
          const featureSlugs = parsePlanFeatures(plan.features);
          const featureNames = featureSlugs
            .filter((f) => !["dashboard", "configuracoes", "administracao"].includes(f))
            .map(featureLabel)
            .slice(0, 6);
          const mid = Math.floor((arr.length - 1) / 2);
          return {
            id: plan.id,
            name: plan.name,
            listPriceMonthly,
            priceMonthly,
            priceYearly,
            description: plan.description || "Plano da plataforma HealthCare.",
            features:
              featureNames.length > 0
                ? featureNames
                : ["Módulos conforme o plano contratado"],
            highlight:
              arr.length >= 3
                ? index === mid
                : /profissional|pro/i.test(plan.name) || /profissional|pro/i.test(plan.slug || ""),
          };
        });

        setPlans(mapped);
      } catch (err) {
        console.warn("Landing: não foi possível carregar planos do banco", err);
        if (!cancelled) setPlans([]);
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPlans: LandingPlanCard[] = useMemo(() => {
    if (plans.length > 0) return plans;
    return FALLBACK_PLANS.map((p) => ({
      id: p.id,
      name: p.name,
      listPriceMonthly: p.listPriceMonthly,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      description: p.description,
      features: [...p.features],
      highlight: p.highlight,
    }));
  }, [plans]);

  const bestYearlySaving = useMemo(() => {
    let best: { percent: number; name: string } | null = null;
    for (const plan of displayPlans) {
      const s = yearlySavings(plan.listPriceMonthly || plan.priceMonthly, plan.priceYearly);
      if (!s) continue;
      if (!best || s.percent > best.percent) best = { percent: s.percent, name: plan.name };
    }
    return best;
  }, [displayPlans]);

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

  const navItems = [
    ["modulos", "Módulos"],
    ["telas", "Telas"],
    ["planos", "Planos"],
    ["faq", "FAQ"],
    ["contato", "Contato"],
  ] as const;

  return (
    <div className="landing-root min-h-screen bg-[#eef4f8] text-slate-900">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <a href="#topo" className="flex items-center gap-2.5 text-white">
            <img
              src="/logo-512.png"
              alt="HealthCare"
              className="h-9 w-9 rounded-md object-contain bg-white p-0.5 shadow-md"
            />
            <span className="font-landing text-xl font-semibold tracking-tight">HealthCare</span>
          </a>

          <nav className="hidden items-center gap-7 text-sm text-white/85 md:flex">
            {navItems.map(([id, label]) => (
              <button key={id} type="button" className="hover:text-white" onClick={() => scrollToId(id)}>
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button className="bg-white text-sky-900 hover:bg-white/90" onClick={() => scrollToId("contato")}>
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
              {navItems.map(([id, label]) => (
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

      {/* HERO — brand + headline + CTA + floating screens */}
      <section id="topo" className="relative isolate min-h-[100svh] overflow-hidden text-white">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 500px at 75% 15%, hsl(199 88% 48% / 0.4), transparent 55%), radial-gradient(700px 400px at 10% 80%, hsl(190 60% 35% / 0.25), transparent 50%), linear-gradient(150deg, hsl(215 58% 11%) 0%, hsl(204 68% 22%) 45%, hsl(215 52% 9%) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 60% 40%, black 15%, transparent 70%)",
          }}
        />

        <div className="mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end gap-8 px-4 pb-12 pt-28 sm:px-6 lg:grid lg:grid-cols-[1fr_1.05fr] lg:items-center lg:justify-center lg:gap-10 lg:pb-20 lg:pt-24">
          <div className="landing-fade-up max-w-xl">
            <p className="font-landing text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              HealthCare
            </p>
            <h1 className="mt-4 max-w-lg text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
              O sistema odontológico que organiza agenda, pacientes, caixa e vendas.
            </h1>
            <p className="mt-4 max-w-md text-base text-white/75 sm:text-lg">
              Feito para clínicas: menos planilha, mais tempo no consultório.
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

          <FloatingProductStack />
        </div>
      </section>

      {/* Intro strip */}
      <section className="border-b border-slate-200/70 bg-white py-12 sm:py-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-landing text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Administrar a clínica não precisa ser difícil
          </h2>
          <p className="mt-3 text-slate-600">
            Enquanto outros sistemas complicam, o HealthCare centraliza o essencial: atendimento,
            financeiro, CRM e equipe — com permissões e isolamento por unidade.
          </p>
        </div>
      </section>

      {/* Module deep-dives */}
      <section id="modulos" className="py-4">
        {MODULE_HIGHLIGHTS.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              id={mod.id}
              className={cn(
                "py-16 sm:py-20",
                mod.reverse ? "bg-[#eef4f8]" : "bg-white",
              )}
            >
              <div
                className={cn(
                  "mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2",
                  mod.reverse && "lg:[&>*:first-child]:order-2",
                )}
              >
                <div>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="font-landing text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    {mod.title}
                  </h2>
                  <p className="mt-3 text-slate-600">{mod.text}</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700">
                    {mod.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-8 bg-sky-700 text-white hover:bg-sky-800"
                    onClick={() => scrollToId("contato")}
                  >
                    Quero ver na demo
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                <div className="landing-fade-up-delay-2">
                  {"crmPreview" in mod && mod.crmPreview ? (
                    <CrmPreviewMock />
                  ) : mod.image ? (
                    <div className="landing-float overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10">
                      <img
                        src={mod.image}
                        alt={mod.alt}
                        className="h-auto w-full object-cover object-top"
                        width={1536}
                        height={1024}
                        loading="lazy"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Extra modules grid */}
      <section className="border-y border-slate-200/70 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-landing text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Um conjunto completo para a clínica
            </h2>
            <p className="mt-3 text-slate-600">
              Priorizamos o que importa no dia a dia odontológico — com módulos que você libera por plano
              ou presentear por clínica.
            </p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {EXTRA_MODULES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="group">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screens carousel */}
      <section id="telas" className="bg-[#eef4f8] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <h2 className="font-landing text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Telas reais do sistema
              </h2>
              <p className="mt-3 text-slate-600">
                Veja o produto como a equipe usa: dashboard, pacientes, caixa, profissionais e
                procedimentos — sem dados sensíveis.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-sky-600" /> Operação do dia em um só lugar
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-sky-600" /> Equipe alinhada com permissões
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-sky-600" /> CRM e financeiro conectados à agenda
                </li>
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
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
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
                  <span className="text-xs text-slate-400">prévia</span>
                </div>
                <div className="bg-slate-100">
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

      {/* Plans */}
      <section id="planos" className="border-y border-slate-200/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-landing text-3xl font-semibold tracking-tight sm:text-4xl">
              Planos para o tamanho da sua clínica
            </h2>
            <p className="mt-3 text-slate-600">
              Mensal ou anual — no anual você paga menos no ano e ainda facilita o orçamento da clínica.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  billingPeriod === "monthly"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("yearly")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  billingPeriod === "yearly"
                    ? "bg-sky-700 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                Anual
                {bestYearlySaving && (
                  <span className="ml-1.5 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-900">
                    {bestYearlySaving.percent}% OFF
                  </span>
                )}
              </button>
            </div>
            {bestYearlySaving && billingPeriod === "yearly" && (
              <p className="max-w-lg text-center text-sm text-slate-500">
                No anual o valor em destaque é a mensalidade equivalente — você economiza até{" "}
                <strong className="text-emerald-700">{bestYearlySaving.percent}%</strong> no ano.
              </p>
            )}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plansLoading && plans.length === 0 ? (
              <p className="col-span-full text-center text-sm text-slate-500">Carregando planos...</p>
            ) : (
              displayPlans.map((plan) => {
                const compareMonthly = plan.listPriceMonthly || plan.priceMonthly;
                const savings = yearlySavings(compareMonthly, plan.priceYearly);
                const yearlyMode = billingPeriod === "yearly" && plan.priceYearly != null && savings;
                const promoMonthly =
                  plan.priceMonthly < compareMonthly - 0.009 ? plan.priceMonthly : null;

                // Destaque sempre é R$/mês
                const displayMonthly = yearlyMode ? savings!.equivalentMonthly : plan.priceMonthly;
                const showBeforeAfter = yearlyMode || promoMonthly != null;
                const beforePrice = yearlyMode ? compareMonthly : compareMonthly;

                return (
                  <div
                    key={plan.id}
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

                    <div className="mt-5">
                      {showBeforeAfter && (
                        <p
                          className={cn(
                            "text-sm",
                            plan.highlight ? "text-sky-100/80" : "text-slate-500",
                          )}
                        >
                          De{" "}
                          <span className="line-through">
                            R$ {formatPlanPrice(beforePrice)}
                          </span>{" "}
                          por
                        </p>
                      )}
                      <p className="mt-0.5">
                        <span className="font-landing text-4xl font-semibold tracking-tight">
                          R$ {formatPlanPrice(displayMonthly)}
                        </span>
                        <span
                          className={cn(
                            "ml-1 text-base font-normal",
                            plan.highlight ? "text-sky-100" : "text-slate-500",
                          )}
                        >
                          /mês
                        </span>
                      </p>

                      {yearlyMode ? (
                        <p
                          className={cn(
                            "mt-1.5 text-xs",
                            plan.highlight ? "text-sky-200/80" : "text-slate-400",
                          )}
                        >
                          Total de R$ {formatPlanPrice(plan.priceYearly!)} no ano · cobrado anualmente
                        </p>
                      ) : plan.priceYearly ? (
                        <p
                          className={cn(
                            "mt-1.5 text-xs",
                            plan.highlight ? "text-sky-200/80" : "text-slate-400",
                          )}
                        >
                          ou R$ {formatPlanPrice(plan.priceYearly)}/ano
                          {savings ? ` (${savings.percent}% off)` : ""}
                        </p>
                      ) : null}

                      {yearlyMode && savings && (
                        <p
                          className={cn(
                            "mt-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            plan.highlight
                              ? "bg-white/15 text-amber-100"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {savings.percent}% OFF no anual
                        </p>
                      )}

                      {billingPeriod === "yearly" && !plan.priceYearly && (
                        <p className={cn("mt-2 text-xs", plan.highlight ? "text-sky-100" : "text-slate-500")}>
                          Preço anual sob consulta na demonstração
                        </p>
                      )}
                    </div>

                    <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              plan.highlight ? "text-amber-300" : "text-sky-600",
                            )}
                          />
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
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#eef4f8] py-16 sm:py-20">
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

      {/* Contact */}
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
            <img
              src="/logo-512.png"
              alt="HealthCare"
              className="h-8 w-8 rounded-md object-contain bg-white p-0.5"
            />
            <span className="font-landing text-lg font-semibold text-white">HealthCare</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/login" className="hover:text-white">
              Entrar
            </Link>
            <Link to="/privacidade" className="hover:text-white">
              Privacidade
            </Link>
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
