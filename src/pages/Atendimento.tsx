import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Phone, GitBranch } from 'lucide-react';
import { InboxPanel } from '@/components/atendimento/InboxPanel';
import { ChannelSetup } from '@/components/atendimento/ChannelSetup';
import { FlowsManager } from '@/components/atendimento/FlowsManager';
import { useClinic } from '@/hooks/useClinic';

export default function Atendimento() {
  const { clinicId, isLoading } = useClinic();

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </>
    );
  }

  if (!clinicId) {
    return (
      <>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Selecione uma clínica no menu lateral para acessar o atendimento omnichannel.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-7 w-7" />
          Atendimento
        </h1>
        <p className="text-muted-foreground mt-1">
          Inbox centralizado, canais WhatsApp e fluxos automatizados para sua equipe.
        </p>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList className="h-auto flex flex-wrap justify-start gap-1">
          <TabsTrigger value="inbox" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="canais" className="gap-2">
            <Phone className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="fluxos" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Fluxos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <InboxPanel />
        </TabsContent>
        <TabsContent value="canais">
          <ChannelSetup />
        </TabsContent>
        <TabsContent value="fluxos">
          <FlowsManager />
        </TabsContent>
      </Tabs>
    </>
  );
}
