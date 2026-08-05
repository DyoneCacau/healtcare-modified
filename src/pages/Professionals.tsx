import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Stethoscope,
  Search,
  Plus,
  Edit,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Award,
} from 'lucide-react';
import { ProfessionalFormDialog } from '@/components/professionals/ProfessionalFormDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useClinic } from '@/hooks/useClinic';
import { useProfessionals } from '@/hooks/useProfessionals';
import { Skeleton } from '@/components/ui/skeleton';

interface Professional {
  id: string;
  name: string;
  specialty: string;
  cro: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  hire_date: string | null;
}

export default function Professionals() {
  const { clinicId } = useClinic();
  const { professionals, isLoading, refetch } = useProfessionals();
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  const specialties = useMemo(() => {
    const specs = new Set<string>();
    professionals.forEach((p) => specs.add(p.specialty));
    return Array.from(specs);
  }, [professionals]);

  const filteredProfessionals = useMemo(() => {
    return professionals.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cro.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSpecialty = specialtyFilter === 'all' || p.specialty === specialtyFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);
      return matchesSearch && matchesSpecialty && matchesStatus;
    });
  }, [professionals, searchTerm, specialtyFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: professionals.length,
      active: professionals.filter((p) => p.is_active).length,
      inactive: professionals.filter((p) => !p.is_active).length,
      specialties: specialties.length,
    }),
    [professionals, specialties]
  );

  const handleSaveProfessional = async (data: {
    id?: string;
    name: string;
    specialty: string;
    cro: string;
    email: string;
    phone: string;
    is_active: boolean;
    hire_date: string;
    additionalClinicIds?: string[];
    suppressSuccessToast?: boolean;
  }) => {
    const replicateToAdditionalClinics = async (excludeClinicId: string | null): Promise<string | null> => {
      const additionalClinicIds = (data.additionalClinicIds || []).filter((id) => id !== excludeClinicId);
      if (additionalClinicIds.length === 0) return null;

      const { error: additionalError } = await supabase.from('professionals').insert(
        additionalClinicIds.map((additionalClinicId) => ({
          clinic_id: additionalClinicId,
          name: data.name,
          specialty: data.specialty,
          cro: data.cro,
          email: data.email || null,
          phone: data.phone || null,
          is_active: data.is_active,
          hire_date: data.hire_date || null,
        }))
      );
      if (additionalError) {
        console.error(additionalError);
        return 'Houve erro ao replicar o profissional para as outras unidades selecionadas';
      }
      return null;
    };

    if (data.id) {
      const { error } = await supabase
        .from('professionals')
        .update({
          name: data.name,
          specialty: data.specialty,
          cro: data.cro,
          email: data.email || null,
          phone: data.phone || null,
          is_active: data.is_active,
          hire_date: data.hire_date || null,
        })
        .eq('id', data.id);

      if (error) {
        toast.error('Erro ao atualizar profissional');
        throw error;
      }

      const replicationError = await replicateToAdditionalClinics(clinicId);
      if (replicationError) {
        toast.error(replicationError);
        throw new Error(replicationError);
      }

      if (!data.suppressSuccessToast) {
        if (data.additionalClinicIds && data.additionalClinicIds.length > 0) {
          toast.success('Profissional atualizado e vinculado às novas unidades selecionadas!');
        } else {
          toast.success('Profissional atualizado com sucesso!');
        }
      }
      await refetch();
    } else {
      if (!clinicId) {
        toast.error('Clinica nao encontrada');
        throw new Error('Clínica não encontrada');
      }

      const { error } = await supabase.from('professionals').insert({
        clinic_id: clinicId,
        name: data.name,
        specialty: data.specialty,
        cro: data.cro,
        email: data.email || null,
        phone: data.phone || null,
        is_active: data.is_active,
        hire_date: data.hire_date || null,
      });

      if (error) {
        toast.error('Erro ao cadastrar profissional');
        console.error(error);
        throw error;
      }

      // Replica o cadastro nas demais unidades marcadas, sem precisar repetir manualmente
      const additionalClinicIds = (data.additionalClinicIds || []).filter((id) => id !== clinicId);
      const replicationError = await replicateToAdditionalClinics(clinicId);
      if (replicationError) {
        toast.error(`Profissional cadastrado, mas ${replicationError.toLowerCase()}`);
      } else if (additionalClinicIds.length > 0) {
        toast.success(`Profissional cadastrado nesta clínica e em mais ${additionalClinicIds.length} clínica(s)!`);
      } else {
        toast.success('Profissional cadastrado com sucesso!');
      }
      await refetch();
    }
  };

  const handleToggleStatus = async (professional: Professional) => {
    const { error } = await supabase
      .from('professionals')
      .update({ is_active: !professional.is_active })
      .eq('id', professional.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(
        `Profissional ${professional.is_active ? 'desativado' : 'ativado'} com sucesso!`
      );
      await refetch();
      setDetailsOpen(false);
    }
  };

  const handleViewDetails = (professional: Professional) => {
    setSelectedProfessional(professional);
    setDetailsOpen(true);
  };

  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormOpen(true);
    setDetailsOpen(false);
  };

  const handleNewProfessional = () => {
    setEditingProfessional(null);
    setFormOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (!clinicId) {
    return (
      <>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Selecione uma clínica no menu lateral para gerenciar profissionais.
        </div>
      </>
    );
  }

  if (isLoading && professionals.length === 0) {
    return (
      <>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Profissionais</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />
              Profissionais
            </h1>
            <p className="text-muted-foreground">Gerencie os profissionais da clínica</p>
          </div>
          <Button onClick={handleNewProfessional}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Profissional
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Stethoscope className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <UserCheck className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Especialidades</p>
                  <p className="text-2xl font-bold">{stats.specialties}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CRO..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Especialidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Professionals Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfessionals.map((professional) => (
            <Card
              key={professional.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !professional.is_active ? 'opacity-60' : ''
              }`}
              onClick={() => handleViewDetails(professional)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {getInitials(professional.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{professional.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {professional.specialty}
                        </p>
                      </div>
                      <Badge variant={professional.is_active ? 'default' : 'secondary'}>
                        {professional.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Award className="h-3.5 w-3.5" />
                        CRO: {professional.cro}
                      </p>
                      {professional.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          {professional.phone}
                        </p>
                      )}
                      {professional.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          {professional.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredProfessionals.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum profissional encontrado
            </div>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Detalhes do Profissional
            </DialogTitle>
          </DialogHeader>

          {selectedProfessional && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(selectedProfessional.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedProfessional.name}</h3>
                  <p className="text-muted-foreground">{selectedProfessional.specialty}</p>
                  <Badge
                    variant={selectedProfessional.is_active ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {selectedProfessional.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">CRO</Label>
                  <p className="font-medium">{selectedProfessional.cro}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data de Contratação</Label>
                  <p className="font-medium">
                    {selectedProfessional.hire_date
                      ? format(new Date(selectedProfessional.hire_date), 'dd/MM/yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{selectedProfessional.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedProfessional.email || '-'}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => selectedProfessional && handleToggleStatus(selectedProfessional)}
            >
              {selectedProfessional?.is_active ? 'Desativar' : 'Ativar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!selectedProfessional) return;
                setEditingProfessional(selectedProfessional);
                setFormOpen(true);
                setDetailsOpen(false);
              }}
            >
              Horários de atendimento
            </Button>
            <Button onClick={() => selectedProfessional && handleEdit(selectedProfessional)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <ProfessionalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        currentClinicId={clinicId}
        professional={
          editingProfessional
            ? {
                id: editingProfessional.id,
                name: editingProfessional.name,
                specialty: editingProfessional.specialty,
                cro: editingProfessional.cro,
                email: editingProfessional.email || '',
                phone: editingProfessional.phone || '',
                is_active: editingProfessional.is_active,
                hire_date: editingProfessional.hire_date || new Date().toISOString().split('T')[0],
              }
            : null
        }
        onSave={handleSaveProfessional}
      />
    </>
  );
}
