import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  CircleDollarSign,
  Clock3,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useClinicProcedures,
  useClinicProcedureMutations,
} from '@/hooks/useClinicProcedures';
import {
  useProcedureMaterials,
  useProcedureMaterialMutations,
} from '@/hooks/useProcedureMaterials';
import { useInventoryProducts } from '@/hooks/useInventory';
import type {
  ClinicProcedure,
  ClinicProcedureInput,
  ProcedureBillingUnit,
} from '@/types/clinicProcedure';
import { CurrencyInput } from '@/components/ui/currency-input';
import { BILLING_UNIT_LABELS } from '@/types/clinicProcedure';
import { parseQuantityInput } from '@/lib/quantityInput';

const EMPTY_FORM: ClinicProcedureInput = {
  name: '',
  category: 'Odontologia',
  description: null,
  default_price: 0,
  duration_minutes: 30,
  billing_unit: 'appointment',
  default_commission: null,
  is_active: true,
};

function currency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Procedures() {
  const { isSuperAdmin } = useAuth();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { procedures, isLoading, error } = useClinicProcedures();
  const { createProcedure, updateProcedure } = useClinicProcedureMutations();
  const { replaceProcedureMaterials } = useProcedureMaterialMutations();
  const { activeProducts } = useInventoryProducts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClinicProcedure | null>(null);
  const [form, setForm] = useState<ClinicProcedureInput>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [materialRows, setMaterialRows] = useState<Array<{ key: string; productId: string; quantity: string }>>([]);
  const { materials: editingMaterials } = useProcedureMaterials(editing?.id);

  const canView = isSuperAdmin || can('procedimentos', 'can_view');
  const canCreate = isSuperAdmin || can('procedimentos', 'can_create');
  const canEdit = isSuperAdmin || can('procedimentos', 'can_edit');

  const categories = useMemo(
    () => Array.from(new Set(procedures.map((item) => item.category))).sort(),
    [procedures],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return procedures.filter((item) => {
      if (term && !`${item.name} ${item.category}`.toLowerCase().includes(term)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (status === 'active' && !item.is_active) return false;
      if (status === 'inactive' && item.is_active) return false;
      return true;
    });
  }, [procedures, search, category, status]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (!editing) {
      setMaterialRows([]);
      return;
    }
    setMaterialRows(
      editingMaterials.map((m) => ({
        key: m.id,
        productId: m.product_id,
        quantity: String(m.default_quantity).replace('.', ','),
      })),
    );
  }, [dialogOpen, editing, editingMaterials]);

  const openNew = () => {
    if (!canCreate) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setMaterialRows([]);
    setDialogOpen(true);
  };

  const openEdit = (procedure: ClinicProcedure) => {
    if (!canEdit) return;
    setEditing(procedure);
    setForm({
      name: procedure.name,
      category: procedure.category,
      description: procedure.description,
      default_price: procedure.default_price,
      duration_minutes: procedure.duration_minutes,
      billing_unit: procedure.billing_unit,
      default_commission: procedure.default_commission,
      is_active: procedure.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing && !canEdit) return;
    if (!editing && !canCreate) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim() || 'Outros',
      description: form.description?.trim() || null,
    };

    const materialItems: Array<{ productId: string; defaultQuantity: number }> = [];
    for (const row of materialRows) {
      if (!row.productId && !row.quantity.trim()) continue;
      if (!row.productId) {
        toast.error('Selecione o produto em todas as linhas de material');
        return;
      }
      const qty = parseQuantityInput(row.quantity);
      if (qty == null) {
        toast.error('Quantidade de material inválida. Use valores como 1 ou 0,2');
        return;
      }
      if (materialItems.some((item) => item.productId === row.productId)) {
        toast.error('Produto duplicado na composição. Remova a linha repetida.');
        return;
      }
      materialItems.push({ productId: row.productId, defaultQuantity: qty });
    }

    let procedureId = editing?.id;
    if (editing) {
      await updateProcedure.mutateAsync({ id: editing.id, ...payload });
    } else {
      const created = await createProcedure.mutateAsync(payload);
      procedureId = created?.id;
    }

    if (procedureId) {
      try {
        await replaceProcedureMaterials.mutateAsync({
          procedureId,
          items: materialItems,
        });
      } catch {
        // toast já tratado no hook
      }
    }
    setDialogOpen(false);
  };

  if (permissionsLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!canView) return <Navigate to="/app" replace />;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Procedimentos e preços</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre os serviços oferecidos pela clínica
            </p>
          </div>
          {canCreate && (
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" />
              Novo procedimento
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total', value: procedures.length, icon: Stethoscope, color: 'text-blue-600 bg-blue-50' },
            { label: 'Ativos', value: procedures.filter((p) => p.is_active).length, icon: CircleDollarSign, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Odontologia', value: procedures.filter((p) => p.category === 'Odontologia').length, icon: Stethoscope, color: 'text-sky-600 bg-sky-50' },
            { label: 'Estética', value: procedures.filter((p) => p.category === 'Estética').length, icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 pt-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar procedimento..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="lg:w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="lg:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}
              </div>
            ) : error ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Para visualizar e cadastrar procedimentos, execute primeiro o arquivo
                <code className="mx-1 font-semibold">supabase/PRODUCAO_09_CLINIC_PROCEDURES.sql</code>
                no SQL Editor do Supabase.
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum procedimento encontrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Comissão sugerida</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((procedure) => (
                      <TableRow key={procedure.id}>
                        <TableCell>
                          <p className="font-medium">{procedure.name}</p>
                          <p className="text-xs text-muted-foreground">
                            por {BILLING_UNIT_LABELS[procedure.billing_unit].toLowerCase()}
                          </p>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{procedure.category}</Badge></TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                            {procedure.duration_minutes} min
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{currency(procedure.default_price)}</TableCell>
                        <TableCell>{procedure.default_commission == null ? '—' : `${procedure.default_commission}%`}</TableCell>
                        <TableCell>
                          <Badge className={procedure.is_active ? 'bg-emerald-500' : 'bg-muted text-muted-foreground'}>
                            {procedure.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(procedure)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar {procedure.name}</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar procedimento' : 'Novo procedimento'}</DialogTitle>
            <DialogDescription>
              Cadastre preço e materiais sugeridos (odonto/estética). Na finalização a recepção confirma quantidade real (ml, un, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="procedure-name">Nome do procedimento</Label>
              <Input
                id="procedure-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Ex.: Toxina Botulínica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedure-category">Categoria</Label>
              <Input
                id="procedure-category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="Odontologia ou Estética"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedure-price">Preço padrão</Label>
              <CurrencyInput
                id="procedure-price"
                value={form.default_price}
                onValueChange={(value) => setForm({ ...form, default_price: value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedure-duration">Duração (minutos)</Label>
              <Input
                id="procedure-duration"
                type="number"
                min="5"
                step="5"
                value={form.duration_minutes}
                onChange={(event) => setForm({ ...form, duration_minutes: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade de cobrança</Label>
              <Select
                value={form.billing_unit}
                onValueChange={(value) => setForm({ ...form, billing_unit: value as ProcedureBillingUnit })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BILLING_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="procedure-commission">Comissão sugerida (%)</Label>
              <Input
                id="procedure-commission"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.default_commission ?? ''}
                onChange={(event) => setForm({
                  ...form,
                  default_commission: event.target.value === '' ? null : Number(event.target.value),
                })}
                placeholder="Opcional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="procedure-active">Procedimento ativo</Label>
              <Switch
                id="procedure-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="procedure-description">Descrição</Label>
              <Textarea
                id="procedure-description"
                value={form.description || ''}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Observações internas sobre o serviço"
              />
            </div>

            <div className="space-y-3 sm:col-span-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>Materiais sugeridos (composição)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ex.: Toxina Renova 0,2 ml, seringa 1 un. Pode ajustar na finalização.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMaterialRows((rows) => [
                      ...rows,
                      { key: crypto.randomUUID(), productId: '', quantity: '' },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Material
                </Button>
              </div>

              {activeProducts.length === 0 && (
                <p className="text-xs text-amber-700">
                  Cadastre produtos em Estoque para montar a composição.
                </p>
              )}

              {materialRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum material sugerido.</p>
              ) : (
                <div className="space-y-2">
                  {materialRows.map((row) => (
                    <div key={row.key} className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_auto]">
                      <Select
                        value={row.productId || undefined}
                        onValueChange={(productId) =>
                          setMaterialRows((rows) =>
                            rows.map((r) => (r.key === row.key ? { ...r, productId } : r)),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Produto / marca" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.unit || 'un'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        inputMode="decimal"
                        value={row.quantity}
                        onChange={(e) =>
                          setMaterialRows((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, quantity: e.target.value } : r,
                            ),
                          )
                        }
                        placeholder="Qtd (ex.: 0,2)"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setMaterialRows((rows) => rows.filter((r) => r.key !== row.key))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.name.trim()
                || createProcedure.isPending
                || updateProcedure.isPending
                || replaceProcedureMaterials.isPending
              }
            >
              Salvar procedimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
