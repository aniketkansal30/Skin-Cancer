// Custom high-fidelity mock Supabase client for DermShield AI in AI Studio
// This proxies key operations directly to the Express server's REST API endpoints (db.json)
// and handles auxiliary tables in local storage, facilitating seamless client-server sync.

import { Session } from "@supabase/supabase-js";

// Setup global auth event listeners
const authListeners: ((event: string, session: Session | null) => void)[] = [];

// Setup global channel subscriptions for real-time notifications
const globalChannels: Record<string, any> = {};

// Seed fallback data for client-only static hosting environments (e.g. Vercel)
const DEFAULT_FALLBACK_SCANS = [
  {
    id: "scan-1",
    patientId: "u-patient-1",
    patientName: "Aniket Kansal",
    patientAge: 24,
    patientGender: "Male",
    imageUrl: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=600",
    predictedClass: "Melanoma",
    acronym: "MEL",
    confidence: 89.4,
    riskLevel: "High",
    explanation: "The Swish-activated CNN+ViT ensemble detected pronounced structural asymmetry (A score: 1.8), marked border irregularity (B score: 2.1), and multi-colored variegation (C score: 3.2). Additionally, high-intensity local activation of the Vision Transformer self-attention maps points heavily to an atypical pigment network near the upper margin.",
    clinicalDetails: "Atypical melanocytic lesion showing dynamic asymmetry and jagged borders. Grad-CAM shows localized hyper-activation (hotspot weight: 0.95) corresponding to standard Fitzpatrick type II presentation of evolving superficial spreading melanoma. Recommend immediate excisional biopsy with 5mm margins.",
    heatmapPoints: [
      { x: 48, y: 52, radius: 25, weight: 0.95 },
      { x: 42, y: 48, radius: 15, weight: 0.82 },
      { x: 55, y: 56, radius: 20, weight: 0.76 }
    ],
    timestamp: new Date("2026-07-01T15:20:00Z").toISOString(),
    status: "pending_review"
  },
  {
    id: "scan-2",
    patientId: "u-patient-1",
    patientName: "Aniket Kansal",
    patientAge: 24,
    patientGender: "Male",
    imageUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600",
    predictedClass: "Melanocytic Nevus",
    acronym: "NV",
    confidence: 97.2,
    riskLevel: "Low",
    explanation: "The neural network shows high confidence (97.2%) for a completely benign melanocytic nevus. On-screen features demonstrate excellent radial symmetry, sharp well-defined borders, and uniform brown pigment network distribution.",
    clinicalDetails: "Symmetrical dermoscopic structure. No atypical pigment networks, regression structures, or blue-white veils identified. Regular benign nevus pattern. Grad-CAM activations are uniformly spread with low concentration peak.",
    heatmapPoints: [
      { x: 50, y: 50, radius: 15, weight: 0.45 }
    ],
    timestamp: new Date("2026-06-15T11:10:00Z").toISOString(),
    status: "reviewed",
    doctorVerdict: {
      status: "Agree",
      notes: "Typical benign compound nevus. Symmetrical. No follow-up or biopsy required unless patient reports rapid changes or itching. Advised annual skin self-checks using ABCDE criteria.",
      reviewedAt: new Date("2026-06-16T10:00:00Z").toISOString(),
      doctorId: "u-doctor-1",
      doctorName: "Dr. Sarah Jenkins, MD"
    }
  }
];

const DEFAULT_FALLBACK_PROFILES = [
  {
    id: "u-patient-1",
    email: "patient@dermshield.com",
    role: "patient",
    name: "Aniket Kansal",
    registrationDate: new Date("2026-01-10T10:00:00Z").toISOString()
  },
  {
    id: "u-doctor-1",
    email: "doctor@dermshield.com",
    role: "doctor",
    name: "Dr. Sarah Jenkins, MD",
    medicalLicense: "LIC-88291-DERM",
    isVerified: true,
    registrationDate: new Date("2026-01-05T09:00:00Z").toISOString()
  },
  {
    id: "u-admin-1",
    email: "admin@dermshield.com",
    role: "admin",
    name: "Platform Administrator",
    registrationDate: new Date("2026-01-01T08:00:00Z").toISOString()
  }
];

