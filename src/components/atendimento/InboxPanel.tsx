import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  useConversations,
  useChatChannels,
  useConversationMutations,
} from '@/hooks/useAtendimento';
import { ChatThread } from './ChatThread';
import type { ChatConversation, ConversationStatus } from '@/types/atendimento';
import { CONVERSATION_STATUS_LABELS } from '@/types/atendimento';

const FILTERS: { id: 'all' | ConversationStatus | 'mine'; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'waiting_human', label: 'Aguardando' },
  { id: 'open', label: 'Abertas' },
  { id: 'mine', label: 'Minhas' },
  { id: 'closed', label: 'Encerradas' },
];

export function InboxPanel() {
  const [filter, setFilter] = useState<'all' | ConversationStatus | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading, refetch } = useConversations(filter);
  const { data: channels = [] } = useChatChannels();
  const { createTestConversation } = useConversationMutations();

  useEffect(() => {
    if (!channels.length) return;

    const ch = supabase
      .channel('inbox-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_conversations' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [channels.length, refetch]);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.contact_name?.toLowerCase().includes(q) ||
      c.contact_phone.includes(q) ||
      c.last_message_preview?.toLowerCase().includes(q)
    );
  });

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const handleCreateTest = () => {
    const channelId = channels[0]?.id;
    if (!channelId) return;
    createTestConversation.mutate(channelId, {
      onSuccess: (id) => setSelectedId(id),
    });
  };

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-0 overflow-hidden rounded-lg border md:grid-cols-[320px_1fr]">
      <div className="flex flex-col border-r">
        <div className="space-y-3 border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          {channels.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              onClick={handleCreateTest}
              disabled={createTestConversation.isPending}
            >
              <MessageSquarePlus className="mr-1 h-3.5 w-3.5" />
              Simular conversa (teste)
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma conversa. Conecte um canal ou simule uma conversa de teste.
            </p>
          ) : (
            <ul>
              {filtered.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  isSelected={conv.id === selectedId}
                  onSelect={() => setSelectedId(conv.id)}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>

      <ChatThread conversation={selected} />
    </div>
  );
}

function ConversationRow({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: ChatConversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'w-full border-b px-3 py-3 text-left transition-colors hover:bg-muted/50',
          isSelected && 'bg-muted'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">
              {conversation.contact_name || conversation.contact_phone}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {conversation.last_message_preview || 'Sem mensagens'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.last_message_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            {conversation.unread_count > 0 && (
              <Badge className="h-5 min-w-5 justify-center px-1 text-[10px]">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-1 flex gap-1">
          <Badge variant="outline" className="text-[10px]">
            {CONVERSATION_STATUS_LABELS[conversation.status]}
          </Badge>
          {conversation.channel?.display_name && (
            <Badge variant="secondary" className="text-[10px]">
              {conversation.channel.display_name}
            </Badge>
          )}
        </div>
      </button>
    </li>
  );
}
