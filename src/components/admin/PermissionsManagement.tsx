import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2, Lock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import {
  SYSTEM_ROLES,
  ROLE_LABELS,
  PERMISSION_FEATURES,
  PERMISSION_ACTIONS,
  getDefaultPermissionsForRole,
  type SystemRole,
} from '@/lib/permissionsConstants';

type ActionKey = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

interface ModuleRowDef {
  feature: string;
  featureLabel: string;
}

interface ColumnDef {
  id: string;
  name: string;
  type: 'system' | 'custom';
}

/** Coluna de célula: função + ação (Ver, Criar, Editar, Excluir) */
interface CellColDef extends ColumnDef {
  actionKey: ActionKey;
  actionLabel: string;
}

interface CustomRole {
  id: string;
  name: string;
  permissions: { feature: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[];
}

const ALWAYS_AVAILABLE_FEATURES = ['dashboard', 'configuracoes'];
const FEATURE_ALIASES: Record<string, string[]> = {
  pacientes_basico: ['pacientes'],
  financeiro_basico: ['financeiro'],
};

function expandPlanFeatures(features: string[]): string[] {
  const expanded = new Set<string>([...ALWAYS_AVAILABLE_FEATURES, ...features]);
  features.forEach((f) => FEATURE_ALIASES[f]?.forEach((alias) => expanded.add(alias)));
  return Array.from(expanded);
}

export function PermissionsManagement() {
  const { clinicId } = useClinic();
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [planFeatureIds, setPlanFeatureIds] = useState<string[]>([]);
  const [systemPerms, setSystemPerms] = useState<Record<SystemRole, Record<string, Record<ActionKey, boolean>>>>({
    admin: {},
    receptionist: {},
    seller: {},
    professional: {},
  });
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('admin');

  /** Uma linha por tela/módulo (esquerda) */
  const buildRows = useMemo((): ModuleRowDef[] => {
    const features = Array.isArray(PERMISSION_FEATURES) ? PERMISSION_FEATURES : [];
    return features.map((f) => ({ feature: f.id, featureLabel: f.label }));
  }, []);

  const allColumns: ColumnDef[] = useMemo(() => {
    const cols: ColumnDef[] = SYSTEM_ROLES.map((r) => ({ id: r, name: ROLE_LABELS[r], type: 'system' }));
    customRoles.forEach((r) => cols.push({ id: r.id, name: r.name, type: 'custom' }));
    return cols;
  }, [customRoles]);

  const columns = useMemo(() => {
    const list = Array.isArray(allColumns) ? allColumns : [];
    const col = list.find((c) => c.id === selectedRoleFilter);
    return col ? [col] : (list.length ? [list[0]] : []);
  }, [allColumns, selectedRoleFilter]);

  /** Colunas da tabela: para cada função, 4 colunas (Ver, Criar, Editar, Excluir) */
  const cellColumns = useMemo((): CellColDef[] => {
    const actions = Array.isArray(PERMISSION_ACTIONS) ? PERMISSION_ACTIONS : [];
    return columns.flatMap((col) =>
      actions.map((a) => ({
        ...col,
        actionKey: a.key,
        actionLabel: a.label,
      }))
    );
  }, [columns]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return buildRows;
    const q = search.toLowerCase().trim();
    return buildRows.filter((r) => r.featureLabel.toLowerCase().includes(q));
  }, [buildRows, search]);

  const getValue = (row: ModuleRowDef, cellCol: CellColDef): boolean => {
    if (cellCol.type === 'system') {
      const role = cellCol.id as SystemRole;
      return systemPerms[role]?.[row.feature]?.[cellCol.actionKey] ?? false;
    }
    const cr = customRoles.find((r) => r.id === cellCol.id);
    const p = cr?.permissions?.find((x) => x.feature === row.feature);
    if (!p) return false;
    return p[cellCol.actionKey] ?? false;
  };

  const isModuleInPlan = (featureId: string): boolean =>
    planFeatureIds.includes(featureId);

  const canEditModulePermission = (featureId: string): boolean =>
    isSuperAdmin || isModuleInPlan(featureId);

  const setValue = (row: ModuleRowDef, cellCol: CellColDef, value: boolean) => {
    if (!canEditModulePermission(row.feature)) return;
    if (cellCol.type === 'system') {
      const role = cellCol.id as SystemRole;
      setSystemPerms((prev) => ({
        ...prev,
        [role]: {
          ...prev[role],
          [row.feature]: {
            ...(prev[role]?.[row.feature] ?? {}),
            [cellCol.actionKey]: value,
          },
        },
      }));
      return;
    }
    setCustomRoles((prev) =>
      prev.map((r) => {
        if (r.id !== cellCol.id) return r;
        const perms = r.permissions.find((p) => p.feature === row.feature);
        if (!perms) {
          const newPerms = [...r.permissions, { feature: row.feature, can_view: false, can_create: false, can_edit: false, can_delete: false }];
          const p = newPerms.find((x) => x.feature === row.feature)!;
          p[cellCol.actionKey] = value;
          return { ...r, permissions: newPerms };
        }
        return {
          ...r,
          permissions: r.permissions.map((p) =>
            p.feature === row.feature ? { ...p, [cellCol.actionKey]: value } : p
          ),
        };
      })
    );
  };

