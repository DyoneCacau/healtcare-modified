export type ChatChannelType = 'whatsapp' | 'instagram' | 'messenger' | 'webchat';
export type ChatChannelStatus = 'pending' | 'active' | 'disconnected' | 'error';
export type ConversationStatus = 'open' | 'pending' | 'waiting_human' | 'closed';
export type MessageDirection = 'inbound' | 'outbound' | 'system';
export type MessageStatus = 'received' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatChannel {
  id: string;
  clinic_id: string;
  channel_type: ChatChannelType;
  display_name: string;
  phone_number: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  status: ChatChannelStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  has_token?: boolean;
}

export interface ChatFlow {
  id: string;
  clinic_id: string;
  channel_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  trigger_type: 'incoming' | 'keyword' | 'manual';
  definition: ChatFlowDefinition;
  created_at: string;
  updated_at: string;
}

export interface ChatFlowDefinition {
  version: number;
  nodes: ChatFlowNode[];
  edges: ChatFlowEdge[];
}

export interface ChatFlowNode {
  id: string;
  type: 'message' | 'menu' | 'handoff' | 'condition';
  text?: string;
  options?: { id: string; label: string; next_node_id?: string }[];
  next_node_id?: string;
}

export interface ChatFlowEdge {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

export interface ChatConversation {
  id: string;
  clinic_id: string;
  channel_id: string;
  patient_id: string | null;
  flow_id: string | null;
  external_contact_id: string;
  contact_name: string | null;
  contact_phone: string;
  status: ConversationStatus;
  assigned_to: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  channel?: Pick<ChatChannel, 'display_name' | 'channel_type'>;
  assigned_profile?: { name: string | null } | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  clinic_id: string;
  direction: MessageDirection;
  body: string;
  message_type: string;
  external_id: string | null;
  status: MessageStatus;
  sent_by: string | null;
  error_message: string | null;
  created_at: string;
  sender_name?: string | null;
}

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Aberta',
  pending: 'Pendente',
  waiting_human: 'Aguardando atendente',
  closed: 'Encerrada',
};

export const DEFAULT_WELCOME_FLOW: ChatFlowDefinition = {
  version: 1,
  nodes: [
    {
      id: 'welcome',
      type: 'message',
      text: 'Olá! Bem-vindo(a) à nossa clínica. Como posso ajudar?',
    },
    {
      id: 'menu',
      type: 'menu',
      text: 'Escolha uma opção:',
      options: [
        { id: 'opt_agendar', label: 'Agendar consulta', next_node_id: 'handoff' },
        { id: 'opt_info', label: 'Informações', next_node_id: 'handoff' },
        { id: 'opt_atendente', label: 'Falar com atendente', next_node_id: 'handoff' },
      ],
    },
    {
      id: 'handoff',
      type: 'handoff',
      text: 'Um momento, vou transferir você para nossa equipe.',
    },
  ],
  edges: [
    { id: 'e1', from: 'welcome', to: 'menu' },
  ],
};
