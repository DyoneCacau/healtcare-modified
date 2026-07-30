import type { SmartHubButtonType, SmartHubClickAction } from '@/types/smartHub';
import { getRecommendedAction, isActionCompatible } from './buttonTypeActionMap';

/**
 * Intenção amigável do editor de botões.
 * Os valores internos (type / click_action) permanecem os contratos atuais.
 */
export type ButtonIntentId =
  | 'capture_form'
  | 'whatsapp'
  | 'appointment'
  | 'procedure'
  | 'social'
  | 'website'
  | 'phone'
  | 'email'
  | 'info'
  | 'advanced';

export type SocialNetworkId = 'instagram' | 'facebook' | 'tiktok' | 'youtube';

/** Como o visitante entra em contato (agendamento / procedimento). */
export type ContactMethodId = 'form' | 'whatsapp' | 'link';

export interface ButtonIntentOption {
  id: ButtonIntentId;
  label: string;
  description: string;
  /** Exige módulo CRM para aparecer como opção principal. */
  requiresCrm?: boolean;
}

export const BUTTON_INTENT_OPTIONS: ButtonIntentOption[] = [
  {
    id: 'capture_form',
    label: 'Captar contato pelo formulário',
    description: 'Solicita nome e WhatsApp e registra o contato no CRM.',
    requiresCrm: true,
  },
  {
    id: 'whatsapp',
    label: 'Abrir WhatsApp',
    description: 'Inicia uma conversa diretamente com a clínica.',
  },
  {
    id: 'appointment',
    label: 'Agendar consulta ou avaliação',
    description: 'Direciona o visitante para solicitar ou realizar um agendamento.',
  },
  {
    id: 'procedure',
    label: 'Mostrar um procedimento ou serviço',
    description:
      'Apresenta um tratamento e permite definir como o visitante entrará em contato.',
  },
  {
    id: 'social',
    label: 'Abrir uma rede social',
    description: 'Direciona para o perfil ou conteúdo da clínica em uma rede social.',
  },
  {
    id: 'website',
    label: 'Abrir site ou link externo',
    description: 'Abre outra página da internet.',
  },
  {
    id: 'phone',
    label: 'Ligar para a clínica',
    description: 'Inicia uma ligação no celular do visitante.',
  },
  {
    id: 'email',
    label: 'Enviar e-mail',
    description: 'Abre o aplicativo de e-mail do visitante.',
  },
  {
    id: 'info',
    label: 'Mostrar informações',
    description: 'Exibe orientações, avisos ou detalhes sem captar um contato.',
  },
];

export const SOCIAL_NETWORK_OPTIONS: {
  id: SocialNetworkId;
  label: string;
  type: SmartHubButtonType;
}[] = [
  { id: 'instagram', label: 'Instagram', type: 'instagram' },
  { id: 'facebook', label: 'Facebook', type: 'facebook' },
  { id: 'tiktok', label: 'TikTok', type: 'tiktok' },
  { id: 'youtube', label: 'YouTube', type: 'youtube' },
];

export const CONTACT_METHOD_OPTIONS: {
  id: ContactMethodId;
  label: string;
  description: string;
  requiresCrm?: boolean;
}[] = [
  {
    id: 'form',
    label: 'Formulário interno',
    description: 'O visitante preenche o formulário e o contato entra no CRM.',
    requiresCrm: true,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Abre a conversa no WhatsApp.',
  },
  {
    id: 'link',
    label: 'Link externo',
    description: 'Abre uma página ou sistema de agendamento externo.',
  },
];

export interface IntentApplyResult {
  type: SmartHubButtonType;
  click_action: SmartHubClickAction;
}

export interface InferredIntent {
  intent: ButtonIntentId;
  socialNetwork: SocialNetworkId | null;
  contactMethod: ContactMethodId | null;
  /** true quando type/ação não cabem nas opções amigáveis (map, video, etc.). */
  needsAdvanced: boolean;
}

const SOCIAL_TYPES = new Set<SmartHubButtonType>([
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'social',
]);

function asContactMethod(action: SmartHubClickAction, hasCrm: boolean): ContactMethodId {
  if (action === 'form' && hasCrm) return 'form';
  if (action === 'whatsapp') return 'whatsapp';
  if (action === 'link') return 'link';
  if (action === 'form' && !hasCrm) return 'whatsapp';
  return hasCrm ? 'form' : 'link';
}

/** Aplica a intenção amigável aos valores internos preservados pelo contrato. */
export function applyButtonIntent(
  intent: ButtonIntentId,
  opts?: {
    socialNetwork?: SocialNetworkId | null;
    contactMethod?: ContactMethodId | null;
    hasCrm?: boolean;
  }
): IntentApplyResult {
  const hasCrm = opts?.hasCrm !== false;
  const network = opts?.socialNetwork || 'instagram';
  const method = opts?.contactMethod || (hasCrm ? 'form' : 'link');

  switch (intent) {
    case 'capture_form':
      return { type: 'form', click_action: hasCrm ? 'form' : 'whatsapp' };
    case 'whatsapp':
      return { type: 'whatsapp', click_action: 'whatsapp' };
    case 'appointment': {
      const action: SmartHubClickAction =
        method === 'form' && hasCrm ? 'form' : method === 'whatsapp' ? 'whatsapp' : 'link';
      return { type: 'appointment', click_action: action };
    }
    case 'procedure': {
      const action: SmartHubClickAction =
        method === 'form' && hasCrm ? 'form' : method === 'whatsapp' ? 'whatsapp' : 'link';
      return { type: 'procedure', click_action: action };
    }
    case 'social': {
      const social = SOCIAL_NETWORK_OPTIONS.find((s) => s.id === network);
      return { type: social?.type || 'instagram', click_action: 'link' };
    }
    case 'website':
      return { type: 'site', click_action: 'link' };
    case 'phone':
      return { type: 'phone', click_action: 'phone' };
    case 'email':
      return { type: 'email', click_action: 'email' };
    case 'info':
      return { type: 'info', click_action: 'info' };
    case 'advanced':
    default:
      return { type: 'link', click_action: 'link' };
  }
}

