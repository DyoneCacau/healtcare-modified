import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Package, Edit, Trash2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  max_users: number | null;
  max_patients: number | null;
  features: string[];
  is_active: boolean;
  discount_pix_percent?: number | null;
  promo_price_monthly?: number | null;
  promo_active?: boolean | null;
  promo_label?: string | null;
}

const AVAILABLE_MODULES = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'pacientes_basico', label: 'Pacientes (Básico)' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'financeiro_basico', label: 'Financeiro (Básico)' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'profissionais', label: 'Profissionais' },
  { key: 'comissoes', label: 'Comissões' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'termos', label: 'Termos e Contratos' },
  { key: 'administracao', label: 'Administracao' },
  { key: 'ponto', label: 'Ponto Eletrônico' },
  { key: 'multi_clinica', label: 'Multi-Clínica' },
];

export function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price_monthly: "",
    price_yearly: "",
    max_users: "",
    max_patients: "",
    features: [] as string[],
    is_active: true,
    discount_pix_percent: "",
    promo_price_monthly: "",
    promo_active: false,
    promo_label: "",
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      setPlans(data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features as string || '[]'),
      })));
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setIsLoading(false);
    }
  }

  function openEditDialog(plan: Plan) {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      price_monthly: String(plan.price_monthly),
      price_yearly: plan.price_yearly ? String(plan.price_yearly) : "",
      max_users: plan.max_users ? String(plan.max_users) : "",
      max_patients: plan.max_patients ? String(plan.max_patients) : "",
      features: plan.features,
      is_active: plan.is_active,
      discount_pix_percent: plan.discount_pix_percent ? String(plan.discount_pix_percent) : "",
      promo_price_monthly: plan.promo_price_monthly ? String(plan.promo_price_monthly) : "",
      promo_active: !!plan.promo_active,
      promo_label: plan.promo_label || "",
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingPlan(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      price_monthly: "",
      price_yearly: "",
      max_users: "",
      max_patients: "",
      features: [],
      is_active: true,
      discount_pix_percent: "",
      promo_price_monthly: "",
      promo_active: false,
      promo_label: "",
    });
    setIsDialogOpen(true);
  }

  async function handleSave() {
    try {
      const planData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        price_monthly: parseFloat(formData.price_monthly) || 0,
        price_yearly: formData.price_yearly ? parseFloat(formData.price_yearly) : null,
        max_users: formData.max_users ? parseInt(formData.max_users) : null,
        max_patients: formData.max_patients ? parseInt(formData.max_patients) : null,
        features: formData.features,
        is_active: formData.is_active,
        discount_pix_percent: formData.discount_pix_percent ? parseFloat(formData.discount_pix_percent) : 0,
        promo_price_monthly: formData.promo_price_monthly ? parseFloat(formData.promo_price_monthly) : null,
        promo_active: formData.promo_active,
        promo_label: formData.promo_label || null,
      };

      if (editingPlan) {
        const { data, error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id)
          .select('id');

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Sem permissão para atualizar o plano (RLS).');
        }
        toast.success('Plano atualizado!');
      } else {
        const { error } = await supabase.from('plans').insert(planData);
        if (error) throw error;
        toast.success('Plano criado!');
      }

      setIsDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) return;

    try {
      const { error } = await supabase.from('plans').delete().eq('id', plan.id);
      if (error) throw error;
      toast.success('Plano excluído!');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    }
  }

  function toggleFeature(feature: string) {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Planos da Plataforma
        </h2>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(plan)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {!plan.is_active && (
                <Badge variant="outline" className="w-fit">Inativo</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold">
                    {plan.promo_active && plan.promo_price_monthly ? (
                      <>
                        <span className="line-through text-muted-foreground text-base mr-2">
                          R$ {plan.price_monthly.toFixed(2)}
                        </span>
                        R$ {plan.promo_price_monthly.toFixed(2)}
                      </>
                    ) : (
                      <>R$ {plan.price_monthly.toFixed(2)}</>
                    )}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  {plan.price_yearly && (
                    <p className="text-sm text-muted-foreground">
                      ou R$ {plan.price_yearly.toFixed(2)}/ano
                    </p>
                  )}
                  {plan.discount_pix_percent && plan.discount_pix_percent > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      Desconto Pix: {plan.discount_pix_percent}% off
                    </p>
                  )}
                  {plan.promo_active && plan.promo_label && (
                    <p className="text-xs text-amber-600 mt-1">
                      {plan.promo_label}
                    </p>
                  )}
                </div>
                
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}

                <div className="flex flex-wrap gap-1">
                  {plan.features.slice(0, 4).map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {AVAILABLE_MODULES.find(m => m.key === feature)?.label || feature}
                    </Badge>
                  ))}
                  {plan.features.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{plan.features.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes e módulos do plano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Plano Premium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Ex: premium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do plano..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Preço Mensal (R$) *</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                  placeholder="99.90"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_yearly">Preço Anual (R$)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  step="0.01"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                  placeholder="999.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users">Limite de Usuários</Label>
                <Input
                  id="max_users"
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_patients">Limite de Pacientes</Label>
                <Input
                  id="max_patients"
                  type="number"
                  value={formData.max_patients}
                  onChange={(e) => setFormData({ ...formData, max_patients: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Módulos Incluídos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AVAILABLE_MODULES.map((module) => (
                  <div
                    key={module.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      formData.features.includes(module.key)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleFeature(module.key)}
                  >
                    <input
                      type="checkbox"
                      checked={formData.features.includes(module.key)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleFeature(module.key)}
                      className="rounded"
                    />
                    <span className="text-sm">{module.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_pix_percent">Desconto Pix (%)</Label>
                <Input
                  id="discount_pix_percent"
                  type="number"
                  step="0.01"
                  value={formData.discount_pix_percent}
                  onChange={(e) => setFormData({ ...formData, discount_pix_percent: e.target.value })}
                  placeholder="Ex: 10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_price_monthly">Preço Promocional (R$)</Label>
                <Input
                  id="promo_price_monthly"
                  type="number"
                  step="0.01"
                  value={formData.promo_price_monthly}
                  onChange={(e) => setFormData({ ...formData, promo_price_monthly: e.target.value })}
                  placeholder="Ex: 199.90"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.promo_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, promo_active: checked })}
                />
                <Label>Promoção ativa</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_label">Label da Promoção</Label>
                <Input
                  id="promo_label"
                  value={formData.promo_label}
                  onChange={(e) => setFormData({ ...formData, promo_label: e.target.value })}
                  placeholder="Ex: Oferta por tempo limitado"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Plano ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.slug}>
              {editingPlan ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
