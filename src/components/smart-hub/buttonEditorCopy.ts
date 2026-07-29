import type { SmartHubClickAction, SmartHubButtonVisualVariant } from '@/types/smartHub';

export const BUTTON_FIELD_HELP = {
  title: 'Nome que aparece no botão da página pública.',
  subtitle: 'Texto de apoio opcional, abaixo do título.',
  type: 'Define a categoria do botão, como agendamento, contato ou link.',
  click_action: 'Escolha o que acontece quando o visitante tocar neste botão.',
  capture_interest: 'Ajuda a identificar no CRM o assunto ou interesse do lead.',
  capture_stage: 'É a etapa do CRM onde o lead entrará após preencher o formulário.',
  capture_owner: 'Define quem receberá esse lead no CRM.',
  capture_redirect_wa:
    'Depois de enviar o formulário, o visitante será direcionado ao WhatsApp da clínica.',
  url: 'Informe o endereço que será aberto, como site, mapa, link externo ou WhatsApp.',
  whatsapp_message: 'Mensagem que já aparece pronta quando a conversa do WhatsApp abre.',
  visual_variant: 'Escolha como este botão aparecerá na página pública.',
  icon: 'Nome do ícone opcional para reforçar a ação do botão.',
  image: 'Imagem exibida no card. Ideal para procedimentos e campanhas.',
  image_alt: 'Descrição da imagem para acessibilidade e busca.',
  background_color: 'Cor de fundo do botão na página pública.',
  text_color: 'Cor do texto do botão. Prefira contraste bom para leitura.',
  visible: 'Se desativado, o botão não aparece na página pública.',
  track_click: 'Registra quantas pessoas clicaram neste botão.',
  order_index: 'Ordem de aparição na página (números menores aparecem primeiro).',
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

export function previewActionHint(action: SmartHubClickAction): string {
  switch (action) {
    case 'form':
      return 'Ao clicar, o visitante abrirá um formulário de contato.';
    case 'whatsapp':
      return 'Ao clicar, o visitante abrirá o WhatsApp.';
    case 'link':
      return 'Ao clicar, o visitante será levado para outro link.';
    case 'phone':
      return 'Ao clicar, o visitante poderá iniciar uma ligação.';
    case 'email':
      return 'Ao clicar, o visitante abrirá o e-mail.';
    case 'map':
      return 'Ao clicar, o visitante verá a localização no mapa.';
    case 'info':
      return 'Ao clicar, apenas a informação é exibida (sem sair da página).';
    default:
      return 'O comportamento segue o tipo escolhido para este botão.';
  }
}