const DEFAULT_FALLBACK_CONSULTATIONS = [
  {
    id: "c-1",
    scanId: "scan-1",
    patientId: "u-patient-1",
    patientName: "Aniket Kansal",
    doctorId: "u-doctor-1",
    doctorName: "Dr. Sarah Jenkins, MD",
    message: "Please review my upper back scan result. The AI predicted Melanoma with High Risk and I am very concerned.",
    status: "requested",
    timestamp: new Date("2026-07-01T15:25:00Z").toISOString()
  }
];

// Helper to get active session from localStorage
function getLocalSession(): any {
  const sessionData = localStorage.getItem("dermshield_session");
  if (!sessionData) return null;
  try {
    return JSON.parse(sessionData);
  } catch {
    return null;
  }
}

// Helper to set active session in localStorage
function setLocalSession(session: any) {
  if (session) {
    localStorage.setItem("dermshield_session", JSON.stringify(session));
  } else {
    localStorage.removeItem("dermshield_session");
  }
}

// Map database row schemas from local backend camelCase to Supabase snake_case
function mapScanToSnake(s: any): any {
  return {
    id: s.id,
    patient_id: s.patientId,
    patient_name: s.patientName,
    patient_age: s.patientAge,
    patient_gender: s.patientGender,
    image_url: s.imageUrl,
    predicted_class: s.predictedClass,
    acronym: s.acronym,
    confidence: s.confidence,
    risk_level: s.riskLevel,
    explanation: s.explanation,
    clinical_details: s.clinicalDetails,
    heatmap_points: s.heatmapPoints,
    created_at: s.timestamp,
    status: s.status,
    doctor_verdict: s.doctorVerdict,
    body_location: s.bodyLocation,
    lesion_id: s.lesionId,
    uncertainty_score: s.uncertaintyScore,
    needs_mandatory_review: s.needsMandatoryReview,
    contributing_factors: s.contributingFactors
  };
}

function mapUserToSnake(u: any): any {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    name: u.name,
    medical_license: u.medicalLicense,
    is_verified: u.isVerified,
    registration_date: u.registrationDate
  };
}

function mapConsultationToSnake(c: any): any {
  return {
    id: c.id,
    scan_id: c.scanId,
    patient_id: c.patientId,
    patient_name: c.patientName,
    doctor_id: c.doctorId,
    doctor_name: c.doctorName,
    message: c.message,
    status: c.status,
    notes: c.notes,
    created_at: c.timestamp,
    preferred_at: c.preferredAt,
    scheduled_at: c.scheduledAt
  };
}

