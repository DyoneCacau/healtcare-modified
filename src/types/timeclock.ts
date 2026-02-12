export interface TimeClockEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: 'professional' | 'reception' | 'seller' | 'admin';
  clinicId: string;
  clinicName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  lunchStart?: string;
  lunchEnd?: string;
  totalHours?: number;
  status: 'working' | 'lunch' | 'completed';
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface TimeSheet {
  userId: string;
  userName: string;
  userRole: string;
  period: {
    start: string;
    end: string;
  };
  entries: TimeClockEntry[];
  summary: {
    totalDays: number;
    totalHours: number;
    averageHoursPerDay: number;
    lateArrivals: number;
    earlyDepartures: number;
  };
}

export const userRoleLabels: Record<TimeClockEntry['userRole'], string> = {
  professional: 'Profissional',
  reception: 'Recepção',
  seller: 'Vendedor',
  admin: 'Administrador',
};
