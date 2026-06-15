import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, Plus, Copy, ExternalLink } from 'lucide-react';
import { useChatChannels, useChatChannelMutations } from '@/hooks/useAtendimento';
import { toast } from 'sonner';

const WEBHOOK_PATH = '/functions/v1/meta-webhook';

export function ChannelSetup() {
  const { data: channels = [], isLoading } = useChatChannels();
  const { saveChannel } = useChatChannelMutations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState({
    display_name: '',
    phone_number: '',
    phone_number_id: '',
    waba_id: '',
    access_token: '',
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const webhookUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}${WEBHOOK_PATH}` : '';

  const openNew = () => {
    setEditingId(undefined);
    setForm({
      display_name: 'WhatsApp Principal',
      phone_number: '',
      phone_number_id: '',
      waba_id: '',
      access_token: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (channel: (typeof channels)[0]) => {
    setEditingId(channel.id);
    setForm({
      display_name: channel.display_name,
      phone_number: channel.phone_number || '',
      phone_number_id: channel.phone_number_id || '',
      waba_id: channel.waba_id || '',
      access_token: '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveChannel.mutate(
      {
        id: editingId,
        display_name: form.display_name,
        phone_number: form.phone_number,
        phone_number_id: form.phone_number_id,
        waba_id: form.waba_id || undefined,
        access_token: form.access_token || undefined,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL do webhook copiada');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Canais conectados
          </CardTitle>
          <CardDescription>
            Associe o número WhatsApp Business da clínica via Meta Cloud API (modelo omnichannel).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium mb-2">Webhook para Meta Developers</p>
            <p className="text-muted-foreground mb-2">
              Configure esta URL no painel Meta → WhatsApp → Configuration → Webhook.
              Use o mesmo token definido em <code className="text-xs">META_WEBHOOK_VERIFY_TOKEN</code> no Supabase.
            </p>
            {webhookUrl ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{webhookUrl}</code>
                <Button size="sm" variant="outline" onClick={copyWebhook}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-amber-600">Defina VITE_SUPABASE_URL no .env</p>
            )}
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Documentação Meta Cloud API
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando canais...</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum canal configurado. Adicione o número WhatsApp da clínica.
            </p>
          ) : (
            <ul className="space-y-2">
              {channels.map((ch) => (
                <li
                  key={ch.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{ch.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ch.phone_number || 'Número não informado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={ch.status === 'active' ? 'default' : 'secondary'}>
                      {ch.status === 'active' ? 'Ativo' : ch.status}
                    </Badge>
                    {ch.has_token && (
                      <Badge variant="outline" className="text-xs">Token OK</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(ch)}>
                      Editar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Conectar WhatsApp
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar canal' : 'Conectar WhatsApp'}</DialogTitle>
            <DialogDescription>
              Dados obtidos no Meta Business Suite / Developers após criar o app WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do canal</Label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Número (com DDI, ex: 5511999999999)</Label>
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="5511999999999"
              />
            </div>
            <div>
              <Label>Phone Number ID (Meta)</Label>
              <Input
                value={form.phone_number_id}
                onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
              />
            </div>
            <div>
              <Label>WABA ID (opcional)</Label>
              <Input
                value={form.waba_id}
                onChange={(e) => setForm({ ...form, waba_id: e.target.value })}
              />
            </div>
            <div>
              <Label>Access Token {editingId && '(deixe vazio para manter)'}</Label>
              <Input
                type="password"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                placeholder="Token permanente do System User"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveChannel.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
