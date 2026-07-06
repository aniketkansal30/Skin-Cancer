import { Session } from "@supabase/supabase-js";

// Types
export interface User {
  id: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  name: string;
  medicalLicense?: string;
  isVerified?: boolean;
  registrationDate: string;
}

// Helper to convert snake_case to camelCase
function camelCase(str: string): string {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

// Helper to convert camelCase to snake_case
function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

const LOCAL_STORAGE_KEY = "dermshield_mock_supabase_db";

const INITIAL_PROFILES = [
  {
    id: "u-patient-1",
    email: "patient@dermshield.com",
    role: "patient",
    name: "Aniket Kansal",
    registration_date: new Date("2026-01-10T10:00:00Z").toISOString(),
    is_verified: true
  },
  {
    id: "u-doctor-1",
    email: "doctor@dermshield.com",
    role: "doctor",
    name: "Dr. Sarah Jenkins, MD",
    medical_license: "LIC-88291-DERM",
    is_verified: true,
    registration_date: new Date("2026-01-05T09:00:00Z").toISOString()
  },
  {
    id: "u-doctor-2",
    email: "dermatologist@dermshield.com",
    role: "doctor",
    name: "Dr. Rajesh Sharma, MBBS, DDVL",
    medical_license: "LIC-44738-MED",
    is_verified: false,
    registration_date: new Date("2026-06-28T14:30:00Z").toISOString()
  },
  {
    id: "u-admin-1",
    email: "admin@dermshield.com",
    role: "admin",
    name: "Platform Administrator",
    registration_date: new Date("2026-01-01T08:00:00Z").toISOString(),
    is_verified: true
  }
];

const INITIAL_SCANS = [
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
    explanation: "The Swish-activated CNN+ViT ensemble detected pronounced structural asymmetry (A score: 1.8), marked border irregularity (B score: 2.1), and multi-colored variegation (C score: 3.2). Additionally, high-intensity local activation of the Vision Transformer self-attention maps points heavily to an atypical pigment network near the upper margin.",
    clinical_details: "Atypical melanocytic lesion showing dynamic asymmetry and jagged borders. Grad-CAM shows localized hyper-activation (hotspot weight: 0.95) corresponding to standard Fitzpatrick type II presentation of evolving superficial spreading melanoma. Recommend immediate excisional biopsy with 5mm margins.",
    heatmap_points: [
      { x: 48, y: 52, radius: 25, weight: 0.95 },
      { x: 42, y: 48, radius: 15, weight: 0.82 },
      { x: 55, y: 56, radius: 20, weight: 0.76 }
    ],
    created_at: new Date("2026-07-01T15:20:00Z").toISOString(),
    status: "pending_review",
    body_location: "Upper Back",
    lesion_id: "lesion-1",
    uncertainty_score: 0.58,
    needs_mandatory_review: true,
    contributing_factors: [
      { label: "Border Irregularity", weight: 34 },
      { label: "Color Variation", weight: 28 },
      { label: "Asymmetry", weight: 21 },
      { label: "Diameter", weight: 17 }
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
    explanation: "The neural network shows high confidence (97.2%) for a completely benign melanocytic nevus. On-screen features demonstrate excellent radial symmetry, sharp well-defined borders, and uniform brown pigment network distribution.",
    clinical_details: "Symmetrical dermoscopic structure. No atypical pigment networks, regression structures, or blue-white veils identified. Regular benign nevus pattern. Grad-CAM activations are uniformly spread with low concentration peak.",
    heatmap_points: [
      { x: 50, y: 50, radius: 15, weight: 0.45 }
    ],
    created_at: new Date("2026-06-15T11:10:00Z").toISOString(),
    status: "reviewed",
    body_location: "Left Forearm",
    lesion_id: "lesion-2",
    uncertainty_score: 0.12,
    needs_mandatory_review: false,
    contributing_factors: [
      { label: "Regular Pigment Network", weight: 58 },
      { label: "Symmetrical Borders", weight: 26 },
      { label: "Uniform Color", weight: 11 },
      { label: "Diameter <6mm", weight: 5 }
    ],
    doctor_verdict: {
      status: "Agree",
      notes: "Typical benign compound nevus. Symmetrical. No follow-up or biopsy required unless patient reports rapid changes or itching. Advised annual skin self-checks using ABCDE criteria.",
      reviewedAt: new Date("2026-06-16T10:00:00Z").toISOString(),
      doctorId: "u-doctor-1",
      doctorName: "Dr. Sarah Jenkins, MD"
    }
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
    explanation: "The model detected a high likelihood of Basal Cell Carcinoma, characterized by local telangiectasias (fine blood vessel lines) and a pearly translucent border structure detected via ViT patch embeddings.",
    clinical_details: "Nodular basal cell carcinoma candidate. Prominent shiny nodule. Grad-CAM self-attention maps show strong localized focus around translucent micro-structures. Biopsy is highly recommended.",
    heatmap_points: [
      { x: 52, y: 45, radius: 20, weight: 0.88 },
      { x: 58, y: 48, radius: 12, weight: 0.65 }
    ],
    created_at: new Date("2026-06-29T16:45:00Z").toISOString(),
    status: "reviewed",
    body_location: "Chest",
    lesion_id: "lesion-3",
    uncertainty_score: 0.44,
    needs_mandatory_review: false,
    contributing_factors: [
      { label: "Pearly Translucent Border", weight: 42 },
      { label: "Telangiectasia Vessels", weight: 28 },
      { label: "Asymmetry", weight: 18 },
      { label: "Color Uniformity", weight: 12 }
    ],
    doctor_verdict: {
      status: "Needs Biopsy",
      notes: "Pearly borders with minor telangiectasia. I agree with the model's high risk indicator. I recommend a punch biopsy to confirm Basal Cell Carcinoma. I have requested Rohan to schedule an in-person clinical visit.",
      reviewedAt: new Date("2026-06-30T09:15:00Z").toISOString(),
      doctorId: "u-doctor-1",
      doctorName: "Dr. Sarah Jenkins, MD"
    }
  }
];

const INITIAL_LESIONS = [
  {
    id: "lesion-1",
    patient_id: "u-patient-1",
    body_location: "Upper Back",
    nickname: "Upper back dark mole",
    created_at: new Date("2026-06-01T10:00:00Z").toISOString()
  },
  {
    id: "lesion-2",
    patient_id: "u-patient-1",
    body_location: "Left Forearm",
    nickname: "Left forearm benign mole",
    created_at: new Date("2026-06-15T11:00:00Z").toISOString()
  }
];

const INITIAL_REFERRALS = [
  {
    id: "ref-1",
    scan_id: "scan-1",
    referring_doctor_id: "u-doctor-1",
    referred_to_doctor_id: "u-doctor-2",
    reason: "Complex neural map with prominent self-attention clusters around irregular margins. Requesting secondary clinical histopathology recommendation.",
    status: "pending",
    created_at: new Date("2026-07-02T10:00:00Z").toISOString()
  }
];

const INITIAL_CONSULTATIONS = [
  {
    id: "c-1",
    scan_id: "scan-1",
    patient_id: "u-patient-1",
    patient_name: "Aniket Kansal",
    doctor_id: "u-doctor-1",
    doctor_name: "Dr. Sarah Jenkins, MD",
    message: "Please review my upper back scan result. The AI predicted Melanoma with High Risk and I am very concerned.",
    status: "requested",
    created_at: new Date("2026-07-01T15:25:00Z").toISOString()
  }
];

const INITIAL_NOTIFICATIONS = [
  {
    id: "n-1",
    user_id: "u-patient-1",
    type: "verdict",
    message: "Your mole scan on upper back has been reviewed by Dr. Sarah Jenkins. Status: High Risk (Biopsy requested).",
    read: false,
    created_at: new Date("2026-07-01T15:30:00Z").toISOString()
  }
];

const INITIAL_LOGS = [
  {
    id: "log-1",
    model_name: "DermShield-CNN-ViT-v1.4",
    patient_id: "u-patient-1",
    image_size_kb: 342,
    duration_ms: 1420,
    status: "success",
    created_at: new Date("2026-07-01T15:20:00Z").toISOString()
  },
  {
    id: "log-2",
    model_name: "DermShield-CNN-ViT-v1.4",
    patient_id: "u-patient-1",
    image_size_kb: 184,
    duration_ms: 1150,
    status: "success",
    created_at: new Date("2026-06-15T11:10:00Z").toISOString()
  }
];

function getLocalStore(): Record<string, any[]> {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initial = {
      profiles: INITIAL_PROFILES,
      scans: INITIAL_SCANS,
      consultations: INITIAL_CONSULTATIONS,
      notifications: INITIAL_NOTIFICATIONS,
      inference_logs: INITIAL_LOGS,
      lesions: INITIAL_LESIONS,
      referrals: INITIAL_REFERRALS
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(data);
    // Ensure back-compatibility for existing local storage objects that don't have the new keys
    if (!parsed.lesions) parsed.lesions = INITIAL_LESIONS;
    if (!parsed.referrals) parsed.referrals = INITIAL_REFERRALS;
    return parsed;
  } catch {
    const initial = {
      profiles: INITIAL_PROFILES,
      scans: INITIAL_SCANS,
      consultations: INITIAL_CONSULTATIONS,
      notifications: INITIAL_NOTIFICATIONS,
      inference_logs: INITIAL_LOGS,
      lesions: INITIAL_LESIONS,
      referrals: INITIAL_REFERRALS
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function saveLocalStore(store: Record<string, any[]>) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

// Real-time listener storage
interface RealtimeListener {
  channelName: string;
  table: string;
  userId: string;
  callback: (payload: any) => void;
}

const realtimeListeners: RealtimeListener[] = [];

function triggerRealtimeNotification(notification: any) {
  setTimeout(() => {
    realtimeListeners.forEach((l) => {
      if (l.table === "notifications" && l.userId === notification.user_id) {
        l.callback({ new: notification });
      }
    });
  }, 100);
}

// Fluent Mock Query Builder
class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private isInsert = false;
  private isUpdate = false;
  private isDelete = false;
  private insertData: any = null;
  private updateData: any = null;
  private orderField: string | null = null;
  private orderAscending = true;
  private limitCount: number | null = null;
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: any) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item: any) => {
      const val1 = item[column];
      const val2 = item[camelCase(column)];
      const val3 = item[snakeCase(column)];
      return val1 === value || val2 === value || val3 === value;
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderField = column;
    this.orderAscending = options?.ascending !== false;
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

  insert(data: any) {
    this.isInsert = true;
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.isUpdate = true;
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute();
      if (onfulfilled) return onfulfilled(res);
      return res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    const store = getLocalStore();
    let list = store[this.table] || [];

    if (this.isInsert) {
      const rowsToInsert = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const insertedRows = rowsToInsert.map(r => {
        const id = r.id || (this.table === "profiles" ? "u-" : this.table === "scans" ? "scan-" : this.table === "consultations" ? "c-" : "id-") + Math.random().toString(36).substring(2, 9);
        const newRow = {
          id,
          created_at: new Date().toISOString(),
          registration_date: new Date().toISOString(),
          ...r
        };
        return newRow;
      });

      list.push(...insertedRows);
      store[this.table] = list;
      saveLocalStore(store);

      // Trigger realtime update if inserting a notification
      if (this.table === "notifications") {
        insertedRows.forEach(row => {
          triggerRealtimeNotification(row);
        });
      }

      const resData = Array.isArray(this.insertData) ? insertedRows : insertedRows[0];
      return { data: resData, error: null, count: insertedRows.length };
    }

    if (this.isUpdate) {
      let updatedRows: any[] = [];
      list = list.map((item: any) => {
        const matches = this.filters.every(f => f(item));
        if (matches) {
          const updated = { ...item, ...this.updateData };
          updatedRows.push(updated);
          return updated;
        }
        return item;
      });

      store[this.table] = list;
      saveLocalStore(store);

      // "Postgres Triggers" simulation to trigger live patient notifications
      if (this.table === "scans" && this.updateData.status === "reviewed") {
        updatedRows.forEach(scan => {
          const notif = {
            id: "n-" + Math.random().toString(36).substring(2, 9),
            user_id: scan.patient_id,
            type: "verdict",
            message: `Your skin lesion scan has been reviewed. Doctor verdict: ${scan.doctor_verdict?.status || 'No Action'}`,
            read: false,
            created_at: new Date().toISOString()
          };
          const currentStore = getLocalStore();
          currentStore.notifications = currentStore.notifications || [];
          currentStore.notifications.push(notif);
          saveLocalStore(currentStore);
          triggerRealtimeNotification(notif);
        });
      }

      if (this.table === "consultations") {
        updatedRows.forEach(consult => {
          let message = "";
          let type: "scheduled" | "completed" = "scheduled";
          if (this.updateData.status === "scheduled") {
            message = `Your consultation with ${consult.doctor_name} has been scheduled for ${new Date(consult.scheduled_at).toLocaleString()}`;
            type = "scheduled";
          } else if (this.updateData.status === "completed") {
            message = `Your consultation session with ${consult.doctor_name} has been completed. Notes: ${consult.notes || ''}`;
            type = "completed";
          }

          if (message) {
            const notif = {
              id: "n-" + Math.random().toString(36).substring(2, 9),
              user_id: consult.patient_id,
              type,
              message,
              read: false,
              created_at: new Date().toISOString()
            };
            const currentStore = getLocalStore();
            currentStore.notifications = currentStore.notifications || [];
            currentStore.notifications.push(notif);
            saveLocalStore(currentStore);
            triggerRealtimeNotification(notif);
          }
        });
      }

      return { data: updatedRows, error: null, count: updatedRows.length };
    }

    if (this.isDelete) {
      list = list.filter((item: any) => !this.filters.every(f => f(item)));
      store[this.table] = list;
      saveLocalStore(store);
      return { data: null, error: null, count: 0 };
    }

    // Default SELECT
    let results = [...list];

    // Filter
    if (this.filters.length > 0) {
      results = results.filter(item => this.filters.every(f => f(item)));
    }

    // Sort
    if (this.orderField) {
      const field = this.orderField;
      results.sort((a, b) => {
        const valA = a[field] ?? a[camelCase(field)] ?? a[snakeCase(field)] ?? "";
        const valB = b[field] ?? b[camelCase(field)] ?? b[snakeCase(field)] ?? "";
        if (valA < valB) return this.orderAscending ? -1 : 1;
        if (valA > valB) return this.orderAscending ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      return { data: results[0] || null, error: results.length === 0 ? { message: "Not found" } : null, count: results.length > 0 ? 1 : 0 };
    }

    return { data: results, error: null, count: results.length };
  }
}

// Authentication implementation
const authListeners: Array<(event: string, session: any) => void> = [];

const mockAuth = {
  async getSession() {
    const sessionStr = sessionStorage.getItem("supabase_session") || localStorage.getItem("supabase_session");
    if (!sessionStr) return { data: { session: null }, error: null };
    try {
      const session = JSON.parse(sessionStr);
      return { data: { session }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    authListeners.push(callback);
    this.getSession().then(({ data: { session } }) => {
      callback("SIGNED_IN", session);
    });
    return {
      data: {
        subscription: {
          unsubscribe() {
            const index = authListeners.indexOf(callback);
            if (index !== -1) authListeners.splice(index, 1);
          }
        }
      }
    };
  },

  async signUp({ email, password, options }: any) {
    const store = getLocalStore();
    const profiles = store.profiles || [];

    const existing = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { data: { user: null }, error: { message: "Email already exists" } };
    }

    const id = "u-" + Math.random().toString(36).substring(2, 9);
    const isDoctor = options?.data?.role === "doctor";
    const newProfile = {
      id,
      email: email.toLowerCase(),
      name: options?.data?.name || email.split("@")[0],
      role: options?.data?.role || "patient",
      medical_license: isDoctor ? `LIC-${Math.floor(10000 + Math.random() * 90000)}-MED` : undefined,
      is_verified: isDoctor ? false : undefined,
      registration_date: new Date().toISOString()
    };

    profiles.push(newProfile);
    store.profiles = profiles;
    saveLocalStore(store);

    const user = { id, email: email.toLowerCase(), user_metadata: options?.data || {} };
    const session = { user, access_token: "mock-token-" + id };

    sessionStorage.setItem("supabase_session", JSON.stringify(session));
    localStorage.setItem("supabase_session", JSON.stringify(session));

    authListeners.forEach(l => l("SIGNED_IN", session));

    return { data: { user, session }, error: null };
  },

  async signInWithPassword({ email, password }: any) {
    const store = getLocalStore();
    const profiles = store.profiles || [];

    const profile = profiles.find((p: any) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile) {
      return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
    }

    const user = { id: profile.id, email: email.toLowerCase(), user_metadata: { name: profile.name, role: profile.role } };
    const session = { user, access_token: "mock-token-" + profile.id };

    sessionStorage.setItem("supabase_session", JSON.stringify(session));
    localStorage.setItem("supabase_session", JSON.stringify(session));

    authListeners.forEach(l => l("SIGNED_IN", session));

    return { data: { user, session }, error: null };
  },

  async signOut() {
    sessionStorage.removeItem("supabase_session");
    localStorage.removeItem("supabase_session");
    authListeners.forEach(l => l("SIGNED_OUT", null));
    return { error: null };
  },

  async resend({ email, type }: any) {
    return { error: null };
  }
};

// Main Export Client
export const supabase = {
  auth: mockAuth,

  from(table: string) {
    return new MockQueryBuilder(table);
  },

  channel(name: string) {
    const userId = name.replace("notifications-", "");
    const onHandlers: Array<{ event: string; table: string; callback: (payload: any) => void }> = [];

    return {
      on(event: string, filterObj: any, callback: (payload: any) => void) {
        onHandlers.push({ event: filterObj.event, table: filterObj.table, callback });
        return this;
      },
      subscribe() {
        onHandlers.forEach((handler) => {
          realtimeListeners.push({
            channelName: name,
            table: handler.table,
            userId,
            callback: handler.callback,
          });
        });
        return this;
      }
    };
  },

  removeChannel(channel: any) {
    const idx = realtimeListeners.findIndex((l) => l.channelName === channel?.channelName);
    if (idx !== -1) {
      realtimeListeners.splice(idx, 1);
    }
  }
};
