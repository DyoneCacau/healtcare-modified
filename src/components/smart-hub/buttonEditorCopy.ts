import type { SmartHubClickAction, SmartHubButtonVisualVariant } from '@/types/smartHub';

export const BUTTON_FIELD_HELP = {
  title: 'Nome que aparece no botão da página pública.',
  subtitle: 'Texto de apoio opcional, abaixo do título.',
  info_content: 'Texto explicativo mostrado ao visitante sem sair da página.',
  type: 'Define o que este botão representa, como WhatsApp, Instagram, agendamento, procedimentos ou informação.',
  type_tooltip:
    'O tipo define a finalidade visual do botão e ajuda o sistema a sugerir ícone, ação e campos adequados.',
  type_internal: 'Abre uma página ou seção dentro do próprio Smart Hub.',
  click_action: 'Escolha o que acontece quando o visitante tocar neste botão.',
  action_suggested: 'Ação sugerida com base no tipo selecionado.',
  action_custom: 'Permite escolher qualquer ação, mesmo fora das recomendações do tipo.',
  capture_interest: 'Ajuda a identificar no CRM o assunto ou interesse do lead.',
  capture_stage: 'Etapa do funil em que o lead entra após o formulário.',
  capture_owner: 'Pessoa da clínica que receberá este lead.',
  capture_redirect_wa: 'Após o envio, o visitante pode ser enviado ao WhatsApp.',
  capture_wa_phone: 'Número usado no redirecionamento após o formulário.',
  capture_wa_message: 'Mensagem pronta na conversa do WhatsApp após o envio.',
  url: 'Endereço que será aberto (site, mapa, link externo…).',
  phone: 'Número com DDD (ex.: 5511999999999).',
  email: 'Endereço de e-mail que será aberto no aplicativo do visitante.',
  email_subject: 'Assunto sugerido no e-mail (opcional).',
  map_url: 'Link do Google Maps ou endereço da clínica.',
  whatsapp_message: 'Mensagem que já aparece pronta quando o WhatsApp abre.',
  open_in_new_tab: 'Se ativo, o destino abre em outra aba do navegador.',
  visual_variant: 'Escolha como este botão aparecerá na página pública.',
  icon: 'Nome do ícone opcional para reforçar a ação do botão.',
  image: 'Imagem exibida no card. Ideal para procedimentos e campanhas.',
  image_alt: 'Descrição da imagem para acessibilidade.',
  background_color: 'Cor de fundo do botão na página pública.',
  text_color: 'Cor do texto do botão.',
  visible: 'Se desativado, o botão não aparece na página pública.',
  track_click: 'Registra quantas pessoas clicaram neste botão.',
  order_index: 'Ordem na página (números menores aparecem primeiro).',
} as const;

export const CLICK_ACTION_HELP: Record<
  SmartHubClickAction,
  { description: string; badge?: string }
> = {
  auto: {
    description: 'Usa o comportamento padrão conforme o tipo escolhido.',
  },
  form: {
    description:
      'Abre um formulário para o visitante preencher os dados. O lead pode entrar no CRM automaticamente.',
    badge: 'Recomendado para gerar leads no CRM',
  },
  whatsapp: {
    description: 'Leva o visitante direto para a conversa no WhatsApp.',
    badge: 'Ideal para atendimento rápido',
  },
  link: {
    description: 'Abre outro site, página ou landing page.',
  },
  phone: {
    description: 'Inicia uma chamada telefônica para o número informado.',
  },
  email: {
    description: 'Abre o aplicativo de e-mail do visitante.',
  },
  map: {
    description: 'Abre o endereço da clínica no mapa.',
  },
  info: {
    description: 'Mostra uma informação ao visitante sem sair da página.',
  },
};

export const VARIANT_HELP: Record<
  SmartHubButtonVisualVariant,
  { description: string; badge?: string }
> = {
  simple: {
    description: 'Formato tradicional, ideal para ações diretas.',
    badge: 'Mais usado',
  },
  icon_card: {
    description: 'Formato visual com ícone, ótimo para destacar serviços.',
  },
  image_card: {
    description: 'Exibe imagem e texto, ideal para procedimentos ou campanhas.',
  },
  horizontal_card: {
    description: 'Formato em faixa horizontal.',
  },
  featured_card: {
    description: 'Mais chamativo, ideal para ação principal.',
    badge: 'Bom para CTA principal',
  },
  list_item: {
    description: 'Formato compacto para múltiplas opções.',
  },
  grid: {
    description: 'Organiza vários botões em formato de grade.',
  },
};

export function previewBehaviorTitle(): string {
  return 'O que acontecerá ao clicar';
}

/** Texto único da prévia lateral (não repetir no formulário). */
export function previewBehaviorDescription(
  action: SmartHubClickAction,
  opts?: { redirectWhatsapp?: boolean }
): string {
  switch (action) {
    case 'form':
      return opts?.redirectWhatsapp
        ? 'O lead será salvo no CRM e, depois, o WhatsApp será aberto.'
        : 'O visitante preencherá seus dados e o lead será enviado para o CRM.';
    case 'whatsapp':
      return 'O visitante irá diretamente para o WhatsApp. Nenhum lead será criado automaticamente.';
    case 'link':
      return 'O visitante será levado para outro site.';
    case 'phone':
      return 'O visitante poderá iniciar uma ligação para o número informado.';
    case 'email':
      return 'O aplicativo de e-mail do visitante será aberto.';
    case 'map':
      return 'O mapa ou endereço da clínica será aberto.';
    case 'info':
      return 'A informação será exibida na própria página, sem redirecionar.';
    default:
      return 'O comportamento segue o tipo escolhido para este botão.';
  }
}

export function formFlowSteps(redirectWhatsapp: boolean): string[] {
  const steps = [
    'O visitante preenche o formulário',
    'O lead entra no CRM',
  ];
  if (redirectWhatsapp) {
    steps.push('O visitante é direcionado ao WhatsApp');
  }
  return steps;
}
