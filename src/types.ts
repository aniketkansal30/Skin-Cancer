export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  medicalLicense?: string;
  isVerified?: boolean; // Doctor verification status
  registrationDate: string;
  age?: number;
  gender?: string;
  phone?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  specialty?: string;
  clinicName?: string;
  dob?: string;          // Date of Birth
  avatarUrl?: string;    // Profile photo URL
}

export interface HeatmapPoint {
  x: number;      // percentage from left (0 - 100)
  y: number;      // percentage from top (0 - 100)
  radius: number; // radius in percentage
  weight: number; // intensity (0.1 - 1.0)
}

// NEW — SHAP/LIME-style explainability breakdown
export interface ContributingFactor {
  label: string;
  weight: number; // 0-100
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
  // NEW fields (all optional — old rows without them keep working)
  bodyLocation?: string;              // e.g. "Left Forearm", from BodyMapSelector
  lesionId?: string;                  // links this scan to a tracked lesion over time
  uncertaintyScore?: number;          // 0-1, higher = model less certain
  needsMandatoryReview?: boolean;     // true if uncertainty is high despite confidence
  contributingFactors?: ContributingFactor[]; // explainability breakdown
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

// NEW — a tracked lesion (groups multiple scans of the same mole over time)
export interface Lesion {
  id: string;
  patientId: string;
  bodyLocation: string;
  nickname?: string;
  createdAt: string;
}

// NEW — doctor-to-doctor referral
export interface Referral {
  id: string;
  scanId: string;
  referringDoctorId: string;
  referredToDoctorId: string;
  reason?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}