export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  medicalLicense?: string;
  isVerified?: boolean; // Doctor verification status
  registrationDate: string;
}

export interface HeatmapPoint {
  x: number;      // percentage from left (0 - 100)
  y: number;      // percentage from top (0 - 100)
  radius: number; // radius in percentage
  weight: number; // intensity (0.1 - 1.0)
}

export interface ScanResult {
  id: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  imageUrl: string;
  predictedClass: string;
  acronym: string;
  confidence: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  explanation: string;
  clinicalDetails: string;
  heatmapPoints: HeatmapPoint[];
  timestamp: string;
  status: 'none' | 'pending_review' | 'reviewed';
  doctorVerdict?: {
    status: 'Agree' | 'Disagree' | 'Needs Biopsy' | 'Needs Follow-up';
    notes: string;
    reviewedAt: string;
    doctorId: string;
    doctorName: string;
  };
}

export interface Consultation {
  id: string;
  scanId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  message: string;
  status: 'requested' | 'scheduled' | 'completed';
  notes?: string;
  timestamp: string;
  preferredAt?: string;  // Date/time the patient requested
  scheduledAt?: string;  // Confirmed date/time set by the doctor
}

export interface InferenceLog {
  id: string;
  timestamp: string;
  modelName: string;
  patientId: string;
  imageSizeKb: number;
  durationMs: number;
  status: 'success' | 'failed';
  errorMessage?: string;
}