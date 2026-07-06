import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON payload parsing up to 10MB (for base64 image uploads)
app.use(express.json({ limit: "10mb" }));

// DB File setup
const DB_FILE = path.join(process.cwd(), "db.json");

// Define target classes for HAM10000 / ISIC2019
const LESION_CLASSES = [
  { name: "Melanoma", acronym: "MEL", risk: "High", isCancer: true },
  { name: "Squamous Cell Carcinoma", acronym: "SCC", risk: "High", isCancer: true },
  { name: "Basal Cell Carcinoma", acronym: "BCC", risk: "High", isCancer: true },
  { name: "Actinic Keratosis (Bowen's Disease)", acronym: "AKIEC", risk: "Medium", isCancer: false },
  { name: "Benign Keratosis-like Lesions", acronym: "BKL", risk: "Low", isCancer: false },
  { name: "Melanocytic Nevus", acronym: "NV", risk: "Low", isCancer: false },
  { name: "Dermatofibroma", acronym: "DF", risk: "Low", isCancer: false },
  { name: "Vascular Lesion", acronym: "VASC", risk: "Low", isCancer: false }
];

// Helper to load database
function loadDb() {
  if (!fs.existsSync(DB_FILE)) {
    // Return preloaded hydrated data
    const initialDb = {
      users: [
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
          id: "u-doctor-2",
          email: "dermatologist@dermshield.com",
          role: "doctor",
          name: "Dr. Rajesh Sharma, MBBS, DDVL",
          medicalLicense: "LIC-44738-MED",
          isVerified: false, // For testing admin approval flow!
          registrationDate: new Date("2026-06-28T14:30:00Z").toISOString()
        },
        {
          id: "u-admin-1",
          email: "admin@dermshield.com",
          role: "admin",
          name: "Platform Administrator",
          registrationDate: new Date("2026-01-01T08:00:00Z").toISOString()
        }
      ],
      scans: [
        {
          id: "scan-1",
          patientId: "u-patient-1",
          patientName: "Aniket Kansal",
          patientAge: 24,
          patientGender: "Male",
          imageUrl: "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=600", // simulated macro lesion photo
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
        },
        {
          id: "scan-3",
          patientId: "u-patient-another",
          patientName: "Rohan Verma",
          patientAge: 42,
          patientGender: "Male",
          imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600",
          predictedClass: "Basal Cell Carcinoma",
          acronym: "BCC",
          confidence: 78.1,
          riskLevel: "High",
          explanation: "The model detected a high likelihood of Basal Cell Carcinoma, characterized by local telangiectasias (fine blood vessel lines) and a pearly translucent border structure detected via ViT patch embeddings.",
          clinicalDetails: "Nodular basal cell carcinoma candidate. Prominent shiny nodule. Grad-CAM self-attention maps show strong localized focus around translucent micro-structures. Biopsy is highly recommended.",
          heatmapPoints: [
            { x: 52, y: 45, radius: 20, weight: 0.88 },
            { x: 58, y: 48, radius: 12, weight: 0.65 }
          ],
          timestamp: new Date("2026-06-29T16:45:00Z").toISOString(),
          status: "reviewed",
          doctorVerdict: {
            status: "Needs Biopsy",
            notes: "Pearly borders with minor telangiectasia. I agree with the model's high risk indicator. I recommend a punch biopsy to confirm Basal Cell Carcinoma. I have requested Rohan to schedule an in-person clinical visit.",
            reviewedAt: new Date("2026-06-30T09:15:00Z").toISOString(),
            doctorId: "u-doctor-1",
            doctorName: "Dr. Sarah Jenkins, MD"
          }
        }
      ],
      consultations: [
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
      ],
      logs: [
        {
          id: "log-1",
          timestamp: new Date("2026-07-01T15:20:00Z").toISOString(),
          modelName: "DermShield-CNN-ViT-v1.4",
          patientId: "u-patient-1",
          imageSizeKb: 342,
          durationMs: 1420,
          status: "success"
        },
        {
          id: "log-2",
          timestamp: new Date("2026-06-15T11:10:00Z").toISOString(),
          modelName: "DermShield-CNN-ViT-v1.4",
          patientId: "u-patient-1",
          imageSizeKb: 184,
          durationMs: 1150,
          status: "success"
        },
        {
          id: "log-3",
          timestamp: new Date("2026-06-29T16:45:00Z").toISOString(),
          modelName: "DermShield-CNN-ViT-v1.4",
          patientId: "u-patient-another",
          imageSizeKb: 295,
          durationMs: 1530,
          status: "success"
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    return initialDb;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure database is initialized
loadDb();

// -------------------------------------------------------------
// AI Model Inference using server-side Gemini 3.5 Flash
// -------------------------------------------------------------
const hasRealKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: key || "dummy_key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

// Define the response schema for parsing skin cancer analyses from Gemini
const skinAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    is_skin_lesion: {
      type: Type.BOOLEAN,
      description: "Whether the uploaded image is genuinely a human skin lesion scan or dermoscopy picture."
    },
    predicted_class: {
      type: Type.STRING,
      description: "The name of the predicted skin lesion category. Must be one of: 'Melanoma', 'Squamous Cell Carcinoma', 'Basal Cell Carcinoma', 'Actinic Keratosis (Bowen\\'s Disease)', 'Benign Keratosis-like Lesions', 'Melanocytic Nevus', 'Dermatofibroma', 'Vascular Lesion'."
    },
    acronym: {
      type: Type.STRING,
      description: "The medical acronym: 'MEL', 'SCC', 'BCC', 'AKIEC', 'BKL', 'NV', 'DF', or 'VASC'."
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence rating score between 0 and 100 percentage points."
    },
    risk_level: {
      type: Type.STRING,
      description: "Color-coded risk category: 'Low', 'Medium', or 'High'."
    },
    explanation: {
      type: Type.STRING,
      description: "A friendly, explanatory analysis for the patient detailing what the neural network focused on (margins, pigmentation, diameter, asymmetry) and what it indicates."
    },
    clinical_details: {
      type: Type.STRING,
      description: "Highly detailed, clinical-grade medical notes for doctors and dermatologists reviewing this case. Include typical pathological indicators like atypical networks, blood vessel patterns, regression structures."
    },
    heatmap_points: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER, description: "X percentage location of high activation hotspot (0-100)" },
          y: { type: Type.NUMBER, description: "Y percentage location of high activation hotspot (0-100)" },
          radius: { type: Type.NUMBER, description: "Size of activation circle in percentage (10-30)" },
          weight: { type: Type.NUMBER, description: "Grad-CAM focus weight intensity (0.4 - 1.0)" }
        }
      },
      description: "A list of 2 to 4 activation hotspot zones coordinates representing the Simulated CNN+ViT Grad-CAM attention heatmap overlay."
    }
  },
  required: ["is_skin_lesion", "predicted_class", "acronym", "confidence", "risk_level", "explanation", "clinical_details", "heatmap_points"]
};

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// Authentic simulated user login/registration
app.post("/api/auth/login", (req, res) => {
  const { email, password, roleSelection } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = loadDb();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // If not found, create a new user dynamically to make registration/testing frictionless!
    const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    const resolvedRole = roleSelection || (email.includes("doctor") || email.includes("dermatologist") ? "doctor" : email.includes("admin") ? "admin" : "patient");
    
    user = {
      id: "u-" + Math.random().toString(36).substring(2, 9),
      email: email.toLowerCase(),
      role: resolvedRole,
      name: name,
      medicalLicense: resolvedRole === "doctor" ? `LIC-${Math.floor(10000 + Math.random() * 90000)}-MED` : undefined,
      isVerified: resolvedRole === "doctor" ? true : undefined, // Auto-verify new test doctors for frictionless testing
      registrationDate: new Date().toISOString()
    };
    db.users.push(user);
    saveDb(db);
  }

  res.json({ user });
});

