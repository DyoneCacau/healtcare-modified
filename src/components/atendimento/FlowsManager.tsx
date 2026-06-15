import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GitBranch, Plus } from 'lucide-react';
import { useChatFlows, useChatFlowMutations } from '@/hooks/useAtendimento';
import type { ChatFlow, ChatFlowNode } from '@/types/atendimento';

export function FlowsManager() {
  const { data: flows = [], isLoading } = useChatFlows();
  const { createFlow, updateFlow } = useChatFlowMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [editFlow, setEditFlow] = useState<ChatFlow | null>(null);
  const [newName, setNewName] = useState('');
  const [nodeTexts, setNodeTexts] = useState<Record<string, string>>({});

  const openEdit = (flow: ChatFlow) => {
    setEditFlow(flow);
    const texts: Record<string, string> = {};
    flow.definition.nodes.forEach((n) => {
      if (n.text) texts[n.id] = n.text;
    });
    setNodeTexts(texts);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createFlow.mutate({ name: newName, is_default: flows.length === 0 }, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewName('');
      },
    });
  };

  const handleSaveFlow = () => {
    if (!editFlow) return;
    const nodes: ChatFlowNode[] = editFlow.definition.nodes.map((n) => ({
      ...n,
      text: nodeTexts[n.id] ?? n.text,
    }));
    updateFlow.mutate(
      {
        id: editFlow.id,
        definition: { ...editFlow.definition, nodes },
      },
      { onSuccess: () => setEditFlow(null) }
    );
  };

  const toggleActive = (flow: ChatFlow) => {
    updateFlow.mutate({ id: flow.id, is_active: !flow.is_active });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Fluxos de atendimento
          </CardTitle>
          <CardDescription>
            Automatize boas-vindas, menu de opções e encaminhamento para a equipe humana.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando fluxos...</p>
          ) : flows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crie um fluxo padrão para responder automaticamente antes do atendimento humano.
            </p>
          ) : (
            <ul className="space-y-2">
              {flows.map((flow) => (
                <li
                  key={flow.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{flow.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {flow.definition.nodes.length} etapas
                      {flow.is_default && ' · Padrão'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flow.is_active}
                        onCheckedChange={() => toggleActive(flow)}
                      />
                      <span className="text-xs text-muted-foreground">Ativo</span>
                    </div>
                    <Badge variant={flow.is_active ? 'default' : 'secondary'}>
                      {flow.is_active ? 'Rodando' : 'Inativo'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => openEdit(flow)}>
                      Editar textos
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo fluxo
          </Button>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo fluxo</DialogTitle>
            <DialogDescription>
              Será criado com modelo: boas-vindas → menu → transferência humana.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nome</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Atendimento inicial" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createFlow.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editFlow} onOpenChange={(o) => !o && setEditFlow(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar fluxo: {editFlow?.name}</DialogTitle>
            <DialogDescription>Ajuste as mensagens automáticas enviadas ao paciente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editFlow?.definition.nodes.map((node) => (
              <div key={node.id} className="space-y-1">
                <Label className="capitalize">
                  {node.type} — {node.id}
                </Label>
                {node.type === 'menu' && node.options && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Opções: {node.options.map((o) => o.label).join(', ')}
                  </p>
                )}
                {(node.type === 'message' || node.type === 'menu' || node.type === 'handoff') && (
                  <Textarea
                    value={nodeTexts[node.id] ?? node.text ?? ''}
                    onChange={(e) =>
                      setNodeTexts({ ...nodeTexts, [node.id]: e.target.value })
                    }
                    rows={3}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFlow(null)}>Cancelar</Button>
            <Button onClick={handleSaveFlow} disabled={updateFlow.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
