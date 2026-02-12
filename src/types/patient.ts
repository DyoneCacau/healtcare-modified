export interface Patient {
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

export interface Appointment {
  id: string;
  date: string;
  time: string;
  professional: string;
  procedure: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export interface PatientHistory {
  appointments: Appointment[];
  financialBalance: number;
  lastVisit: string | null;
  totalAppointments: number;
}
