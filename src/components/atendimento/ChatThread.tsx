import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, UserCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useConversationMessages,
  useConversationMutations,
} from '@/hooks/useAtendimento';
import type { ChatConversation } from '@/types/atendimento';
import { CONVERSATION_STATUS_LABELS } from '@/types/atendimento';
import { cn } from '@/lib/utils';

interface ChatThreadProps {
  conversation: ChatConversation | null;
}

export function ChatThread({ conversation }: ChatThreadProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: messages = [], isLoading } = useConversationMessages(conversation?.id ?? null);
  const { sendMessage, assignToMe, updateStatus } = useConversationMutations();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">Selecione uma conversa para começar o atendimento</p>
      </div>
    );
  }

  const handleSend = () => {
    const text = draft.trim();
    if (!text || sendMessage.isPending) return;
    sendMessage.mutate({ conversationId: conversation.id, body: text }, {
      onSuccess: () => setDraft(''),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">{conversation.contact_name || conversation.contact_phone}</h3>
          <p className="text-xs text-muted-foreground">{conversation.contact_phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{CONVERSATION_STATUS_LABELS[conversation.status]}</Badge>
          {!conversation.assigned_to && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => assignToMe.mutate(conversation.id)}
              disabled={assignToMe.isPending}
            >
              <UserCheck className="mr-1 h-4 w-4" />
              Assumir
            </Button>
          )}
          {conversation.status !== 'closed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus.mutate({ id: conversation.id, status: 'closed' })}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Encerrar
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.direction === 'inbound' ? 'justify-start' : 'justify-end'
                )}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                    msg.direction === 'inbound'
                      ? 'bg-muted text-foreground'
                      : msg.direction === 'system'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : 'bg-primary text-primary-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {conversation.status !== 'closed' && (
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!draft.trim() || sendMessage.isPending}
              className="self-end"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