  const loadAll = async () => {
    if (!clinicId) return;
    const [roleRes, customRolesRes, permsRes, subRes] = await Promise.all([
      supabase.from('clinic_role_permissions').select('*').eq('clinic_id', clinicId),
      supabase.from('clinic_custom_roles').select('id, name').eq('clinic_id', clinicId),
      supabase.from('clinic_custom_role_permissions').select('*'),
      supabase.from('subscriptions').select('plans(features)').eq('clinic_id', clinicId).maybeSingle(),
    ]);

    const planFeatures = (subRes.data as any)?.plans?.features;
    let raw: string[] = [];
    if (Array.isArray(planFeatures)) raw = planFeatures;
    else if (typeof planFeatures === 'string') try { raw = JSON.parse(planFeatures); } catch { raw = []; }
    setPlanFeatureIds(expandPlanFeatures(raw));

    const byRole: Record<SystemRole, Record<string, Record<ActionKey, boolean>>> = {
      admin: {},
      receptionist: {},
      seller: {},
      professional: {},
    };
    SYSTEM_ROLES.forEach((role) => {
      const defaultRows = getDefaultPermissionsForRole(role);
      defaultRows.forEach((p) => {
        if (!byRole[role][p.feature]) byRole[role][p.feature] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
        byRole[role][p.feature].can_view = p.can_view;
        byRole[role][p.feature].can_create = p.can_create;
        byRole[role][p.feature].can_edit = p.can_edit;
        byRole[role][p.feature].can_delete = p.can_delete;
      });
    });
    (roleRes.data || []).forEach((row: any) => {
      if (SYSTEM_ROLES.includes(row.role)) {
        if (!byRole[row.role][row.feature]) byRole[row.role][row.feature] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
        byRole[row.role][row.feature].can_view = row.can_view;
        byRole[row.role][row.feature].can_create = row.can_create;
        byRole[row.role][row.feature].can_edit = row.can_edit;
        byRole[row.role][row.feature].can_delete = row.can_delete;
      }
    });
    setSystemPerms(byRole);

    const perms = permsRes.data || [];
    const customRolesList: CustomRole[] = (customRolesRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      permissions: PERMISSION_FEATURES.map((f) => {
        const p = perms.find((x: any) => x.clinic_custom_role_id === r.id && x.feature === f.id);
        return p ? { feature: f.id, can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete } : { feature: f.id, can_view: false, can_create: false, can_edit: false, can_delete: false };
      }),
    }));
    setCustomRoles(customRolesList);
  };

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    const list = Array.isArray(allColumns) ? allColumns : [];
    if (list.length && selectedRoleFilter && !list.some((c) => c.id === selectedRoleFilter)) {
      setSelectedRoleFilter(list[0].id);
    }
  }, [allColumns, selectedRoleFilter]);

  const saveAll = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      const allFeatureIds = PERMISSION_FEATURES.map((f) => f.id);
      for (const role of SYSTEM_ROLES) {
        const toUpsert = allFeatureIds.map((feature) => ({
          clinic_id: clinicId,
          role,
          feature,
          can_view: systemPerms[role]?.[feature]?.can_view ?? false,
          can_create: systemPerms[role]?.[feature]?.can_create ?? false,
          can_edit: systemPerms[role]?.[feature]?.can_edit ?? false,
          can_delete: systemPerms[role]?.[feature]?.can_delete ?? false,
        }));
        await supabase.from('clinic_role_permissions').upsert(toUpsert, { onConflict: 'clinic_id,role,feature' });
      }
      for (const cr of customRoles) {
        await supabase.from('clinic_custom_role_permissions').delete().eq('clinic_custom_role_id', cr.id);
        const toInsert = cr.permissions
          .filter((p) => p.can_view || p.can_create || p.can_edit || p.can_delete)
          .map((p) => ({
            clinic_custom_role_id: cr.id,
            feature: p.feature,
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          }));
        if (toInsert.length) await supabase.from('clinic_custom_role_permissions').insert(toInsert);
      }
      toast.success('Permissões salvas');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!clinicId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Selecione uma clínica para gerenciar permissões.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Defina o que cada função pode ver, criar, editar ou excluir em cada módulo. Módulos fora do plano da clínica aparecem bloqueados (cadeado); apenas o superadmin pode liberar uso avulso. Funções personalizadas são criadas na aba <strong>Usuários</strong>.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Selecionar função:</Label>
            <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
                {customRoles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} (personalizada)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisa por palavra-chave"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar alterações
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] font-semibold bg-muted/50">Tela / Módulo</TableHead>
                  {(Array.isArray(PERMISSION_ACTIONS) ? PERMISSION_ACTIONS : []).map((a) => (
                    <TableHead key={a.key} className="text-center min-w-[80px] font-semibold bg-muted/50">
                      {a.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(filteredRows) ? filteredRows : []).map((row) => {
                  const canEdit = canEditModulePermission(row.feature);
                  const inPlan = isModuleInPlan(row.feature);
                  return (
                    <TableRow key={row.feature} className={!inPlan ? 'bg-muted/30' : undefined}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {!inPlan && (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0" title="Módulo fora do plano da clínica" />
                          )}
                          {row.featureLabel}
                        </span>
                      </TableCell>
                      {(Array.isArray(cellColumns) ? cellColumns : []).map((cc) => (
                        <TableCell key={`${cc.id}-${cc.actionKey}`} className="text-center">
                          {canEdit ? (
                            <Switch
                              checked={getValue(row, cc)}
                              onCheckedChange={(v) => setValue(row, cc, v)}
                            />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground mx-auto inline-block" title="Sem este módulo no plano" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
