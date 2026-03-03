import { useState, useEffect, useMemo, Fragment } from 'react';
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
import { Search, Loader2, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { getClinicDisplayName } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useClinic, useClinics } from '@/hooks/useClinic';
import { useAuth } from '@/hooks/useAuth';
import {
  SYSTEM_ROLES,
  ROLE_LABELS,
  PERMISSION_FEATURES,
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

interface CustomRole {
  id: string;
  name: string;
  permissions: { feature: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[];
}

const ALWAYS_AVAILABLE_FEATURES = ['dashboard', 'configuracoes', 'agenda_todas_clinicas'];
const FEATURE_ALIASES: Record<string, string[]> = {
  pacientes_basico: ['pacientes'],
  financeiro_basico: ['financeiro'],
};

/** Filhos de um módulo pai (ex.: Agenda - todas as clínicas fica dentro de Agenda) */
const FEATURE_CHILDREN: Record<string, { feature: string; featureLabel: string }[]> = {
  agenda: [{ feature: 'agenda_todas_clinicas', featureLabel: 'Agenda - todas as clínicas' }],
};

function expandPlanFeatures(features: string[]): string[] {
  const expanded = new Set<string>([...ALWAYS_AVAILABLE_FEATURES, ...features]);
  features.forEach((f) => FEATURE_ALIASES[f]?.forEach((alias) => expanded.add(alias)));
  return Array.from(expanded);
}

/** Popover com checkboxes para marcar várias permissões (Ver, Criar, Editar, Excluir) por módulo */
function PermFlagsPopover({
  row,
  getPerms,
  setPermFlags,
  flagOptions,
}: {
  row: ModuleRowDef;
  getPerms: (r: ModuleRowDef) => Record<ActionKey, boolean>;
  setPermFlags: (r: ModuleRowDef, v: Record<ActionKey, boolean>) => void;
  flagOptions: { id: ActionKey; label: string }[];
}) {
  const perms = getPerms(row);
  const allChecked = perms.can_view && perms.can_create && perms.can_edit && perms.can_delete;
  const count = [perms.can_view, perms.can_create, perms.can_edit, perms.can_delete].filter(Boolean).length;
  const label =
    count === 0
      ? 'Nenhuma'
      : count === 4
        ? 'Permissão total'
        : count === 1
          ? flagOptions.find((o) => perms[o.id])?.label ?? `${count} item`
          : `${count} itens`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full max-w-[200px] justify-between border-border bg-background">
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <label className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm font-medium">
          <Checkbox
            checked={allChecked}
            onCheckedChange={(c) => {
              const v = c === true;
              setPermFlags(row, { can_view: v, can_create: v, can_edit: v, can_delete: v });
            }}
          />
          Permissão total
        </label>
        {flagOptions.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
            <Checkbox
              checked={perms[opt.id]}
              onCheckedChange={(c) => {
                const next = { ...perms, [opt.id]: c === true };
                setPermFlags(row, next);
              }}
            />
            {opt.label}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function PermissionsManagement() {
  const { clinicId, clinic } = useClinic();
  const { clinics: clinicsList } = useClinics();
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
  /** Função: multi-select (1 ou mais) */
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(['admin']);
  /** Clínica: '' = Todas as unidades, senão id da clínica */
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  /** Módulos pais expandidos (ex.: agenda = true mostra filhos) */
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({ agenda: false });
  const clinicOptions = useMemo(() => {
    return (clinicsList?.length ? clinicsList : clinic ? [clinic] : []) as { id: string; name?: string; unit_name?: string }[];
  }, [clinicsList, clinic]);
  const effectiveClinicId = selectedClinicId || clinicId || clinicOptions[0]?.id || null;

  /** Linhas raiz: módulos que não são filhos de outro (filhos aparecem sob o pai) */
  const buildRows = useMemo((): ModuleRowDef[] => {
    const features = Array.isArray(PERMISSION_FEATURES) ? PERMISSION_FEATURES : [];
    const childIds = new Set(
      Object.values(FEATURE_CHILDREN).flat().map((c) => c.feature)
    );
    return features
      .filter((f) => !childIds.has(f.id))
      .map((f) => ({ feature: f.id, featureLabel: f.label }));
  }, []);

  const getChildRows = (parentFeatureId: string): ModuleRowDef[] =>
    FEATURE_CHILDREN[parentFeatureId] ?? [];

  const allColumns: ColumnDef[] = useMemo(() => {
    const cols: ColumnDef[] = SYSTEM_ROLES.map((r) => ({ id: r, name: ROLE_LABELS[r], type: 'system' }));
    customRoles.forEach((r) => cols.push({ id: r.id, name: r.name, type: 'custom' }));
    return cols;
  }, [customRoles]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return buildRows;
    const q = search.toLowerCase().trim();
    return buildRows.filter((r) => {
      const matchParent = r.featureLabel.toLowerCase().includes(q);
      const children = getChildRows(r.feature);
      const matchChild = children.some((c) => c.featureLabel.toLowerCase().includes(q));
      return matchParent || matchChild;
    });
  }, [buildRows, search]);

  const isModuleInPlan = (featureId: string): boolean =>
    planFeatureIds.includes(featureId);

  const canEditModulePermission = (featureId: string): boolean =>
    isSuperAdmin || isModuleInPlan(featureId);

  /** Primeira função selecionada (para exibir na tabela); alterações aplicam a todas as selecionadas */
  const primaryRoleId = selectedRoleIds.length > 0 ? selectedRoleIds[0] : (allColumns[0]?.id ?? 'admin');

  /** Retorna as flags de permissão atuais do módulo (Ver, Criar, Editar, Excluir) para a função selecionada */
  const getPermsForRow = (row: ModuleRowDef): Record<ActionKey, boolean> => {
    const role = primaryRoleId;
    if (customRoles.some((r) => r.id === role)) {
      const cr = customRoles.find((r) => r.id === role);
      const p = cr?.permissions?.find((x) => x.feature === row.feature);
      return p ? { can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete } : { can_view: false, can_create: false, can_edit: false, can_delete: false };
    }
    const p = systemPerms[role as SystemRole]?.[row.feature];
    return p ? { can_view: p.can_view ?? false, can_create: p.can_create ?? false, can_edit: p.can_edit ?? false, can_delete: p.can_delete ?? false } : { can_view: false, can_create: false, can_edit: false, can_delete: false };
  };

  /** Atualiza as flags de permissão do módulo para todas as funções selecionadas (permite marcar mais de uma) */
  const setPermFlags = (row: ModuleRowDef, value: Record<ActionKey, boolean>) => {
    if (!canEditModulePermission(row.feature)) return;
    const systemSelected = selectedRoleIds.filter((r) => SYSTEM_ROLES.includes(r as SystemRole));
    const customSelected = selectedRoleIds.filter((r) => customRoles.some((cr) => cr.id === r));
    if (systemSelected.length > 0) {
      setSystemPerms((prev) => {
        const next = { ...prev };
        systemSelected.forEach((role) => {
          next[role as SystemRole] = {
            ...next[role as SystemRole],
            [row.feature]: { ...value },
          };
        });
        return next;
      });
    }
    if (customSelected.length > 0) {
      setCustomRoles((prev) =>
        prev.map((r) => {
          if (!customSelected.includes(r.id)) return r;
          const perms = r.permissions.find((p) => p.feature === row.feature);
          if (!perms) {
            return { ...r, permissions: [...r.permissions, { feature: row.feature, ...value }] };
          }
          return { ...r, permissions: r.permissions.map((p) => (p.feature === row.feature ? { ...p, ...value } : p)) };
        })
      );
    }
  };

  const PERMISSION_FLAG_OPTIONS: { id: ActionKey; label: string }[] = [
    { id: 'can_view', label: 'Ver' },
    { id: 'can_create', label: 'Criar' },
    { id: 'can_edit', label: 'Editar' },
    { id: 'can_delete', label: 'Excluir' },
  ];

  const loadAll = async (targetClinicId: string) => {
    const [roleRes, customRolesRes, permsRes, subRes] = await Promise.all([
      supabase.from('clinic_role_permissions').select('*').eq('clinic_id', targetClinicId),
      supabase.from('clinic_custom_roles').select('id, name').eq('clinic_id', targetClinicId),
      supabase.from('clinic_custom_role_permissions').select('*'),
      supabase.from('subscriptions').select('plans(features)').eq('clinic_id', targetClinicId).maybeSingle(),
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
    if (!effectiveClinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadAll(effectiveClinicId).finally(() => setLoading(false));
  }, [effectiveClinicId]);

  useEffect(() => {
    if (selectedRoleIds.length === 0 && allColumns.length > 0) {
      setSelectedRoleIds([allColumns[0].id]);
    }
  }, [allColumns, selectedRoleIds.length]);

  const saveAll = async () => {
    const clinicIdsToSave = selectedClinicId ? [selectedClinicId] : clinicOptions.map((c) => c.id);
    if (clinicIdsToSave.length === 0) {
      toast.error('Selecione ao menos uma clínica.');
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast.error('Selecione ao menos uma função.');
      return;
    }
    setSaving(true);
    try {
      const allFeatureIds = PERMISSION_FEATURES.map((f) => f.id);
      const systemRolesToSave = selectedRoleIds.filter((r) => SYSTEM_ROLES.includes(r as SystemRole));
      for (const cid of clinicIdsToSave) {
        for (const role of systemRolesToSave) {
          const toUpsert = allFeatureIds.map((feature) => ({
            clinic_id: cid,
            role,
            feature,
            can_view: systemPerms[role as SystemRole]?.[feature]?.can_view ?? false,
            can_create: systemPerms[role as SystemRole]?.[feature]?.can_create ?? false,
            can_edit: systemPerms[role as SystemRole]?.[feature]?.can_edit ?? false,
            can_delete: systemPerms[role as SystemRole]?.[feature]?.can_delete ?? false,
          }));
          await supabase.from('clinic_role_permissions').upsert(toUpsert, { onConflict: 'clinic_id,role,feature' });
        }
      }
      const customRolesToSave = selectedRoleIds.filter((r) => customRoles.some((cr) => cr.id === r));
      if (customRolesToSave.length > 0 && effectiveClinicId && clinicIdsToSave.includes(effectiveClinicId)) {
        for (const cr of customRoles) {
          if (!customRolesToSave.includes(cr.id)) continue;
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
      }
      toast.success('Permissões salvas');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!effectiveClinicId && clinicOptions.length === 0) {
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
            <Label className="text-sm whitespace-nowrap">Função:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between h-9 font-normal" size="sm">
                  {selectedRoleIds.length ? `${selectedRoleIds.length} selecionada(s)` : 'Selecione'}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                {SYSTEM_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedRoleIds.includes(r)}
                      onCheckedChange={(c) =>
                        setSelectedRoleIds((prev) => (c ? [...prev, r] : prev.filter((id) => id !== r)))
                      }
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
                {customRoles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedRoleIds.includes(r.id)}
                      onCheckedChange={(c) =>
                        setSelectedRoleIds((prev) => (c ? [...prev, r.id] : prev.filter((id) => id !== r.id)))
                      }
                    />
                    {r.name} (personalizada)
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Clínica:</Label>
            <Select value={selectedClinicId || 'all'} onValueChange={(v) => setSelectedClinicId(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Clínica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as unidades</SelectItem>
                {clinicOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getClinicDisplayName(c)}
                  </SelectItem>
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
                  <TableHead className="min-w-[180px] font-semibold bg-muted/50">Permissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(filteredRows) ? filteredRows : []).map((row) => {
                  const canEdit = canEditModulePermission(row.feature);
                  const inPlan = isModuleInPlan(row.feature);
                  const children = getChildRows(row.feature);
                  const isExpanded = expandedParents[row.feature] ?? false;
                  const toggleExpand = () => setExpandedParents((p) => ({ ...p, [row.feature]: !p[row.feature] }));
                  return (
                    <Fragment key={row.feature}>
                      <TableRow className={!inPlan ? 'bg-muted/30' : undefined}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {children.length > 0 ? (
                              <button
                                type="button"
                                onClick={toggleExpand}
                                className="p-0.5 rounded hover:bg-muted/50 shrink-0"
                                aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                            ) : (
                              <span className="w-5 shrink-0" />
                            )}
                            {!inPlan && (
                              <Lock className="h-4 w-4 text-muted-foreground shrink-0" title="Módulo fora do plano da clínica" />
                            )}
                            {row.featureLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          {canEdit ? (
                            <PermFlagsPopover
                              row={row}
                              getPerms={getPermsForRow}
                              setPermFlags={setPermFlags}
                              flagOptions={PERMISSION_FLAG_OPTIONS}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
                              <Lock className="h-4 w-4 shrink-0" title="Sem este módulo no plano" />
                              Bloqueado
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded &&
                        children.map((child) => {
                          const childCanEdit = canEditModulePermission(child.feature);
                          const childInPlan = isModuleInPlan(child.feature);
                          return (
                            <TableRow
                              key={child.feature}
                              className={childInPlan ? 'bg-muted/10' : 'bg-muted/30'}
                            >
                              <TableCell className="font-medium pl-10">
                                <span className="flex items-center gap-2">
                                  <span className="w-5 shrink-0" />
                                  {!childInPlan && (
                                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" title="Módulo fora do plano da clínica" />
                                  )}
                                  {child.featureLabel}
                                </span>
                              </TableCell>
                              <TableCell>
                                {childCanEdit ? (
                                  <PermFlagsPopover
                                    row={child}
                                    getPerms={getPermsForRow}
                                    setPermFlags={setPermFlags}
                                    flagOptions={PERMISSION_FLAG_OPTIONS}
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
                                    <Lock className="h-4 w-4 shrink-0" title="Sem este módulo no plano" />
                                    Bloqueado
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </Fragment>
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
