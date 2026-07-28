import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const LAST_UPDATED = "28 de julho de 2026";
const CONTACT_EMAIL = "privacidade@healthcare.app.br";

const SECTIONS = [
  { id: "introducao", label: "1. Introdução" },
  { id: "dados", label: "2. Quais dados coletamos" },
  { id: "uso", label: "3. Como utilizamos os dados" },
  { id: "compartilhamento", label: "4. Compartilhamento de informações" },
  { id: "seguranca", label: "5. Armazenamento e segurança" },
  { id: "cookies", label: "6. Cookies" },
  { id: "direitos", label: "7. Direitos do titular (LGPD)" },
  { id: "retencao", label: "8. Retenção dos dados" },
  { id: "contato", label: "9. Contato para assuntos de privacidade" },
  { id: "alteracoes", label: "10. Alterações nesta política" },
] as const;

export default function Privacy() {
  return (
    <div className="landing-root min-h-screen bg-[#eef4f8] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo-512.png"
              alt="HealthCare"
              className="h-8 w-8 rounded-md object-contain"
            />
            <span className="font-landing text-xl font-semibold tracking-tight">HealthCare</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Início
              </Link>
            </Button>
            <Button size="sm" className="bg-[#2563EB] hover:bg-[#1d4ed8]" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-[#0b1726] via-[#0f2a44] to-[#1e3a5f] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.45), transparent 45%), radial-gradient(circle at 80% 60%, rgba(56,189,248,0.2), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <Shield className="h-6 w-6 text-sky-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-sky-200/90">Legal · LGPD</p>
              <h1 className="font-landing mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                Política de Privacidade
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Última atualização: {LAST_UPDATED}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:py-14">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nesta página
            </p>
            <ul className="space-y-1.5 text-sm">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-md px-2 py-1.5 text-slate-600 transition hover:bg-slate-50 hover:text-[#2563EB]"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="space-y-10 text-[15px] leading-relaxed text-slate-700">
            <section id="introducao" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">1. Introdução</h2>
              <p>
                O <strong>HealthCare</strong> é uma plataforma SaaS (Software as a Service) voltada
                à gestão de clínicas de saúde e odontologia. Esta Política de Privacidade descreve
                como coletamos, utilizamos, armazenamos e protegemos dados pessoais no âmbito da
                plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº
                13.709/2018) e demais normas aplicáveis.
              </p>
              <p>
                Ao utilizar o HealthCare — seja como administrador de clínica, profissional,
                recepção ou visitante do site — você declara estar ciente destas práticas. Quando
                a clínica atua como controladora dos dados de pacientes, o HealthCare processa
                essas informações na qualidade de operador, conforme o contrato de prestação de
                serviços e as instruções do cliente.
              </p>
            </section>

            <Separator />

            <section id="dados" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                2. Quais dados coletamos
              </h2>
              <p>Podemos coletar dados pessoais por meio de:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Cadastro de usuários:</strong> nome, e-mail, telefone, perfil de acesso e
                  dados necessários à autenticação na plataforma.
                </li>
                <li>
                  <strong>Cadastro de pacientes:</strong> dados cadastrais e clínicos inseridos
                  pela clínica (como identificação, contato, histórico e informações de
                  atendimento), conforme o uso do sistema.
                </li>
                <li>
                  <strong>Formulários do site:</strong> nome, e-mail, telefone, clínica e mensagem
                  enviados em páginas públicas (por exemplo, contato comercial).
                </li>
                <li>
                  <strong>Facebook Lead Ads e Instagram Lead Ads:</strong> dados preenchidos em
                  formulários instantâneos de anúncios, quando a clínica ativa a captura de leads
                  via integrações Meta.
                </li>
                <li>
                  <strong>WhatsApp Business:</strong> dados de contato e conteúdo de mensagens
                  necessários ao atendimento, quando a integração estiver habilitada.
                </li>
                <li>
                  <strong>APIs de integração:</strong> payloads enviados por webhooks, automações
                  (n8n, Make, Zapier etc.) e APIs autorizadas pela clínica.
                </li>
                <li>
                  <strong>Cookies e navegação:</strong> identificadores técnicos, preferências e
                  dados de uso do site e da aplicação (ver seção Cookies).
                </li>
              </ul>
              <p>
                Também podemos registrar logs de acesso, auditoria de ações no sistema e dados de
                faturamento/assinatura da unidade, processados por prestadores de pagamento
                contratados (por exemplo, Asaas), sem armazenamento de dados sensíveis completos
                de cartão no HealthCare.
              </p>
            </section>

            <Separator />

            <section id="uso" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                3. Como utilizamos os dados
              </h2>
              <p>
                Os dados são utilizados <strong>exclusivamente</strong> para a prestação dos
                serviços da plataforma, comunicação com clientes, agendamentos e melhorias do
                sistema, incluindo:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Operação da agenda, prontuário, financeiro, CRM e demais módulos contratados;</li>
                <li>Autenticação, controle de acesso e segurança da conta;</li>
                <li>Comunicação operacional e suporte ao cliente;</li>
                <li>Processamento de leads e contatos originados de anúncios e canais conectados;</li>
                <li>Cumprimento de obrigações legais e contratuais;</li>
                <li>Análise agregada e aprimoramento técnico do produto, sem venda de dados pessoais.</li>
              </ul>
            </section>

            <Separator />

            <section id="compartilhamento" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                4. Compartilhamento de informações
              </h2>
              <p>
                Não vendemos dados pessoais. O compartilhamento ocorre apenas quando necessário
                para a operação do serviço ou por obrigação legal, por exemplo com:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Prestadores de infraestrutura e autenticação (como Supabase e hospedagem do
                  frontend);
                </li>
                <li>Processadores de pagamento da assinatura da plataforma;</li>
                <li>
                  Meta Platforms (Facebook/Instagram) e WhatsApp, nos limites das integrações
                  autorizadas pela clínica;
                </li>
                <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
              </ul>
              <p>
                Cada clínica é responsável pelo tratamento dos dados de seus pacientes e leads no
                uso diário do sistema, inclusive pelo compartilhamento interno entre usuários
                autorizados da própria organização.
              </p>
            </section>

            <Separator />

            <section id="seguranca" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                5. Armazenamento e segurança
              </h2>
              <p>
                Adotamos medidas técnicas e organizacionais adequadas ao risco, incluindo controle
                de acesso por perfil, isolamento multi-clínica, uso de conexões criptografadas
                (HTTPS), armazenamento de segredos fora do frontend e registros de auditoria quando
                aplicável.
              </p>
              <p>
                Tokens e credenciais de integrações sensíveis são tratados no servidor (por exemplo,
                Edge Functions com privilégios restritos) e não são expostos ao navegador. Apesar
                dos esforços, nenhum sistema é 100% isento de risco; recomendamos senhas fortes e
                boas práticas de acesso por parte dos usuários da clínica.
              </p>
            </section>

            <Separator />

            <section id="cookies" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">6. Cookies</h2>
              <p>
                Utilizamos cookies e tecnologias similares essenciais ao funcionamento do site e da
                aplicação (sessão, autenticação e preferências). Cookies analíticos ou de marketing
                de terceiros, quando empregados, observam as configurações disponíveis no
                navegador e a legislação aplicável.
              </p>
              <p>
                Você pode gerenciar cookies nas configurações do seu navegador. A desativação de
                cookies essenciais pode impedir o uso adequado da plataforma.
              </p>
            </section>

            <Separator />

            <section id="direitos" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                7. Direitos do titular (LGPD)
              </h2>
              <p>Nos termos da LGPD, o titular pode solicitar:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Confirmação da existência de tratamento;</li>
                <li>Acesso aos dados;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
                <li>Portabilidade, quando aplicável;</li>
                <li>Informação sobre compartilhamentos;</li>
                <li>Revogação do consentimento, quando essa for a base legal utilizada.</li>
              </ul>
              <p>
                Pedidos relativos a dados de pacientes tratados pela clínica devem, em regra, ser
                direcionados à própria clínica (controladora). Pedidos sobre a conta HealthCare ou
                o site institucional podem ser enviados pelo canal da seção Contato.
              </p>
            </section>

            <Separator />

            <section id="retencao" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                8. Retenção dos dados
              </h2>
              <p>
                Mantemos os dados pelo tempo necessário à prestação do serviço, ao cumprimento de
                obrigações legais e regulatórias (incluindo prazos típicos da área da saúde, quando
                aplicáveis à clínica) e à defesa de direitos em processos administrativos ou
                judiciais.
              </p>
              <p>
                Após o encerramento da conta ou a solicitação legítima de exclusão, os dados podem
                ser eliminados ou anonimizados, ressalvadas hipóteses legais de retenção.
              </p>
            </section>

            <Separator />

            <section id="contato" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                9. Contato para assuntos de privacidade
              </h2>
              <p>
                Para dúvidas, solicitações ou exercício de direitos relacionados a esta política,
                entre em contato:
              </p>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-[#eef4f8] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB]/10">
                  <Mail className="h-5 w-5 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Privacidade HealthCare</p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-sm text-[#2563EB] hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Também é possível utilizar o formulário de contato em{" "}
                <Link to="/#contato" className="text-[#2563EB] hover:underline">
                  healthcare.app.br
                </Link>
                .
              </p>
            </section>

            <Separator />

            <section id="alteracoes" className="scroll-mt-24 space-y-3">
              <h2 className="font-landing text-xl font-semibold text-slate-900">
                10. Alterações nesta política
              </h2>
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente para refletir
                mudanças legais, técnicas ou operacionais. A data da última atualização será
                indicada no topo desta página. Recomendamos a revisão periódica deste documento.
                Alterações relevantes poderão ser comunicadas pelos canais oficiais da plataforma,
                quando apropriado.
              </p>
            </section>
          </div>
        </article>
      </main>

      <footer className="border-t border-slate-800 bg-[#0b1726] py-10 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-512.png"
              alt="HealthCare"
              className="h-8 w-8 rounded-md bg-white object-contain p-0.5"
            />
            <span className="font-landing text-lg font-semibold text-white">HealthCare</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/" className="hover:text-white">
              Início
            </Link>
            <Link to="/login" className="hover:text-white">
              Entrar
            </Link>
            <Link to="/privacy" className="hover:text-white">
              Privacidade
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} HealthCare. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
