import { useState, useMemo } from 'react';
import { Plus, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { PatientSearch } from '@/components/patients/PatientSearch';
import { PatientsList } from '@/components/patients/PatientsList';
import { PatientFormDialog } from '@/components/patients/PatientFormDialog';
import { PatientDetailsDialog } from '@/components/patients/PatientDetailsDialog';
import { WhatsAppConfirmationDialog } from '@/components/patients/WhatsAppConfirmationDialog';
import { usePatients, usePatientMutations, PatientData } from '@/hooks/usePatients';
import { useAppointments } from '@/hooks/useAppointments';
import { Skeleton } from '@/components/ui/skeleton';

// Transform DB patient to UI format
interface UIPatient {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  clinicalNotes: string;
  allergies: string[];
  createdAt: string;
  status: 'active' | 'inactive';
}

const transformPatient = (p: PatientData): UIPatient => ({
  id: p.id,
  name: p.name,
  cpf: p.cpf || '',
  phone: p.phone || '',
  email: p.email || '',
  address: p.address || '',
  birthDate: p.birth_date || '',
  clinicalNotes: p.clinical_notes || '',
  allergies: p.allergies || [],
  createdAt: p.created_at.split('T')[0],
  status: p.status as 'active' | 'inactive',
});

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UIPatient | null>(null);
  const [editingPatient, setEditingPatient] = useState<UIPatient | null>(null);

  const { patients: rawPatients, isLoading } = usePatients();
  const { appointments } = useAppointments();
  const { createPatient, updatePatient } = usePatientMutations();

  const patients = useMemo(() => rawPatients.map(transformPatient), [rawPatients]);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.cpf.includes(searchTerm) ||
        patient.phone.includes(searchTerm);
      
      const matchesStatus =
        statusFilter === 'all' || patient.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  // Get appointments for a specific patient
  const getPatientAppointments = (patientId: string) => {
    return appointments
      .filter((apt: any) => apt.patient_id === patientId)
      .map((apt: any) => ({
        id: apt.id,
        date: apt.date,
        time: apt.start_time?.slice(0, 5) || '',
        professional: apt.professional?.name || 'Profissional',
        procedure: apt.procedure,
        status: apt.status,
        notes: apt.notes,
        clinic: {
          id: apt.clinic_id,
          name: 'Clínica',
          address: '',
          phone: '',
          cnpj: '',
        },
      }));
  };

  const handleView = (patient: UIPatient) => {
    setSelectedPatient(patient);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (patient: UIPatient) => {
    setEditingPatient(patient);
    setFormDialogOpen(true);
  };

  const handleWhatsApp = (patient: UIPatient) => {
    setSelectedPatient(patient);
    setWhatsAppDialogOpen(true);
  };

  const handleNewPatient = () => {
    setEditingPatient(null);
    setFormDialogOpen(true);
  };

  const handleSave = async (patientData: any) => {
    if (patientData.id) {
      // Update existing patient
      await updatePatient.mutateAsync({
        id: patientData.id,
        name: patientData.name,
        cpf: patientData.cpf,
        phone: patientData.phone,
        email: patientData.email,
        address: patientData.address,
        birth_date: patientData.birthDate || null,
        clinical_notes: patientData.clinicalNotes,
        allergies: patientData.allergies,
        status: patientData.status,
      });
    } else {
      // Create new patient
      await createPatient.mutateAsync({
        name: patientData.name,
        cpf: patientData.cpf,
        phone: patientData.phone,
        email: patientData.email,
        address: patientData.address,
        birth_date: patientData.birthDate || null,
        clinical_notes: patientData.clinicalNotes,
        allergies: patientData.allergies,
        status: patientData.status,
      });
    }
  };

  const activeCount = patients.filter((p) => p.status === 'active').length;
  const inactiveCount = patients.filter((p) => p.status === 'inactive').length;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground">
              Gerencie os pacientes da clínica
            </p>
          </div>
          <Button onClick={handleNewPatient} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4 shadow-card border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{patients.length}</p>
                <p className="text-sm text-muted-foreground">Total de Pacientes</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg p-4 shadow-card border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Pacientes Ativos</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg p-4 shadow-card border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Pacientes Inativos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <PatientSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredPatients.length} de {patients.length} pacientes
        </p>

        {/* Patients List */}
        <PatientsList
          patients={filteredPatients}
          onView={handleView}
          onEdit={handleEdit}
          onWhatsApp={handleWhatsApp}
        />

        {/* Form Dialog */}
        <PatientFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          patient={editingPatient}
          onSave={handleSave}
        />

        {/* Details Dialog */}
        <PatientDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          patient={selectedPatient}
          appointments={selectedPatient ? getPatientAppointments(selectedPatient.id) : []}
        />

        {/* WhatsApp Confirmation Dialog */}
        <WhatsAppConfirmationDialog
          open={whatsAppDialogOpen}
          onOpenChange={setWhatsAppDialogOpen}
          patient={selectedPatient}
          appointments={selectedPatient ? getPatientAppointments(selectedPatient.id) : []}
        />
      </div>
    </MainLayout>
  );
};

export default Patients;
