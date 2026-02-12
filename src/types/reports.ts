export interface ReportFilter {
  startDate: string;
  endDate: string;
  clinicId?: string;
  professionalId?: string;
  paymentMethod?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  byPaymentMethod: {
    method: string;
    total: number;
    count: number;
  }[];
  byPeriod: {
    period: string;
    revenue: number;
    expenses: number;
  }[];
}

export interface AppointmentSummary {
  totalAppointments: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  byProfessional: {
    professional: string;
    total: number;
    completed: number;
  }[];
  byProcedure: {
    procedure: string;
    count: number;
  }[];
}

export interface PatientSummary {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  patientsByMonth: {
    month: string;
    newPatients: number;
    totalAppointments: number;
  }[];
}

export interface ProductivityReport {
  professionalId: string;
  professionalName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  revenue: number;
  averagePerDay: number;
}