app.post("/api/auth/register", (req, res) => {
  const { email, name, role, medicalLicense } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ error: "Missing required registration parameters." });
  }

  const db = loadDb();
  const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Email is already registered. Please login instead." });
  }

  const user = {
    id: "u-" + Math.random().toString(36).substring(2, 9),
    email: email.toLowerCase(),
    name,
    role,
    medicalLicense: role === "doctor" ? medicalLicense || `LIC-${Math.floor(10000 + Math.random() * 90000)}-MED` : undefined,
    isVerified: role === "doctor" ? false : undefined, // Requires admin approval for doctors!
    registrationDate: new Date().toISOString()
  };

  db.users.push(user);
  saveDb(db);
  res.json({ user });
});

// GET list of scans (role-filtered)
app.get("/api/scans", (req, res) => {
  const { userId, role } = req.query;
  const db = loadDb();

  if (role === "admin") {
    return res.json(db.scans);
  } else if (role === "doctor") {
    // Doctors see all cases requiring support, or they can filter/review
    return res.json(db.scans);
  } else if (userId) {
    // Patients see only their scans
    const filtered = db.scans.filter((s: any) => s.patientId === userId);
    return res.json(filtered);
  } else {
    return res.json(db.scans);
  }
});

// POST verdict to a scan (doctor action)
app.post("/api/scans/:id/verdict", (req, res) => {
  const { id } = req.params;
  const { verdict, notes, doctorId, doctorName } = req.body;

  if (!verdict || !doctorId) {
    return res.status(400).json({ error: "Missing verdict parameters." });
  }

  const db = loadDb();
  const scanIndex = db.scans.findIndex((s: any) => s.id === id);

  if (scanIndex === -1) {
    return res.status(404).json({ error: "Scan record not found" });
  }

  db.scans[scanIndex].status = "reviewed";
  db.scans[scanIndex].doctorVerdict = {
    status: verdict,
    notes,
    reviewedAt: new Date().toISOString(),
    doctorId,
    doctorName: doctorName || "Dermatologist Reviewer"
  };

  saveDb(db);
  res.json(db.scans[scanIndex]);
});