/**
 * Interpreta type + click_action salvos e escolhe a opção amigável correspondente.
 * Não altera dados: só deriva o estado do editor.
 */
export function inferButtonIntent(
  type: SmartHubButtonType,
  clickAction: SmartHubClickAction,
  opts?: { hasCrm?: boolean }
): InferredIntent {
  const hasCrm = opts?.hasCrm !== false;
  const action =
    clickAction === 'auto' ? getRecommendedAction(type) : clickAction;

  if (type === 'form') {
    return {
      intent: 'capture_form',
      socialNetwork: null,
      contactMethod: null,
      needsAdvanced: action !== 'form' && action !== 'auto' && action !== 'whatsapp' && action !== 'link',
    };
  }

  if (type === 'whatsapp') {
    return {
      intent: 'whatsapp',
      socialNetwork: null,
      contactMethod: null,
      needsAdvanced: action !== 'whatsapp' && action !== 'auto',
    };
  }

  if (type === 'appointment') {
    return {
      intent: 'appointment',
      socialNetwork: null,
      contactMethod: asContactMethod(action, hasCrm),
      needsAdvanced: !['form', 'whatsapp', 'link', 'auto'].includes(action),
    };
  }

  if (type === 'procedure') {
    return {
      intent: 'procedure',
      socialNetwork: null,
      contactMethod: asContactMethod(action, hasCrm),
      needsAdvanced: !['form', 'whatsapp', 'link', 'info', 'auto'].includes(action),
    };
  }

  if (SOCIAL_TYPES.has(type)) {
    const network: SocialNetworkId | null =
      type === 'instagram' || type === 'facebook' || type === 'tiktok' || type === 'youtube'
        ? type
        : 'instagram';
    return {
      intent: 'social',
      socialNetwork: network,
      contactMethod: null,
      needsAdvanced: action !== 'link' && action !== 'auto',
    };
  }

  if (type === 'site' || type === 'link') {
    return {
      intent: 'website',
      socialNetwork: null,
      contactMethod: null,
      needsAdvanced: action !== 'link' && action !== 'auto',
    };
  }

  if (type === 'phone') {
    return {
      intent: 'phone',
      socialNetwork: null,
      contactMethod: null,
      needsAdvanced: action !== 'phone' && action !== 'auto',
    };
  }

  if (type === 'email') {
    return {
      intent: 'email',
      socialNetwork: null,
      contactMethod: null,
      needsAdvanced: action !== 'email' && action !== 'auto',
    };
  }

  if (type === 'info') {
    return {
      intent: 'info',
      socialNetwork: null,
      contactMethod: null,
      needsAdvanced: action !== 'info' && action !== 'auto' && action !== 'link',
    };
  }

  // map, video, internal e combinações incomuns → avançado
  return {
    intent: 'advanced',
    socialNetwork: null,
    contactMethod: null,
    needsAdvanced: true,
  };
}

export function listVisibleIntents(hasCrm: boolean): ButtonIntentOption[] {
  return BUTTON_INTENT_OPTIONS.filter((opt) => !opt.requiresCrm || hasCrm);
}

export function listContactMethods(hasCrm: boolean) {
  return CONTACT_METHOD_OPTIONS.filter((opt) => !opt.requiresCrm || hasCrm);
}

/** Texto da prévia: “Este botão irá: …” */
export function previewIntentHeadline(opts: {
  intent: ButtonIntentId;
  socialNetwork?: SocialNetworkId | null;
  type?: SmartHubButtonType;
}): string {
  if (opts.intent === 'social') {
    const network =
      SOCIAL_NETWORK_OPTIONS.find((s) => s.id === opts.socialNetwork)?.label ||
      (opts.type && SOCIAL_TYPES.has(opts.type)
        ? SOCIAL_NETWORK_OPTIONS.find((s) => s.type === opts.type)?.label
        : null) ||
      'rede social';
    return `Abrir o ${network} da clínica`;
  }

  if (opts.intent === 'advanced') {
    return 'Configuração personalizada';
  }

  const option = BUTTON_INTENT_OPTIONS.find((o) => o.id === opts.intent);
  return option?.label || 'Continuar no hub';
}

export function intentOptionById(id: ButtonIntentId): ButtonIntentOption | undefined {
  return BUTTON_INTENT_OPTIONS.find((o) => o.id === id);
}

/** Se a combinação type/ação ainda é coerente com a intenção. */
export function intentMatchesTypeAction(
  intent: ButtonIntentId,
  type: SmartHubButtonType,
  action: SmartHubClickAction,
  socialNetwork?: SocialNetworkId | null
): boolean {
  if (intent === 'advanced') return true;
  const applied = applyButtonIntent(intent, {
    socialNetwork,
    contactMethod:
      action === 'form' || action === 'whatsapp' || action === 'link'
        ? action
        : null,
  });
  if (intent === 'appointment' || intent === 'procedure') {
    return type === applied.type && isActionCompatible(type, action);
  }
  if (intent === 'social') {
    return SOCIAL_TYPES.has(type);
  }
  if (intent === 'website') {
    return type === 'site' || type === 'link';
  }
  return type === applied.type;
}
