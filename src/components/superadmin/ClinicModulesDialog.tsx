import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { parsePlanFeatures } from '@/lib/planFeatures';
import {
  PLAN_MODULES,
  ensureAlwaysIncluded,
  expandFeatureAliases,
  parseFeatureGrants,
  type FeatureGrant,
} from '@/lib/planModules';
import { Gift, Puzzle } from 'lucide-react';

interface ClinicModulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicId: string | null;
  clinicName?: string;
  onSaved?: () => void;
}

type GrantDraft = Record<string, { enabled: boolean; expires_at: string }>;

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function endOfDayIso(dateYmd: string): string {
  // Expira no fim do dia local (armazenado como ISO)
  const d = new Date(`${dateYmd}T23:59:59`);
  return d.toISOString();
}

export function ClinicModulesDialog({
  open,
  onOpenChange,
  clinicId,
  clinicName,
  onSaved,
}: ClinicModulesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string>('');
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [grants, setGrants] = useState<GrantDraft>({});

  const editableModules = useMemo(
    () => PLAN_MODULES.filter((m) => !('always' in m && m.always)),
    [],
  );

  useEffect(() => {
    if (!open || !clinicId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, features_override, feature_grants, plans(name, features)')
          .eq('clinic_id', clinicId)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        if (!data) {
          setSubscriptionId(null);
          setPlanName('');
          setPlanFeatures([]);
          setSelected([]);
          setGrants({});
          return;
        }

        const plan = data.plans as unknown as { name?: string; features?: unknown } | null;
        const planFeats = expandFeatureAliases(parsePlanFeatures(plan?.features));
        const overrideRaw = (data as { features_override?: unknown }).features_override;
        const override = Array.isArray(overrideRaw)
          ? overrideRaw.filter((f): f is string => typeof f === 'string')
          : [];
        const permanent = expandFeatureAliases(override.length > 0 ? override : planFeats);
        const grantRows = parseFeatureGrants((data as { feature_grants?: unknown }).feature_grants);

        const draft: GrantDraft = {};
        grantRows.forEach((g) => {
          draft[g.feature] = {
            enabled: true,
            expires_at: toDateInputValue(g.expires_at),
          };
        });

        setSubscriptionId(data.id);
        setPlanName(plan?.name || 'Sem plano');
        setPlanFeatures(planFeats);
        setSelected(ensureAlwaysIncluded(permanent));
        setGrants(draft);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar módulos da clínica');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, clinicId]);

  function toggleModule(id: string, checked: boolean) {
    setSelected((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return ensureAlwaysIncluded(Array.from(set));
    });
  }

  function toggleGrant(id: string, enabled: boolean) {
    setGrants((prev) => {
      const next = { ...prev };
      if (!enabled) {
        delete next[id];
        return next;
      }
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      next[id] = {
        enabled: true,
        expires_at: prev[id]?.expires_at || in30.toISOString().slice(0, 10),
      };
      return next;
    });
  }

  async function handleSave() {
    if (!subscriptionId) {
      toast.error('Esta clínica ainda não tem assinatura');
      return;
    }

    setSaving(true);
    try {
      const permanent = ensureAlwaysIncluded(selected);
      const featureGrants: FeatureGrant[] = Object.entries(grants)
        .filter(([, v]) => v.enabled)
        .map(([feature, v]) => ({
          feature,
          expires_at: v.expires_at ? endOfDayIso(v.expires_at) : null,
          note: 'Presente / liberação avulsa',
        }));

      const { error } = await supabase
        .from('subscriptions')
        .update({
          features_override: permanent,
          feature_grants: featureGrants,
        } as never)
        .eq('id', subscriptionId);

      if (error) throw error;

      toast.success('Módulos da clínica atualizados');
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar módulos');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Módulos da clínica
          </DialogTitle>
          <DialogDescription>
            {clinicName ? (
              <>
                Liberação avulsa para <strong>{clinicName}</strong> — não altera o plano dos demais
                clientes.
              </>
            ) : (
              'Liberação avulsa só para esta clínica, sem alterar o plano global.'
            )}
            {planName ? (
              <span className="block mt-1 text-xs">Plano de referência: {planName}</span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : !subscriptionId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Crie ou vincule uma assinatura antes de liberar módulos.
          </p>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                Marque os módulos permanentes desta clínica. Use “Presente” para liberar por tempo
                limitado (ex.: 30 dias) sem mudar o plano.
              </p>
              {editableModules.map((mod) => {
                const inPlan = planFeatures.includes(mod.id);
                const checked = selected.includes(mod.id);
                const grant = grants[mod.id];
                return (
                  <div
                    key={mod.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`mod-${mod.id}`}
                        checked={checked}
                        onCheckedChange={(v) => toggleModule(mod.id, v === true)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label htmlFor={`mod-${mod.id}`} className="font-medium cursor-pointer">
                            {mod.name}
                          </Label>
                          {inPlan && (
                            <Badge variant="secondary" className="text-[10px]">
                              No plano
                            </Badge>
                          )}
                          {checked && !inPlan && (
                            <Badge variant="outline" className="text-[10px]">
                              Avulso
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                      </div>
                    </div>

                    <div className="ml-7 flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox
                          checked={!!grant?.enabled}
                          onCheckedChange={(v) => toggleGrant(mod.id, v === true)}
                        />
                        <Gift className="h-3.5 w-3.5" />
                        Presente temporário (sem mexer no plano)
                      </label>
                      {grant?.enabled && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`exp-${mod.id}`} className="text-xs whitespace-nowrap">
                            Expira em
                          </Label>
                          <Input
                            id={`exp-${mod.id}`}
                            type="date"
                            className="h-8 w-auto"
                            value={grant.expires_at}
                            onChange={(e) =>
                              setGrants((prev) => ({
                                ...prev,
                                [mod.id]: {
                                  enabled: true,
                                  expires_at: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !subscriptionId || loading}>
            {saving ? 'Salvando…' : 'Salvar módulos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
