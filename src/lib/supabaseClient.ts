import { createClient } from "@supabase/supabase-js";

// Check for environment variables
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidSupabaseConfig = Boolean(
  envUrl &&
  envAnonKey &&
  envUrl.startsWith("http") &&
  !envUrl.includes("xxxx")
);

// ---------------------------------------------------------------------------
// In-Memory / LocalStorage Mock Client for AI Studio Preview & Offline Mode
// ---------------------------------------------------------------------------

const STORAGE_KEY = "dermshield_db_v1";
const SESSION_STORAGE_KEY = "dermshield_auth_session_v1";

const SEED_DATA: Record<string, any[]> = {
  profiles: [
    {
      id: "u-patient-1",
      email: "patient@dermshield.com",
      role: "patient",
      name: "Aniket Kansal",
      age: 24,
      gender: "Male",
      is_verified: true,
      registration_date: "2026-01-10T10:00:00.000Z",
      phone: "+1 (555) 234-5678",
      emergency_contact: "Priya Kansal (+1 555-987-6543)"
    },
    {
      id: "u-doctor-1",
      email: "doctor@dermshield.com",
      role: "doctor",
      name: "Dr. Sarah Jenkins, MD",
      medical_license: "LIC-88291-DERM",
      specialty: "Dermatopathology",
      clinic_name: "Metropolitan Skin Health & Oncology",
      is_verified: true,
      registration_date: "2026-01-05T09:00:00.000Z"
    },
    {
      id: "u-doctor-2",
      email: "dermatologist@dermshield.com",
      role: "doctor",
      name: "Dr. Rajesh Sharma, MBBS, DDVL",
      medical_license: "LIC-44738-MED",
      specialty: "Clinical Dermatology",
      clinic_name: "Apex Cutaneous Care",
      is_verified: false,
      registration_date: "2026-06-28T14:30:00.000Z"
    },
    {
      id: "u-admin-1",
      email: "admin@dermshield.com",
      role: "admin",
      name: "Platform Administrator",
      is_verified: true,
      registration_date: "2026-01-01T08:00:00.000Z"
    },
    {
      id: "u-patient-another",
      email: "rohan@dermshield.com",
      role: "patient",
      name: "Rohan Verma",
      age: 42,
      gender: "Male",
      is_verified: true,
      registration_date: "2026-06-20T10:00:00.000Z"
    }
  ],
  scans: [
    {
      id: "scan-1",
      patient_id: "u-patient-1",
      patient_name: "Aniket Kansal",
      patient_age: 24,
      patient_gender: "Male",
      image_url: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=600",
      predicted_class: "Melanoma",
      acronym: "MEL",
      confidence: 89.4,
      risk_level: "High",
      explanation: "The Swin Transformer V2-B model predicted Melanoma and the Grad-CAM map highlights pronounced structural asymmetry (A score: 1.8), marked border irregularity (B score: 2.1), and multi-colored variegation (C score: 3.2). Additionally, high-intensity local activation of the Vision Transformer self-attention maps points heavily to an atypical pigment network near the upper margin.",
      clinical_details: "Atypical melanocytic lesion showing dynamic asymmetry and jagged borders. Grad-CAM shows localized activation over the lesion region. Recommend immediate excisional biopsy with 5mm margins.",
      heatmap_points: [
        { x: 48, y: 52, radius: 25, weight: 0.95 },
        { x: 42, y: 48, radius: 15, weight: 0.82 },
        { x: 55, y: 56, radius: 20, weight: 0.76 }
      ],
      created_at: "2026-07-01T15:20:00.000Z",
      status: "pending_review",
      body_location: "Upper Back",
      lesion_id: "lesion-1",
      uncertainty_score: 0.12,
      needs_mandatory_review: true,
      contributing_factors: [
        { label: "Border Irregularity", weight: 38 },
        { label: "Asymmetry", weight: 31 },
        { label: "Color Variegation", weight: 19 },
        { label: "Diameter >6mm", weight: 12 }
      ]
    },
    {
      id: "scan-2",
      patient_id: "u-patient-1",
      patient_name: "Aniket Kansal",
      patient_age: 24,
      patient_gender: "Male",
      image_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600",
      predicted_class: "Melanocytic Nevus",
      acronym: "NV",
      confidence: 97.2,
      risk_level: "Low",
      explanation: "The neural network shows high confidence (97.2%) for a completely benign melanocytic nevus. Features demonstrate radial symmetry, sharp well-defined borders, and uniform brown pigment network.",
      clinical_details: "Symmetrical dermoscopic structure. No atypical pigment networks, regression structures, or blue-white veils identified. Regular benign pattern.",
      heatmap_points: [
        { x: 50, y: 50, radius: 15, weight: 0.45 }
      ],
      created_at: "2026-06-15T11:10:00.000Z",
      status: "reviewed",
      doctor_verdict: {
        status: "Agree",
        notes: "Typical benign compound nevus. Symmetrical. No follow-up or biopsy required unless patient reports rapid changes or itching. Advised annual skin self-checks.",
        reviewedAt: "2026-06-16T10:00:00.000Z",
        doctorId: "u-doctor-1",
        doctorName: "Dr. Sarah Jenkins, MD"
      },
      body_location: "Left Forearm",
      lesion_id: "lesion-2",
      uncertainty_score: 0.05,
      needs_mandatory_review: false,
      contributing_factors: [
        { label: "Regular Pigment Network", weight: 52 },
        { label: "Symmetrical Borders", weight: 28 },
        { label: "Uniform Color", weight: 14 },
        { label: "Diameter <6mm", weight: 6 }
      ]
    },
    {
      id: "scan-3",
      patient_id: "u-patient-another",
      patient_name: "Rohan Verma",
      patient_age: 42,
      patient_gender: "Male",
      image_url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
      predicted_class: "Basal Cell Carcinoma",
      acronym: "BCC",
      confidence: 78.1,
      risk_level: "High",
      explanation: "The model detected high likelihood of Basal Cell Carcinoma, characterized by local telangiectasias and pearly translucent border structure.",
      clinical_details: "Nodular basal cell carcinoma candidate. Prominent shiny nodule. Grad-CAM shows strong localized focus. Biopsy highly recommended.",
      heatmap_points: [
        { x: 52, y: 45, radius: 20, weight: 0.88 },
        { x: 58, y: 48, radius: 12, weight: 0.65 }
      ],
      created_at: "2026-06-29T16:45:00.000Z",
      status: "reviewed",
      doctor_verdict: {
        status: "Needs Biopsy",
        notes: "Pearly borders with minor telangiectasia. I agree with the model's high risk indicator. I recommend a punch biopsy to confirm Basal Cell Carcinoma.",
        reviewedAt: "2026-06-30T09:15:00.000Z",
        doctorId: "u-doctor-1",
        doctorName: "Dr. Sarah Jenkins, MD"
      },
      body_location: "Cheek / Face",
      lesion_id: "lesion-3",
      uncertainty_score: 0.22,
      needs_mandatory_review: true,
      contributing_factors: [
        { label: "Pearly Translucent Border", weight: 45 },
        { label: "Telangiectasia Vessels", weight: 26 },
        { label: "Asymmetry", weight: 17 },
        { label: "Color Uniformity", weight: 12 }
      ]
    }
  ],
  consultations: [
    {
      id: "c-1",
      scan_id: "scan-1",
      patient_id: "u-patient-1",
      patient_name: "Aniket Kansal",
      doctor_id: "u-doctor-1",
      doctor_name: "Dr. Sarah Jenkins, MD",
      message: "Please review my upper back scan result. The AI predicted Melanoma with High Risk and I am very concerned.",
      status: "requested",
      created_at: "2026-07-01T15:25:00.000Z"
    }
  ],
  lesions: [
    {
      id: "lesion-1",
      patient_id: "u-patient-1",
      body_location: "Upper Back",
      nickname: "Upper Back Mole",
      created_at: "2026-07-01T15:00:00.000Z"
    },
    {
      id: "lesion-2",
      patient_id: "u-patient-1",
      body_location: "Left Forearm",
      nickname: "Left Forearm Spot",
      created_at: "2026-06-15T10:00:00.000Z"
    }
  ],
  referrals: [
    {
      id: "ref-1",
      patient_id: "u-patient-another",
      patient_name: "Rohan Verma",
      doctor_id: "u-doctor-1",
      doctor_name: "Dr. Sarah Jenkins, MD",
      scan_id: "scan-3",
      referring_clinic: "National Dermatopathology Specialists Clinic",
      notes: "Urgent biopsy referral due to suspect Basal Cell Carcinoma presenting atypical characteristics.",
      status: "pending",
      created_at: "2026-06-30T09:30:00.000Z"
    }
  ],
  inference_logs: [
    {
      id: "log-1",
      model_name: "DermShield-SwinV2-B-384",
      patient_id: "u-patient-1",
      image_size_kb: 342,
      duration_ms: 1420,
      status: "success",
      created_at: "2026-07-01T15:20:00.000Z"
    },
    {
      id: "log-2",
      model_name: "DermShield-SwinV2-B-384",
      patient_id: "u-patient-1",
      image_size_kb: 184,
      duration_ms: 1150,
      status: "success",
      created_at: "2026-06-15T11:10:00.000Z"
    },
    {
      id: "log-3",
      model_name: "DermShield-SwinV2-B-384",
      patient_id: "u-patient-another",
      image_size_kb: 295,
      duration_ms: 1530,
      status: "success",
      created_at: "2026-06-29T16:45:00.000Z"
    }
  ],
  notifications: [
    {
      id: "notif-1",
      user_id: "u-patient-1",
      type: "verdict",
      message: "Dr. Sarah Jenkins, MD reviewed your Melanocytic Nevus scan. Verdict: Agree.",
      read: false,
      created_at: "2026-06-16T10:00:00.000Z"
    }
  ]
};

