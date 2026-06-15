import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from './useClinic';
import { useAuth } from './useAuth';
import type {
  ChatChannel,
  ChatConversation,
  ChatFlow,
  ChatMessage,
  ChatFlowDefinition,
  ConversationStatus,
} from '@/types/atendimento';
import { DEFAULT_WELCOME_FLOW } from '@/types/atendimento';
import { toast } from 'sonner';

export function useChatChannels() {
  const { clinicId } = useClinic();

  return useQuery({
    queryKey: ['chat-channels', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('chat_channels')
        .select('id, clinic_id, channel_type, display_name, phone_number, waba_id, phone_number_id, status, metadata, created_at, updated_at, access_token')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        ...row,
        access_token: undefined,
        has_token: !!row.access_token,
      })) as ChatChannel[];
    },
    enabled: !!clinicId,
  });
}

export function useChatChannelMutations() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['chat-channels', clinicId] });

  const saveChannel = useMutation({
    mutationFn: async (payload: {
      id?: string;
      display_name: string;
      phone_number: string;
      phone_number_id: string;
      waba_id?: string;
      access_token?: string;
    }) => {
      if (!clinicId) throw new Error('Clínica não selecionada');

      const row: Record<string, unknown> = {
        clinic_id: clinicId,
        channel_type: 'whatsapp',
        display_name: payload.display_name,
        phone_number: payload.phone_number.replace(/\D/g, ''),
        phone_number_id: payload.phone_number_id,
        waba_id: payload.waba_id || null,
        status: payload.phone_number_id ? 'active' : 'pending',
        updated_at: new Date().toISOString(),
      };

      if (payload.access_token) row.access_token = payload.access_token;

      if (payload.id) {
        const { error } = await supabase.from('chat_channels').update(row).eq('id', payload.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('chat_channels').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Canal salvo com sucesso');
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao salvar canal'),
  });

  return { saveChannel };
}

export function useChatFlows() {
  const { clinicId } = useClinic();

  return useQuery({
    queryKey: ['chat-flows', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('chat_flows')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ChatFlow[];
    },
    enabled: !!clinicId,
  });
}

export function useChatFlowMutations() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();

  const createFlow = useMutation({
    mutationFn: async (payload: { name: string; description?: string; is_default?: boolean }) => {
      if (!clinicId) throw new Error('Clínica não selecionada');
      const { error } = await supabase.from('chat_flows').insert({
        clinic_id: clinicId,
        name: payload.name,
        description: payload.description || null,
        is_default: payload.is_default ?? false,
        is_active: false,
        definition: DEFAULT_WELCOME_FLOW,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-flows', clinicId] });
      toast.success('Fluxo criado');
    },
    onError: () => toast.error('Erro ao criar fluxo'),
  });

  const updateFlow = useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      description?: string;
      is_active?: boolean;
      is_default?: boolean;
      definition?: ChatFlowDefinition;
    }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase
        .from('chat_flows')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-flows', clinicId] });
      toast.success('Fluxo atualizado');
    },
    onError: () => toast.error('Erro ao atualizar fluxo'),
  });

  return { createFlow, updateFlow };
}

export function useConversations(statusFilter: 'all' | ConversationStatus | 'mine' = 'all') {
  const { clinicId } = useClinic();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['chat-conversations', clinicId, statusFilter, user?.id],
    queryFn: async () => {
      if (!clinicId) return [];

      let query = supabase
        .from('chat_conversations')
        .select(`
          *,
          channel:chat_channels(display_name, channel_type)
        `)
        .eq('clinic_id', clinicId)
        .order('last_message_at', { ascending: false });

      if (statusFilter === 'mine' && user?.id) {
        query = query.eq('assigned_to', user.id);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ChatConversation[];
    },
    enabled: !!clinicId,
  });
}

export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useConversationMutations() {
  const { clinicId } = useClinic();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateConversations = () =>
    queryClient.invalidateQueries({ queryKey: ['chat-conversations', clinicId] });

  const assignToMe = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ assigned_to: user?.id, status: 'open', updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: invalidateConversations,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConversationStatus }) => {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateConversations,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) => {
      if (!clinicId || !user?.id) throw new Error('Sessão inválida');

      const { data: inserted, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          clinic_id: clinicId,
          direction: 'outbound',
          body,
          message_type: 'text',
          status: 'pending',
          sent_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      await supabase
        .from('chat_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: body.slice(0, 120),
          status: 'open',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      const { error: fnError } = await supabase.functions.invoke('meta-send-message', {
        body: { message_id: inserted.id, conversation_id: conversationId, body },
      });

      if (fnError) {
        await supabase.from('chat_messages').update({ status: 'sent' }).eq('id', inserted.id);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', vars.conversationId] });
      invalidateConversations();
    },
    onError: () => toast.error('Erro ao enviar mensagem'),
  });

  const createTestConversation = useMutation({
    mutationFn: async (channelId: string) => {
      if (!clinicId) throw new Error('Clínica não selecionada');
      const phone = `5511999${Math.floor(Math.random() * 9000000 + 1000000)}`;
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          clinic_id: clinicId,
          channel_id: channelId,
          external_contact_id: phone,
          contact_phone: phone,
          contact_name: 'Contato teste',
          status: 'waiting_human',
          last_message_preview: 'Olá, gostaria de agendar uma consulta.',
          unread_count: 1,
        })
        .select('id')
        .single();
      if (error) throw error;

      await supabase.from('chat_messages').insert({
        conversation_id: data.id,
        clinic_id: clinicId,
        direction: 'inbound',
        body: 'Olá, gostaria de agendar uma consulta.',
        message_type: 'text',
        status: 'received',
      });
      return data.id as string;
    },
    onSuccess: invalidateConversations,
  });

  return {
    assignToMe,
    updateStatus,
    sendMessage,
    createTestConversation,
  };
}