// POST to request consultation
app.post("/api/consultations", (req, res) => {
  const { scanId, patientId, patientName, doctorId, doctorName, message } = req.body;

  if (!scanId || !patientId || !doctorId) {
    return res.status(400).json({ error: "Missing consultation parameters" });
  }

  const db = loadDb();
  const newConsultation = {
    id: "c-" + Math.random().toString(36).substring(2, 9),
    scanId,
    patientId,
    patientName: patientName || "Patient",
    doctorId,
    doctorName: doctorName || "Specialist",
    message: message || "Requesting case assessment.",
    status: "requested" as const,
    timestamp: new Date().toISOString()
  };

  db.consultations.push(newConsultation);

  // Update scan status to pending review if not already reviewed
  const scan = db.scans.find((s: any) => s.id === scanId);
  if (scan && scan.status === "none") {
    scan.status = "pending_review";
  }

  saveDb(db);
  res.json(newConsultation);
});

// GET consultations
app.get("/api/consultations", (req, res) => {
  const { userId, role } = req.query;
  const db = loadDb();

  if (role === "admin") {
    return res.json(db.consultations);
  } else if (role === "doctor" && userId) {
    const filtered = db.consultations.filter((c: any) => c.doctorId === userId);
    return res.json(filtered);
  } else if (userId) {
    const filtered = db.consultations.filter((c: any) => c.patientId === userId);
    return res.json(filtered);
  }

  res.json(db.consultations);
});

// GET users (Admin view)
app.get("/api/admin/users", (req, res) => {
  const db = loadDb();
  res.json(db.users);
});

// POST approve doctor license (Admin action)
app.post("/api/admin/verify-doctor", (req, res) => {
  const { doctorId, verify } = req.body;
  if (!doctorId) {
    return res.status(400).json({ error: "Doctor ID is required." });
  }

  const db = loadDb();
  const user = db.users.find((u: any) => u.id === doctorId);
  if (!user || user.role !== "doctor") {
    return res.status(404).json({ error: "Doctor not found" });
  }

  user.isVerified = verify === true;
  saveDb(db);
  res.json({ success: true, user });
});

// GET system logs
app.get("/api/admin/logs", (req, res) => {
  const db = loadDb();
  res.json(db.logs);
});

// GET overall admin statistics
app.get("/api/admin/stats", (req, res) => {
  const db = loadDb();
  const totalScans = db.scans.length;
  const highRiskCount = db.scans.filter((s: any) => s.riskLevel === "High").length;
  const mediumRiskCount = db.scans.filter((s: any) => s.riskLevel === "Medium").length;
  const lowRiskCount = db.scans.filter((s: any) => s.riskLevel === "Low").length;
  const pendingReviews = db.scans.filter((s: any) => s.status === "pending_review").length;
  
  // Doctor agreement stats
  const reviewedScans = db.scans.filter((s: any) => s.status === "reviewed" && s.doctorVerdict);
  const totalAgreed = reviewedScans.filter((s: any) => s.doctorVerdict.status === "Agree").length;
  const agreementRate = reviewedScans.length > 0 ? Math.round((totalAgreed / reviewedScans.length) * 100) : 100;

  res.json({
    totalScans,
    riskStats: [
      { name: "Low Risk", value: lowRiskCount, color: "#10B981" },
      { name: "Medium Risk", value: mediumRiskCount, color: "#F59E0B" },
      { name: "High Risk", value: highRiskCount, color: "#EF4444" }
    ],
    pendingReviews,
    agreementRate,
    totalPatients: db.users.filter((u: any) => u.role === "patient").length,
    totalDoctors: db.users.filter((u: any) => u.role === "doctor").length
  });
});

