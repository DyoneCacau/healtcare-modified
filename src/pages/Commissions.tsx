import { useState, useMemo } from 'react';
import {
  Plus,
  Settings,
  BarChart3,
  Filter,
  Building2,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { CommissionRulesList } from '@/components/commissions/CommissionRulesList';
import { CommissionRuleForm } from '@/components/commissions/CommissionRuleForm';
import { CommissionReport } from '@/components/commissions/CommissionReport';
import { CommissionRule } from '@/types/commission';
import { useClinic, useClinics } from '@/hooks/useClinic';
import { useCommissions, useCommissionRules, generateCommissionSummary } from '@/hooks/useCommissions';
import { useProfessionals } from '@/hooks/useProfessionals';
import { toast } from 'sonner';
import { FeatureButton } from '@/components/subscription/FeatureButton';
import { Skeleton } from '@/components/ui/skeleton';

export default function Commissions() {
  const { clinicId } = useClinic();
  const { clinics } = useClinics();
  const { commissions, isLoading } = useCommissions();
  const { professionals } = useProfessionals();
  const { rules, isLoading: isLoadingRules, addRule, updateRule, removeRule, toggleActive } = useCommissionRules();
  const [selectedClinic, setSelectedClinic] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [activeTab, setActiveTab] = useState('rules');

  const filteredRules = useMemo(() => {
    if (selectedClinic === 'all') return rules;
    return rules.filter((r) => r.clinicId === selectedClinic);
  }, [rules, selectedClinic]);

  const closeForm = () => {
    setFormOpen(false);
    setEditingRule(null);
  };

  // Mapa profissional id -> nome (para exibir no relatório)
  const professionalsByName = useMemo(() => {
    const map = new Map<string, string>();
    professionals.forEach((p: { id: string; name: string }) => map.set(p.id, p.name));
    return map;
  }, [professionals]);

  // Convert commissions from database to CommissionCalculation format
  const commissionCalculations = useMemo(() => {
    return commissions.map((c: { id: string; beneficiary_id: string; beneficiary_type: string; beneficiary_name?: string; appointment_id?: string; clinic_id: string; base_value?: number; percentage?: number; amount: number; created_at: string; status: string }) => {
      const beneficiaryName = c.beneficiary_name || professionalsByName.get(c.beneficiary_id) || 'Profissional';
      return {
        id: c.id,
        appointmentId: c.appointment_id || '',
        professionalId: c.beneficiary_id,
        professionalName: beneficiaryName,
        beneficiaryType: c.beneficiary_type as 'professional' | 'seller' | 'reception',
        beneficiaryId: c.beneficiary_id,
        beneficiaryName,
        clinicId: c.clinic_id,
        clinicName: '',
        procedure: '',
        serviceValue: c.base_value || 0,
        quantity: 1,
        commissionRuleId: '',
        calculationType: c.percentage ? 'percentage' as const : 'fixed' as const,
        calculationUnit: 'appointment' as const,
        ruleValue: c.percentage || c.amount,
        commissionAmount: c.amount,
        date: c.created_at.split('T')[0],
        status: c.status as 'pending' | 'paid',
      };
    });
  }, [commissions, professionalsByName]);

  const handleSaveRule = (ruleData: Omit<CommissionRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      updateRule.mutate(
        { id: editingRule.id, ...ruleData },
        { onSettled: () => closeForm() }
      );
    } else {
      addRule.mutate(ruleData, { onSettled: () => closeForm() });
    }
  };

  const handleEditRule = (rule: CommissionRule) => {
    setEditingRule(rule);
    setFormOpen(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    removeRule.mutate(ruleId);
  };

  const handleToggleActive = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) toggleActive.mutate({ ruleId, isActive: !rule.isActive });
  };

  const handleOpenNewRule = () => {
    setEditingRule(null);
    setFormOpen(true);
  };

  // Stats
  const stats = useMemo(() => {
    const activeRules = filteredRules.filter((r) => r.isActive).length;
    const percentageRules = filteredRules.filter((r) => r.calculationType === 'percentage').length;
    const fixedRules = filteredRules.filter((r) => r.calculationType === 'fixed').length;
    
    return {
      total: filteredRules.length,
      active: activeRules,
      inactive: filteredRules.length - activeRules,
      percentage: percentageRules,
      fixed: fixedRules,
    };
  }, [filteredRules]);

  if (isLoading || isLoadingRules) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comissões</h1>
            <p className="text-sm text-muted-foreground">
              Configure regras de comissionamento por profissional, procedimento e dia
            </p>
          </div>
          <FeatureButton feature="comissoes" onClick={handleOpenNewRule}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </FeatureButton>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtrar por:</span>
              </div>
              <div className="flex flex-1 gap-4">
                <div className="w-full sm:w-64">
                  <Select value={selectedClinic} onValueChange={setSelectedClinic}>
                    <SelectTrigger>
                      <Building2 className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Todas as clínicas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Clínicas</SelectItem>
                      {clinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Regras</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                  <Settings className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                  <p className="text-xl font-bold text-success">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inativas</p>
                  <p className="text-xl font-bold text-muted-foreground">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/10">
                  <Percent className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Percentuais</p>
                  <p className="text-xl font-bold text-info">{stats.percentage}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <BarChart3 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Fixo</p>
                  <p className="text-xl font-bold text-warning">{stats.fixed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="rules" className="gap-2">
              <Settings className="h-4 w-4" />
              Regras
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatório de Comissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Regras de Comissão</CardTitle>
              </CardHeader>
              <CardContent>
                <CommissionRulesList
                  rules={filteredRules}
                  onEdit={handleEditRule}
                  onDelete={handleDeleteRule}
                  onToggleActive={handleToggleActive}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            <CommissionReport
              calculations={commissionCalculations}
              professionals={professionals.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialog */}
      <CommissionRuleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSaveRule}
        editingRule={editingRule}
        selectedClinicId={selectedClinic !== 'all' ? selectedClinic : undefined}
      />
    </MainLayout>
  );
}
