import { Patient } from '@/types/patient';
import { PatientCard } from './PatientCard';
import { Users } from 'lucide-react';

interface PatientsListProps {
  patients: Patient[];
  onView: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onWhatsApp: (patient: Patient) => void;
}

export const PatientsList = ({ patients, onView, onEdit, onWhatsApp }: PatientsListProps) => {
  if (patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Nenhum paciente encontrado</h3>
        <p className="text-sm">Tente ajustar os filtros ou cadastre um novo paciente.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onView={onView}
          onEdit={onEdit}
          onWhatsApp={onWhatsApp}
        />
      ))}
    </div>
  );
};