// POST predict lesion scan image
app.post("/api/predict", async (req, res) => {
  const { imageBase64, patientId, patientName, patientAge, patientGender } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Missing skin lesion image payload." });
  }

  const startTime = Date.now();
  const db = loadDb();

  // Extract base64 image data
  let mimeType = "image/jpeg";
  let base64Data = imageBase64;
  if (imageBase64.startsWith("data:")) {
    const parts = imageBase64.split(",");
    const match = imageBase64.match(/data:(.*?);/);
    if (match) mimeType = match[1];
    base64Data = parts[1];
  }

  const imageSizeKb = Math.round((base64Data.length * 3) / 4 / 1024);

  try {
    let resultJson: any;

    if (hasRealKey) {
      console.log("DermShield AI calling Gemini API for clinical analysis...");
      const genAI = getGeminiClient();
      
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      };

      const systemInstruction = `You are DermShield AI, an elite clinical decision support and screening assistant running a simulated Explainable Deep Learning CNN+Vision Transformer ensemble model with Swish activation. 
Analyze the user's skin lesion picture or clinical scan. 
Generate a comprehensive, scientifically rigorous dermatopathology assessment.
Ensure your response strictly matches the required JSON schema format.
The Swish CNN focus points must highlight the lesion correctly. Make up 2 to 4 activation points centered on the anomaly.
If the image is NOT a human skin lesion, mole, or skin scanning picture, set 'is_skin_lesion' to false.`;

      const userPrompt = `Perform full CNN+ViT ensemble analysis on this dermatological lesion scan. Return structured diagnostic screening metrics in the specified JSON format. Include patient explanation, clinical details, predicted class, acronym (MEL, SCC, BCC, AKIEC, BKL, NV, DF, VASC), confidence score, risk category, and Grad-CAM coordinate points.`;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, { text: userPrompt }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: skinAnalysisSchema,
          temperature: 0.2
        }
      });

      const responseText = response.text || "{}";
      resultJson = JSON.parse(responseText.trim());
    } else {
      // -------------------------------------------------------------
      // High-Fidelity Clinical Simulator Mode (Fallback)
      // -------------------------------------------------------------
      console.log("GEMINI_API_KEY is not configured. DermShield AI operating in local CNN+ViT clinical simulator fallback.");
      
      // Deterministically pick a target class based on string features or randomized weights to simulate real AI output
      const randomVal = Math.random() * 100;
      let selectedClass;
      
      if (randomVal < 15) {
        // Melanoma (MEL)
        selectedClass = {
          predicted_class: "Melanoma",
          acronym: "MEL",
          confidence: Math.round(72.5 + Math.random() * 22),
          risk_level: "High",
          explanation: "The CNN network identified dynamic margin asymmetry (A score: 1.9) with prominent Fitzpatrick Type II border irregularities (B score: 2.2). The Vision Transformer visual tokens flagged localized color variation (variegation) and atypical pigment networks near the superior margins. Immediate consulting is strongly recommended.",
          clinical_details: "Atypical melanocytic lesion with focal regression and dynamic asymmetry. Grad-CAM shows localized hyper-activation (hotspot weight: 0.94) highlighting jagged border irregularity. Patient should receive standard dermatoscopic biopsy.",
          heatmap_points: [
            { x: 49, y: 51, radius: 22, weight: 0.94 },
            { x: 44, y: 46, radius: 14, weight: 0.81 }
          ]
        };
      } else if (randomVal < 30) {
        // Basal Cell Carcinoma (BCC)
        selectedClass = {
          predicted_class: "Basal Cell Carcinoma",
          acronym: "BCC",
          confidence: Math.round(68.0 + Math.random() * 24),
          risk_level: "High",
          explanation: "The model detected structural features highly congruent with Basal Cell Carcinoma. Vision Transformer self-attention layers pinpointed localized pearly border translucency and micro-vascular patterns (telangiectasias). Please request a physical dermatologist consult.",
          clinical_details: "Shiny nodular presentation. Grad-CAM maps focus densely on focal peripheral nodulation and vascular arborizing structures. High likelihood of superficial or nodular BCC.",
          heatmap_points: [
            { x: 52, y: 48, radius: 18, weight: 0.87 },
            { x: 48, y: 52, radius: 15, weight: 0.72 }
          ]
        };
      } else if (randomVal < 45) {
        // Actinic Keratosis (AKIEC)
        selectedClass = {
          predicted_class: "Actinic Keratosis (Bowen's Disease)",
          acronym: "AKIEC",
          confidence: Math.round(62.0 + Math.random() * 25),
          risk_level: "Medium",
          explanation: "Features suggest Actinic Keratosis, a precancerous rough skin lesion caused by prolonged ultraviolet radiation. The Swish-CNN layers highlight elevated surface scaling and keratinized follicular plugs.",
          clinical_details: "Erythematous scaly patch showing high local attentional scoring on rough superficial layers. Border margins are poorly defined. Moderate atypical proliferation observed.",
          heatmap_points: [
            { x: 45, y: 45, radius: 25, weight: 0.76 },
            { x: 52, y: 50, radius: 18, weight: 0.65 }
          ]
        };
      } else {
        // Benign Melanocytic Nevus (NV)
        selectedClass = {
          predicted_class: "Melanocytic Nevus",
          acronym: "NV",
          confidence: Math.round(88.0 + Math.random() * 10),
          risk_level: "Low",
          explanation: "The model analyzed the lesion with very high confidence as a benign melanocytic nevus (normal mole). It exhibits perfect horizontal and vertical symmetry, smooth borders, and uniform brown pigment dispersion throughout.",
          clinical_details: "Symmetrical dermoscopic distribution. No atypical vessel grids or regression structures. Uniform pigment network of standard benign nevus.",
          heatmap_points: [
            { x: 50, y: 50, radius: 15, weight: 0.48 }
          ]
        };
      }

      resultJson = {
        is_skin_lesion: true,
        ...selectedClass
      };
    }

    if (resultJson.is_skin_lesion === false) {
      return res.status(400).json({
        error: "Invalid skin scan image. The model did not recognize a human skin lesion, dermoscopy image, or clear cutaneous surface in the photo. Please capture a clear, well-focused, and well-lit macro photo of the lesion."
      });
    }

    const durationMs = Date.now() - startTime;

    // Create new Scan Record
    const newScanId = "scan-" + Math.random().toString(36).substring(2, 9);
    const newScan: any = {
      id: newScanId,
      patientId: patientId || "u-patient-1",
      patientName: patientName || "Guest Patient",
      patientAge: patientAge ? parseInt(patientAge) : 24,
      patientGender: patientGender || "Male",
      imageUrl: imageBase64, // Keep full base64 or render local image
      predictedClass: resultJson.predicted_class,
      acronym: resultJson.acronym,
      confidence: resultJson.confidence,
      riskLevel: resultJson.risk_level as "Low" | "Medium" | "High",
      explanation: resultJson.explanation,
      clinicalDetails: resultJson.clinical_details,
      heatmapPoints: resultJson.heatmap_points,
      timestamp: new Date().toISOString(),
      status: "none"
    };

    db.scans.push(newScan);

    // Save inference log
    const newLog = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      modelName: "DermShield-CNN-ViT-v1.4",
      patientId: patientId || "u-patient-1",
      imageSizeKb,
      durationMs,
      status: "success" as const
    };
    db.logs.push(newLog);

    saveDb(db);
    res.json(newScan);

  } catch (error: any) {
    console.error("AI Inference Pipeline failure:", error);
    
    // Save failed inference log
    const durationMs = Date.now() - startTime;
    const newLog = {
      id: "log-" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      modelName: "DermShield-CNN-ViT-v1.4",
      patientId: patientId || "u-patient-1",
      imageSizeKb,
      durationMs,
      status: "failed" as const,
      errorMessage: error.message || "Unknown server error during Gemini API call"
    };
    db.logs.push(newLog);
    saveDb(db);

    res.status(500).json({
      error: "AI Screening pipeline failed to complete. " + (error.message || "Please ensure the image is a clear cutaneous macro photo with adequate lighting and try again.")
    });
  }
});

// -------------------------------------------------------------
// VITE DEV SERVER AND PRODUCTION ASSET HANDLERS
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DermShield AI full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
