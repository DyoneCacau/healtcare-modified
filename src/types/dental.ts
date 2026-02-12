export type ToothStatus = 
  | 'healthy'        // Saudável
  | 'treated'        // Tratado
  | 'pending'        // Pendente de tratamento
  | 'extracted'      // Extraído
  | 'prosthesis'     // Prótese
  | 'implant'        // Implante
  | 'cavity'         // Cárie
  | 'root_canal';    // Canal

export interface ToothRecord {
  number: number;
  status: ToothStatus;
  procedures: ToothProcedure[];
  notes?: string;
}

export interface ToothProcedure {
  id: string;
  date: string;
  procedure: string;
  professional: string;
  status: 'completed' | 'pending' | 'scheduled';
  notes?: string;
  appointmentId?: string | null;
}

export interface DentalChart {
  patientId: string;
  teeth: Record<number, ToothRecord>;
  lastUpdate: string;
  generalNotes?: string;
}

// Permanent teeth numbering (FDI notation)
// Upper right: 18-11, Upper left: 21-28
// Lower left: 38-31, Lower right: 41-48
export const ADULT_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [38, 37, 36, 35, 34, 33, 32, 31],
  lowerRight: [41, 42, 43, 44, 45, 46, 47, 48],
};

export const TOOTH_STATUS_CONFIG: Record<ToothStatus, { label: string; color: string; bgColor: string }> = {
  healthy: { label: 'Saudável', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  treated: { label: 'Tratado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  pending: { label: 'Pendente', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  extracted: { label: 'Extraído', color: 'text-gray-700', bgColor: 'bg-gray-300' },
  prosthesis: { label: 'Prótese', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  implant: { label: 'Implante', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  cavity: { label: 'Cárie', color: 'text-red-700', bgColor: 'bg-red-100' },
  root_canal: { label: 'Canal', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};