class SupabaseQueryBuilder {
  private tableName: string;
  private filters: { field: string; value: any }[] = [];
  private orderField: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = "*", options?: any) {
    // We fetch everything and filter/slice in memory
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, value });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async execute() {
    let data: any[] = [];

    const getLocalFallback = (table: string, defaults: any[]) => {
      const key = `dermshield_local_table_${table}`;
      const local = localStorage.getItem(key);
      if (local) {
        try {
          return JSON.parse(local);
        } catch {
          // ignore
        }
      }
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    };

    try {
      if (this.tableName === "scans") {
        try {
          const res = await fetch("/api/scans");
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const scans = await res.json();
            data = scans.map(mapScanToSnake);
            // Sync to local fallback to keep it up to date
            localStorage.setItem("dermshield_local_table_scans", JSON.stringify(scans));
          } else {
            throw new Error("Invalid response or non-JSON");
          }
        } catch {
          const rawScans = getLocalFallback("scans", DEFAULT_FALLBACK_SCANS);
          data = rawScans.map(mapScanToSnake);
        }
      } else if (this.tableName === "profiles") {
        try {
          const res = await fetch("/api/admin/users");
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const users = await res.json();
            data = users.map(mapUserToSnake);
            localStorage.setItem("dermshield_local_table_profiles", JSON.stringify(users));
          } else {
            throw new Error("Invalid response or non-JSON");
          }
        } catch {
          const rawProfiles = getLocalFallback("profiles", DEFAULT_FALLBACK_PROFILES);
          data = rawProfiles.map(mapUserToSnake);
        }
      } else if (this.tableName === "consultations") {
        try {
          const res = await fetch("/api/consultations");
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("application/json")) {
            const consults = await res.json();
            data = consults.map(mapConsultationToSnake);
            localStorage.setItem("dermshield_local_table_consultations", JSON.stringify(consults));
          } else {
            throw new Error("Invalid response or non-JSON");
          }
        } catch {
          const rawConsults = getLocalFallback("consultations", DEFAULT_FALLBACK_CONSULTATIONS);
          data = rawConsults.map(mapConsultationToSnake);
        }
      } else {
        // Fallback for auxiliary tables (lesions, referrals, inference_logs)
        const localData = localStorage.getItem(`dermshield_table_${this.tableName}`);
        data = localData ? JSON.parse(localData) : [];
      }
    } catch (err) {
      console.error(`Error loading mock table ${this.tableName}:`, err);
    }

    // Apply exact match filters
    for (const f of this.filters) {
      data = data.filter(item => {
        const itemValue = item[f.field];
        if (itemValue === undefined) return true;
        return String(itemValue).toLowerCase() === String(f.value).toLowerCase();
      });
    }

    // Apply sorting
    if (this.orderField) {
      const f = this.orderField;
      data.sort((a, b) => {
        const valA = a[f] || "";
        const valB = b[f] || "";
        if (valA < valB) return this.orderAscending ? -1 : 1;
        if (valA > valB) return this.orderAscending ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      data = data.slice(0, this.limitCount);
    }

    return { data, error: null, count: data.length };
  }

  // Thenable implementation to allow direct await on the builder
  then(onfulfilled?: (value: any) => any, onrejected?: (error: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  // Chainable helper for single row requests
  async single() {
    const res = await this.execute();
    return { data: res.data[0] || null, error: res.data[0] ? null : { message: "Not found" } };
  }

  // Insert operation
  async insert(rowOrRows: any) {
    const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    const results: any[] = [];

    const getLocalFallback = (table: string, defaults: any[]) => {
      const key = `dermshield_local_table_${table}`;
      const local = localStorage.getItem(key);
      if (local) {
        try { return JSON.parse(local); } catch {}
      }
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    };

    for (const row of rows) {
      try {
        if (this.tableName === "scans") {
          // Send to the Express prediction route
          const camelRow = {
            imageBase64: row.image_url,
            patientId: row.patient_id,
            patientName: row.patient_name,
            patientAge: row.patient_age,
            patientGender: row.patient_gender,
            bodyLocation: row.body_location,
            lesionId: row.lesion_id,
            uncertaintyScore: row.uncertainty_score,
            needsMandatoryReview: row.needs_mandatory_review,
            contributingFactors: row.contributing_factors
          };

          try {
            const res = await fetch("/api/predict", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(camelRow)
            });

            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
              const newScan = await res.json();
              results.push(mapScanToSnake(newScan));
              
              // Save to local storage cache
              const currentList = getLocalFallback("scans", DEFAULT_FALLBACK_SCANS);
              currentList.push(newScan);
              localStorage.setItem("dermshield_local_table_scans", JSON.stringify(currentList));
            } else {
              throw new Error("Prediction API failed, using local model simulation");
            }
          } catch (err) {
            // Local simulation fallback
            console.warn("Prediction API failed, simulating locally:", err);
            
            // Generate a simulated model prediction
            const predictedClasses = [
              { name: "Melanoma", acronym: "MEL", risk: "High", desc: "Pronounced structural asymmetry and vision transformer activation maps highlight deep irregular margins. Recommend biopsy." },
              { name: "Melanocytic Nevus", acronym: "NV", risk: "Low", desc: "Benign symmetrical lesion with well-defined borders and regular pigmentation." },
              { name: "Basal Cell Carcinoma", acronym: "BCC", risk: "Medium", desc: "Pearly nodule or pink patch with arborizing telangiectasia." },
              { name: "Squamous Cell Carcinoma", acronym: "SCC", risk: "High", desc: "Scaly or crusted firm red lesion with elevated margins." }
            ];
            
            // Make a random choice
            const randomPick = predictedClasses[Math.floor(Math.random() * predictedClasses.length)];
            const id = "scan-" + Math.random().toString(36).substring(2, 9);
            const mockScan = {
              id,
              patientId: row.patient_id || "anonymous",
              patientName: row.patient_name || "Guest Patient",
              patientAge: Number(row.patient_age) || 24,
              patientGender: row.patient_gender || "Male",
              imageUrl: row.image_url,
              predictedClass: randomPick.name,
              acronym: randomPick.acronym,
              confidence: Number((80 + Math.random() * 19).toFixed(1)),
              riskLevel: randomPick.risk,
              explanation: `The simulated CNN+Vision Transformer ensemble model identified characteristics suggestive of ${randomPick.name}. ${randomPick.desc}`,
              clinicalDetails: `Atypical cutaneous presentation. Grad-CAM overlay activates around key cellular regions. Conf = ${(80 + Math.random() * 19).toFixed(1)}%.`,
              heatmapPoints: [
                { x: Math.floor(40 + Math.random() * 20), y: Math.floor(40 + Math.random() * 20), radius: 20, weight: 0.85 }
              ],
              timestamp: new Date().toISOString(),
              status: "pending_review",
              bodyLocation: row.body_location || "Chest",
              lesionId: row.lesion_id || "lesion-new",
              uncertaintyScore: Number((Math.random() * 15).toFixed(1)),
              needsMandatoryReview: randomPick.risk === "High",
              contributingFactors: { asymmetry: "Low", border: "Medium", color: "Medium" }
            };

            const currentList = getLocalFallback("scans", DEFAULT_FALLBACK_SCANS);
            currentList.push(mockScan);
            localStorage.setItem("dermshield_local_table_scans", JSON.stringify(currentList));

            results.push(mapScanToSnake(mockScan));
          }
        } else if (this.tableName === "consultations") {
          const camelRow = {
            scanId: row.scan_id,
            patientId: row.patient_id,
            patientName: row.patient_name,
            doctorId: row.doctor_id,
            doctorName: row.doctor_name,
            message: row.message,
            preferredAt: row.preferred_at
          };

          try {
            const res = await fetch("/api/consultations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(camelRow)
            });

            const contentType = res.headers.get("content-type") || "";
            if (res.ok && contentType.includes("application/json")) {
              const newConsult = await res.json();
              results.push(mapConsultationToSnake(newConsult));

              const currentList = getLocalFallback("consultations", DEFAULT_FALLBACK_CONSULTATIONS);
              currentList.push(newConsult);
              localStorage.setItem("dermshield_local_table_consultations", JSON.stringify(currentList));
            } else {
              throw new Error("Consultation API failed");
            }
          } catch (err) {
            console.warn("Consultation API failed, scheduling locally:", err);
            const id = "consult-" + Math.random().toString(36).substring(2, 9);
            const mockConsult = {
              id,
              scanId: row.scan_id,
              patientId: row.patient_id || "anonymous",
              patientName: row.patient_name || "Guest Patient",
              doctorId: row.doctor_id || "u-doctor-1",
              doctorName: row.doctor_name || "Dr. Sarah Jenkins, MD",
              message: row.message,
              status: "requested",
              timestamp: new Date().toISOString(),
              preferredAt: row.preferred_at || new Date().toISOString()
            };

            const currentList = getLocalFallback("consultations", DEFAULT_FALLBACK_CONSULTATIONS);
            currentList.push(mockConsult);
            localStorage.setItem("dermshield_local_table_consultations", JSON.stringify(currentList));

            results.push(mapConsultationToSnake(mockConsult));
          }
        } else {
          // Auxiliary local table insert (lesions, referrals, inference_logs)
          const localData = localStorage.getItem(`dermshield_table_${this.tableName}`);
          const tableData = localData ? JSON.parse(localData) : [];
          
          const newRow = {
            id: row.id || "r-" + Math.random().toString(36).substring(2, 9),
            created_at: new Date().toISOString(),
            ...row
          };

          tableData.push(newRow);
          localStorage.setItem(`dermshield_table_${this.tableName}`, JSON.stringify(tableData));
          results.push(newRow);

          // Dispatch real-time events to active matching channel listeners
          const currentTable = this.tableName;
          setTimeout(() => {
            Object.values(globalChannels).forEach((chan: any) => {
              if (chan && Array.isArray(chan.listeners)) {
                chan.listeners.forEach((listener: any) => {
                  if (listener.table === currentTable) {
                    let match = true;
                    if (listener.filter) {
                      const parts = listener.filter.split("=eq.");
                      if (parts.length === 2) {
                        const field = parts[0];
                        const val = parts[1];
                        match = String(newRow[field]).toLowerCase() === String(val).toLowerCase();
                      }
                    }
                    if (match) {
                      listener.callback({ new: newRow });
                    }
                  }
                });
              }
            });
          }, 0);
        }
      } catch (err: any) {
        console.error(`Mock database insert failed in table ${this.tableName}:`, err);
        return { data: null, error: err };
      }
    }

    // Return mock interface matching Supabase postgrest response
    return {
      data: results,
      error: null,
      select: () => ({
        single: () => ({
          data: results[0] || null,
          error: results[0] ? null : { message: "No row returned" }
        })
      })
    };
  }

  // Update operation
  async update(row: any) {
    const getLocalFallback = (table: string, defaults: any[]) => {
      const key = `dermshield_local_table_${table}`;
      const local = localStorage.getItem(key);
      if (local) {
        try { return JSON.parse(local); } catch {}
      }
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    };

    try {
      if (this.tableName === "profiles") {
        const idFilter = this.filters.find(f => f.field === "id");
        if (idFilter && row.is_verified !== undefined) {
          try {
            const res = await fetch("/api/admin/verify-doctor", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ doctorId: idFilter.value, verify: row.is_verified })
            });
            if (!res.ok) throw new Error("API failed");
          } catch {
            console.warn("Verify Doctor API failed, updating locally:");
            const profiles = getLocalFallback("profiles", DEFAULT_FALLBACK_PROFILES);
            const updated = profiles.map((p: any) => {
              if (p.id === idFilter.value) {
                return { ...p, isVerified: row.is_verified };
              }
              return p;
            });
            localStorage.setItem("dermshield_local_table_profiles", JSON.stringify(updated));
          }
          return { data: [row], error: null };
        }
      }

      if (this.tableName === "scans") {
        const idFilter = this.filters.find(f => f.field === "id");
        if (idFilter && row.doctor_verdict !== undefined) {
          const verdictObj = row.doctor_verdict;
          try {
            const res = await fetch(`/api/scans/${idFilter.value}/verdict`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                verdict: verdictObj.status,
                notes: verdictObj.notes,
                doctorId: verdictObj.doctorId,
                doctorName: verdictObj.doctorName
              })
            });
            if (!res.ok) throw new Error("Verdict API failed");
          } catch {
            console.warn("Verdict API failed, updating locally:");
            const scans = getLocalFallback("scans", DEFAULT_FALLBACK_SCANS);
            const updated = scans.map((s: any) => {
              if (s.id === idFilter.value) {
                return { ...s, status: "reviewed", doctorVerdict: verdictObj };
              }
              return s;
            });
            localStorage.setItem("dermshield_local_table_scans", JSON.stringify(updated));
          }
          return { data: [row], error: null };
        }
      }

      // Local storage fallback updates
      const localData = localStorage.getItem(`dermshield_table_${this.tableName}`);
      if (localData) {
        let tableData = JSON.parse(localData);
        for (const filter of this.filters) {
          tableData = tableData.map((item: any) => {
            if (String(item[filter.field]) === String(filter.value)) {
              return { ...item, ...row };
            }
            return item;
          });
        }
        localStorage.setItem(`dermshield_table_${this.tableName}`, JSON.stringify(tableData));
      }
    } catch (err: any) {
      console.error(`Mock database update failed in table ${this.tableName}:`, err);
      return { data: null, error: err };
    }

    return { data: [row], error: null };
  }
}