function getStorageDb(): Record<string, any[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(SEED_DATA));
  }
}

function saveStorageDb(db: Record<string, any[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("Failed to persist database to localStorage", e);
  }
}

function getStoredSession(): any | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredSession(session: any | null) {
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// Global auth listeners registry
const authListeners = new Set<(event: string, session: any) => void>();

function notifyAuthChange(event: string, session: any) {
  authListeners.forEach((fn) => {
    try {
      fn(event, session);
    } catch (e) {
      console.warn("Auth listener threw an error:", e);
    }
  });
}

// Realtime channels registry
const realtimeSubscribers = new Map<string, Set<(payload: any) => void>>();

function broadcastRealtimeChange(table: string, event: string, record: any) {
  realtimeSubscribers.forEach((callbacks) => {
    callbacks.forEach((cb) => {
      try {
        cb({ eventType: event, new: record });
      } catch (err) {
        console.warn("Realtime listener failed:", err);
      }
    });
  });
}

class MockQueryBuilder {
  private table: string;
  private filters: Array<(row: any) => boolean> = [];
  private sortField: string | null = null;
  private sortAsc = true;
  private limitCount: number | null = null;
  private isSingle = false;
  private isCountHead = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = "*", options?: { count?: string; head?: boolean }) {
    if (options?.head && options?.count === "exact") {
      this.isCountHead = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => {
      const val = row[column];
      return String(val).toLowerCase() === String(value).toLowerCase();
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sortField = column;
    this.sortAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  private execute() {
    const db = getStorageDb();
    let rows = db[this.table] ? [...db[this.table]] : [];

    for (const filter of this.filters) {
      rows = rows.filter(filter);
    }

    if (this.sortField) {
      const f = this.sortField;
      const asc = this.sortAsc;
      rows.sort((a, b) => {
        const valA = a[f] ?? "";
        const valB = b[f] ?? "";
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    const totalCount = rows.length;

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    if (this.isCountHead) {
      return { data: null, count: totalCount, error: null };
    }

    if (this.isSingle) {
      return { data: rows[0] || null, count: rows.length > 0 ? 1 : 0, error: null };
    }

    return { data: rows, count: totalCount, error: null };
  }

  then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    try {
      const result = this.execute();
      return Promise.resolve(resolve(result));
    } catch (err) {
      if (reject) return Promise.resolve(reject(err));
      return Promise.reject(err);
    }
  }

  async insert(data: any) {
    const db = getStorageDb();
    if (!db[this.table]) {
      db[this.table] = [];
    }

    const records = Array.isArray(data) ? data : [data];
    const insertedRecords = records.map((r) => {
      const copy = { ...r };
      if (!copy.id) {
        copy.id = `${this.table.slice(0, 4)}-${Math.random().toString(36).substring(2, 9)}`;
      }
      if (!copy.created_at && !copy.timestamp && !copy.registration_date) {
        copy.created_at = new Date().toISOString();
      }
      return copy;
    });

    db[this.table].push(...insertedRecords);
    saveStorageDb(db);

    insertedRecords.forEach((rec) => {
      broadcastRealtimeChange(this.table, "INSERT", rec);
    });

    return {
      data: Array.isArray(data) ? insertedRecords : insertedRecords[0],
      error: null,
      select: () => {
        return {
          single: async () => ({ data: insertedRecords[0], error: null }),
          then: (res: any) => Promise.resolve(res({ data: insertedRecords, error: null }))
        };
      }
    };
  }

  async update(updates: any) {
    const db = getStorageDb();
    const tableRows = db[this.table] || [];
    let updatedCount = 0;

    const modified = tableRows.map((row) => {
      const matches = this.filters.every((f) => f(row));
      if (matches) {
        updatedCount++;
        const newRow = { ...row, ...updates };
        broadcastRealtimeChange(this.table, "UPDATE", newRow);
        return newRow;
      }
      return row;
    });

    db[this.table] = modified;
    saveStorageDb(db);

    return { data: null, count: updatedCount, error: null };
  }

  async delete() {
    const db = getStorageDb();
    const tableRows = db[this.table] || [];

    const remaining = tableRows.filter((row) => !this.filters.every((f) => f(row)));
    db[this.table] = remaining;
    saveStorageDb(db);

    return { data: null, error: null };
  }
}

const mockSupabase = {
  auth: {
    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.add(callback);
      // Immediately notify with current session
      const currentSession = getStoredSession();
      setTimeout(() => {
        callback(currentSession ? "SIGNED_IN" : "INITIAL_SESSION", currentSession);
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    async signUp(params: {
      email: string;
      password?: string;
      options?: {
        data?: {
          name?: string;
          role?: string;
          medicalLicense?: string;
          medical_license?: string;
        };
      };
    }) {
      const db = getStorageDb();
      const existing = (db.profiles || []).find(
        (p) => p.email.toLowerCase() === params.email.toLowerCase()
      );

      if (existing) {
        return { data: { user: null, session: null }, error: { message: "This email is already registered. Please log in instead." } };
      }

      const role = params.options?.data?.role === "doctor" ? "doctor" : "patient";
      const name = params.options?.data?.name || params.email.split("@")[0];
      const medLicense = params.options?.data?.medical_license || params.options?.data?.medicalLicense || undefined;

      const newUser = {
        id: `u-${Math.random().toString(36).substring(2, 9)}`,
        email: params.email.toLowerCase(),
        name,
        role,
        is_verified: role === "patient",
        medical_license: medLicense,
        registration_date: new Date().toISOString()
      };

      if (!db.profiles) db.profiles = [];
      db.profiles.push(newUser);
      saveStorageDb(db);

      const session = {
        user: newUser,
        access_token: "mock-jwt-token-" + Date.now(),
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      setStoredSession(session);
      notifyAuthChange("SIGNED_IN", session);

      return { data: { user: newUser, session }, error: null };
    },

    async signInWithPassword(params: { email: string; password?: string }) {
      const db = getStorageDb();
      const user = (db.profiles || []).find(
        (p) => p.email.toLowerCase() === params.email.toLowerCase()
      );

      if (!user) {
        // Auto-provision demo account if tested with common emails
        const name = params.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const role = params.email.includes("doctor") || params.email.includes("dermatologist")
          ? "doctor"
          : params.email.includes("admin")
          ? "admin"
          : "patient";

        const createdUser = {
          id: `u-${Math.random().toString(36).substring(2, 9)}`,
          email: params.email.toLowerCase(),
          name,
          role,
          is_verified: role === "patient" || role === "admin",
          medical_license: role === "doctor" ? `LIC-${Math.floor(10000 + Math.random() * 90000)}-MED` : undefined,
          registration_date: new Date().toISOString()
        };

        if (!db.profiles) db.profiles = [];
        db.profiles.push(createdUser);
        saveStorageDb(db);

        const session = {
          user: createdUser,
          access_token: "mock-jwt-token-" + Date.now(),
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };

        setStoredSession(session);
        notifyAuthChange("SIGNED_IN", session);
        return { data: { user: createdUser, session }, error: null };
      }

      const session = {
        user,
        access_token: "mock-jwt-token-" + Date.now(),
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      setStoredSession(session);
      notifyAuthChange("SIGNED_IN", session);
      return { data: { user, session }, error: null };
    },

    async signOut() {
      setStoredSession(null);
      notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },

    async resend() {
      return { data: {}, error: null };
    },

    async getSession() {
      return { data: { session: getStoredSession() }, error: null };
    }
  },

  from(table: string) {
    return new MockQueryBuilder(table);
  },

  channel(channelName: string) {
    const channelObj = {
      on(_event: string, _filter: any, callback: (payload: any) => void) {
        if (!realtimeSubscribers.has(channelName)) {
          realtimeSubscribers.set(channelName, new Set());
        }
        realtimeSubscribers.get(channelName)!.add(callback);
        return channelObj;
      },
      subscribe() {
        return channelObj;
      },
      unsubscribe() {
        realtimeSubscribers.delete(channelName);
      }
    };
    return channelObj;
  },

  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  }
};

// Export real Supabase client when configured, otherwise use bulletproof mock client
export const supabase = hasValidSupabaseConfig
  ? createClient(envUrl!, envAnonKey!)
  : (mockSupabase as any);
