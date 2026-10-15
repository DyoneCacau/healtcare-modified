import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSmartHub } from '@/hooks/useSmartHub';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { useClinicStaffOptions } from '@/hooks/useClinicStaffOptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CaptureService,
  assertValidOwnerInput,
  customQuestionsIssues,
  mergeCaptureConfig,
  normalizeCustomQuestions,
  normalizeOwnerUserId,
} from '@/services/smartHub';
import type { SmartHubCaptureConfig } from '@/types/smartHub';
import { CRM_STAGES } from '@/types/crm';
import { CustomQuestionsEditor } from './CustomQuestionsEditor';

interface SmartHubFormConfigEditorProps {
  onSaved?: () => void;
}

/** Formulário padrão do Smart Hub (usado na aba Formulário e no editor de botão). */
export function SmartHubFormConfigEditor({ onSaved }: SmartHubFormConfigEditorProps) {
  const { hub, updateHub } = useSmartHub();
  const { hasFeature } = useSubscription();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { staff } = useClinicStaffOptions();
  const hasCrm = hasFeature('crm');
  const canEditHub = permissionsLoading ? false : can('smart_hub', 'can_edit');
  const hubWhatsapp = hub?.whatsapp_number || '';

  const [captureConfig, setCaptureConfig] = useState<SmartHubCaptureConfig>(() =>
    mergeCaptureConfig(hub?.capture_config),
  );

  useEffect(() => {
    if (hub) setCaptureConfig(mergeCaptureConfig(hub.capture_config));
  }, [hub]);

  const save = async () => {
    if (!canEditHub) {
      toast.error('Você não tem permissão para editar o Smart Hub.');
      return;
    }
    const ownerCheck = assertValidOwnerInput(captureConfig.default_owner_user_id);
    if (ownerCheck.ok === false) {
      toast.error(ownerCheck.message);
      return;
    }
    const questionIssues = customQuestionsIssues(captureConfig.custom_questions ?? []);
    if (questionIssues.length > 0) {
      toast.error('Revise as perguntas personalizadas.', {
        description: questionIssues.join('\n'),
      });
      return;
    }
    try {
      await updateHub.mutateAsync({
        capture_config: {
          ...captureConfig,
          default_owner_user_id: normalizeOwnerUserId(ownerCheck.owner),
          initial_stage: captureConfig.initial_stage || 'new',
          custom_questions: normalizeCustomQuestions(captureConfig.custom_questions),
        },
      });
      onSaved?.();
    } catch {
      // Toast de erro vem de updateHub.onError.
    }
  };

  if (!hub) {
    return (
      <p className="text-sm text-muted-foreground">
        Crie um Smart Hub no Dashboard para configurar o formulário.
      </p>
    );
  }

  if (!hasCrm) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        O módulo CRM no plano é necessário para receber leads pelos formulários do Smart Hub.
        Botões com ação “Abrir WhatsApp” continuam funcionando normalmente.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Título do formulário</Label>
          <Input
            value={captureConfig.form_title || ''}
            onChange={(e) => setCaptureConfig((prev) => ({ ...prev, form_title: e.target.value }))}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Descrição do formulário</Label>
          <Textarea
            value={captureConfig.form_description || ''}
            onChange={(e) =>
              setCaptureConfig((prev) => ({ ...prev, form_description: e.target.value }))
            }
            rows={2}
          />
        </div>

        <div className="sm:col-span-2">
          <CustomQuestionsEditor
            value={captureConfig.custom_questions ?? []}
            onChange={(next) => setCaptureConfig((prev) => ({ ...prev, custom_questions: next }))}
            disabled={!canEditHub}
          />
        </div>

        <div className="space-y-2">
          <Label>Texto do botão Enviar</Label>
          <Input
            value={captureConfig.submit_label || ''}
            onChange={(e) => setCaptureConfig((prev) => ({ ...prev, submit_label: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>URL opcional após envio</Label>
          <Input
            value={captureConfig.redirect_url || ''}
            onChange={(e) =>
              setCaptureConfig((prev) => ({ ...prev, redirect_url: e.target.value || null }))
            }
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Mensagem de confirmação</Label>
          <Input
            value={captureConfig.success_message || ''}
            onChange={(e) =>
              setCaptureConfig((prev) => ({ ...prev, success_message: e.target.value }))
            }
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:col-span-2">
          <Label>Exigir aceite de privacidade</Label>
          <Switch
            checked={captureConfig.require_privacy_accept !== false}
            onCheckedChange={(v) =>
              setCaptureConfig((prev) => ({ ...prev, require_privacy_accept: v }))
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Texto do consentimento</Label>
          <Textarea
            value={captureConfig.privacy_text || ''}
            onChange={(e) => setCaptureConfig((prev) => ({ ...prev, privacy_text: e.target.value }))}
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div>
          <h4 className="text-sm font-semibold">Destino no CRM</h4>
          <p className="text-xs text-muted-foreground">
            Como os contatos recebidos pelo formulário entram no CRM.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Etapa inicial padrão</Label>
            <Select
              value={captureConfig.initial_stage || 'new'}
              onValueChange={(v) =>
                setCaptureConfig((prev) => ({
                  ...prev,
                  initial_stage: v as SmartHubCaptureConfig['initial_stage'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Etapa do Kanban em que o lead entra após o formulário.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Responsável padrão</Label>
            <Select
              value={captureConfig.default_owner_user_id || '__none__'}
              onValueChange={(v) =>
                setCaptureConfig((prev) => ({
                  ...prev,
                  default_owner_user_id: v === '__none__' ? null : v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:col-span-2">
            <div>
              <Label>Abrir WhatsApp após envio</Label>
              <p className="text-xs text-muted-foreground">
                Só abre o WhatsApp depois de confirmar o salvamento no CRM.
              </p>
            </div>
            <Switch
              checked={Boolean(captureConfig.redirect_whatsapp_after_submit)}
              onCheckedChange={(v) =>
                setCaptureConfig((prev) => ({ ...prev, redirect_whatsapp_after_submit: v }))
              }
            />
          </div>
          {captureConfig.redirect_whatsapp_after_submit ? (
            <>
              <div className="space-y-2">
                <Label>Telefone do WhatsApp</Label>
                <Input
                  value={captureConfig.whatsapp_phone || hubWhatsapp}
                  onChange={(e) =>
                    setCaptureConfig((prev) => ({ ...prev, whatsapp_phone: e.target.value || null }))
                  }
                  placeholder={hubWhatsapp || '5511999999999'}
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem do WhatsApp</Label>
                <Input
                  value={
                    captureConfig.whatsapp_followup_message || captureConfig.whatsapp_message || ''
                  }
                  onChange={(e) =>
                    setCaptureConfig((prev) => ({
                      ...prev,
                      whatsapp_followup_message: e.target.value || null,
                    }))
                  }
                  placeholder="Olá! Acabei de enviar o formulário…"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={!canEditHub || updateHub.isPending}
        >
          {updateHub.isPending ? 'Salvando…' : 'Salvar formulário'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hub.slug}
          onClick={async () => {
            const result = await CaptureService.validateCapture(hub.slug);
            if (result.ready || result.ok) {
              toast.success(result.message || 'Formulário pronto para receber contatos.');
            } else {
              const issues = result.issues?.length
                ? result.issues.join(' ')
                : result.error || 'Corrija a configuração.';
              toast.error(result.message || 'Corrija os seguintes itens:', {
                description: issues,
              });
            }
          }}
        >
          Verificar configuração
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!hub.slug || hub.status !== 'published'}
          onClick={async () => {
            const result = await CaptureService.submitTestLead(hub.slug);
            if (!result.ok) {
              toast.error(result.error || 'Falha no teste', {
                description: result.request_id ? `Código: ${result.request_id}` : undefined,
              });
              return;
            }
            toast.success(result.message || 'Lead de teste criado.', {
              description: result.stage
                ? `Etapa: ${result.stage}. Procure no CRM por “TESTE Smart Hub”.`
                : 'Procure no CRM por “TESTE Smart Hub”.',
            });
          }}
        >
          Enviar lead de teste
        </Button>
      </div>
    </div>
  );
}