export const supabase: any = {
  auth: {
    async getSession() {
      const activeSession = getLocalSession();
      return { data: { session: activeSession }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authListeners.push(callback);
      // Immediately run callback with current session
      const current = getLocalSession();
      callback("SIGNED_IN", current);

      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = authListeners.indexOf(callback);
              if (idx !== -1) authListeners.splice(idx, 1);
            }
          }
        }
      };
    },

    async signUp(params: any) {
      const { email, options } = params;
      const data = options?.data || {};

      const getLocalFallback = (table: string, defaults: any[]) => {
        const key = `dermshield_local_table_${table}`;
        const local = localStorage.getItem(key);
        if (local) {
          try { return JSON.parse(local); } catch {}
        }
        localStorage.setItem(key, JSON.stringify(defaults));
        return defaults;
      };

      try {
        let registeredUser: any;
        try {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              name: data.name || email.split("@")[0],
              role: data.role || "patient",
              medicalLicense: data.medicalLicense
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to register");
          }
          const registered = await res.json();
          registeredUser = registered.user;

          // Sync into local profiles
          const profiles = getLocalFallback("profiles", DEFAULT_FALLBACK_PROFILES);
          if (!profiles.some((p: any) => p.id === registeredUser.id)) {
            profiles.push(registeredUser);
            localStorage.setItem("dermshield_local_table_profiles", JSON.stringify(profiles));
          }
        } catch (err) {
          console.warn("Register API failed, registering locally:", err);
          const id = "u-" + Math.random().toString(36).substring(2, 9);
          registeredUser = {
            id,
            email,
            name: data.name || email.split("@")[0],
            role: data.role || "patient",
            medicalLicense: data.medicalLicense,
            isVerified: data.role === "patient" ? true : false,
            registrationDate: new Date().toISOString()
          };

          const profiles = getLocalFallback("profiles", DEFAULT_FALLBACK_PROFILES);
          profiles.push(registeredUser);
          localStorage.setItem("dermshield_local_table_profiles", JSON.stringify(profiles));
        }

        const sessionMock = {
          user: {
            id: registeredUser.id,
            email: registeredUser.email,
            user_metadata: { name: registeredUser.name, role: registeredUser.role }
          },
          access_token: "mock-jwt-token"
        };

        setLocalSession(sessionMock);
        authListeners.forEach(listener => listener("SIGNED_IN", sessionMock as any));

        return { data: { user: sessionMock.user, session: sessionMock }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    async signInWithPassword(params: any) {
      const { email, password } = params;

      const getLocalFallback = (table: string, defaults: any[]) => {
        const key = `dermshield_local_table_${table}`;
        const local = localStorage.getItem(key);
        if (local) {
          try { return JSON.parse(local); } catch {}
        }
        localStorage.setItem(key, JSON.stringify(defaults));
        return defaults;
      };

      try {
        let loggedUser: any;
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Login failed");
          }

          const loggedIn = await res.json();
          loggedUser = loggedIn.user;
        } catch (err) {
          console.warn("Login API failed, attempting local auth fallback:", err);
          const profiles = getLocalFallback("profiles", DEFAULT_FALLBACK_PROFILES);
          const match = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
          if (!match) {
            throw new Error("No local user found matching this email. Please register or try again.");
          }
          loggedUser = match;
        }

        const sessionMock = {
          user: {
            id: loggedUser.id,
            email: loggedUser.email,
            user_metadata: { name: loggedUser.name, role: loggedUser.role }
          },
          access_token: "mock-jwt-token"
        };

        setLocalSession(sessionMock);
        authListeners.forEach(listener => listener("SIGNED_IN", sessionMock as any));

        return { data: { user: sessionMock.user, session: sessionMock }, error: null };
      } catch (err: any) {
        return { data: { user: null, session: null }, error: err };
      }
    },

    async signOut() {
      setLocalSession(null);
      authListeners.forEach(listener => listener("SIGNED_OUT", null));
      return { error: null };
    },

    async resend(params: any) {
      return { data: { message: "Dispatched verification email." }, error: null };
    }
  },

  from(tableName: string) {
    return new SupabaseQueryBuilder(tableName);
  },

  channel(channelName: string) {
    return {
      name: channelName,
      listeners: [] as { event: string; table: string; filter: string; callback: (payload: any) => void }[],
      on(type: string, filterConfig: any, callback: (payload: any) => void) {
        if (type === "postgres_changes") {
          this.listeners.push({
            event: filterConfig.event || "*",
            table: filterConfig.table,
            filter: filterConfig.filter || "",
            callback
          });
        }
        return this;
      },
      subscribe() {
        globalChannels[channelName] = this;
        return this;
      },
      unsubscribe() {
        delete globalChannels[channelName];
      }
    };
  },

  removeChannel(channelObj: any) {
    if (channelObj && channelObj.name) {
      delete globalChannels[channelObj.name];
    }
    return { error: null };
  }
};
