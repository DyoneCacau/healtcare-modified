export interface ConsentTerm {
  id: string;
  clinicId: string;
  title: string;
  content: string;
  type: 'consent' | 'awareness' | 'authorization' | 'treatment';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicBranding {
  clinicId: string;
  logo?: string;
  headerText?: string;
  footerText?: string;
  primaryColor?: string;
}

export interface SignedTerm {
  id: string;
  termId: string;
  patientId: string;
  patientName: string;
  signedAt: string;
  signedBy: string; // receptionist name
  clinicId: string;
}
