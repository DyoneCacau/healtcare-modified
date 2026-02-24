import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
            <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-sm">
          <section>
            <h2 className="text-lg font-semibold">1. Introdução</h2>
            <p>
              O HealthCare está comprometido com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Esta política descreve como coletamos, usamos e protegemos suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Dados que Coletamos</h2>
            <p>Coletamos os seguintes tipos de dados:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados cadastrais:</strong> nome, e-mail, telefone, CPF/CNPJ</li>
              <li><strong>Dados da clínica:</strong> razão social, endereço, dados de profissionais e pacientes</li>
              <li><strong>Dados de uso:</strong> registros de acesso, ações no sistema (auditoria)</li>
              <li><strong>Dados de pagamento:</strong> processados pelo Mercado Pago (não armazenamos dados sensíveis de cartão)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Finalidade do Tratamento</h2>
            <p>Utilizamos os dados para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Prestação do serviço de gestão clínica</li>
              <li>Autenticação e controle de acesso</li>
              <li>Comunicação sobre o serviço e suporte</li>
              <li>Cumprimento de obrigações legais</li>
              <li>Melhoria contínua do sistema</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Base Legal</h2>
            <p>
              O tratamento é realizado com base em: execução de contrato, legítimo interesse, cumprimento de obrigação legal e, quando aplicável, consentimento do titular.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Compartilhamento</h2>
            <p>
              Os dados podem ser compartilhados com: prestadores de infraestrutura (Supabase, hospedagem), processadores de pagamento (Mercado Pago) e autoridades quando exigido por lei. Não vendemos dados a terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Seus Direitos (LGPD)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento</li>
              <li>Acessar seus dados</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Anonimizar, bloquear ou eliminar dados desnecessários</li>
              <li>Revogar o consentimento</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelo e-mail ou canal de suporte informado no sistema.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo criptografia, controle de acesso e auditoria de ações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Contato</h2>
            <p>
              Dúvidas sobre esta política: entre em contato pelo formulário na tela de login ou pelo e-mail de suporte configurado para sua clínica.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
