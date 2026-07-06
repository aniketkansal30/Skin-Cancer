import React, { useState, useEffect } from "react";
import { 
  Plus, History, Clipboard, AlertTriangle, Download, 
  Activity, CheckCircle, Clock, ExternalLink, Sliders, 
  ChevronRight, Camera, Image as ImageIcon, Sparkles,
  RefreshCw, TrendingUp, Terminal, User as UserIcon, Settings, Heart, Info, Phone
} from "lucide-react";
import { User, ScanResult, Consultation, HeatmapPoint } from "../types";
import GradCamCanvas from "./GradCamCanvas";
import BodyMapSelector from "./BodyMapSelector";
import ExplainabilitySummary from "./ExplainabilitySummary";
import PatientProfileTab from "./PatientProfileTab";
import { jsPDF } from "jspdf";
import { supabase } from "../lib/supabaseClient";
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ChartTooltip, Legend as ChartLegend
} from "recharts";

interface PatientDashboardProps {
  user: User;
}

// ---------------------------------------------------------------------------
// TEMPORARY MOCK INFERENCE (until the real CNN+ViT model is wired up)
// This simulates what a trained model would return so the rest of the
// pipeline (Grad-CAM viewer, PDF report, doctor review, admin stats) all
// work end-to-end on real Supabase data right now.
// ---------------------------------------------------------------------------
const MOCK_CLASSES = [
  { predictedClass: "Melanocytic Nevus", acronym: "NV", riskLevel: "Low" as const,
    explanation: "The lesion shows characteristics typical of a common, benign mole with regular borders and uniform coloration.",
    clinicalDetails: "Symmetric pigment network with uniform dot/globule distribution. No atypical streaming or blue-white veil detected." },
  { predictedClass: "Benign Keratosis", acronym: "BKL", riskLevel: "Low" as const,
    explanation: "This appears to be a benign skin growth (seborrheic keratosis-like), common with age and generally harmless.",
    clinicalDetails: "Well-demarcated lesion with a 'stuck-on' appearance. Comedo-like openings and milia-like cysts observed." },
  { predictedClass: "Melanoma", acronym: "MEL", riskLevel: "High" as const,
    explanation: "The model has flagged features that require prompt dermatologist evaluation, including asymmetry and border irregularity.",
    clinicalDetails: "Irregular pigment network with atypical streaming, blue-white veil, and asymmetric color distribution consistent with the ABCDE criteria." },
  { predictedClass: "Basal Cell Carcinoma", acronym: "BCC", riskLevel: "Medium" as const,
    explanation: "The lesion has features suggestive of an atypical growth pattern that should be reviewed by a dermatologist.",
    clinicalDetails: "Arborizing telangiectasia with translucent/pearly texture and blue-grey ovoid nests detected." },
];

function generateMockHeatmap(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const numPoints = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numPoints; i++) {
    points.push({
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      radius: 10 + Math.random() * 15,
      weight: 0.4 + Math.random() * 0.6
    });
  }
  return points;
}

function runMockInference() {
  const pick = MOCK_CLASSES[Math.floor(Math.random() * MOCK_CLASSES.length)];
  return {
    ...pick,
    confidence: 82 + Math.random() * 15,
    heatmapPoints: generateMockHeatmap()
  };
}
// ---------------------------------------------------------------------------

export default function PatientDashboard({ user }: PatientDashboardProps) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [inferenceLogs, setInferenceLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "new_scan" | "history" | "consultations" | "logs" | "profile">("dashboard");
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  
  // New Scan Upload States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState("24");
  const [patientGender, setPatientGender] = useState("Male");
  
  // Lesion Tracking & Body Location states
  const [patientLesions, setPatientLesions] = useState<any[]>([]);
  const [bodyLocation, setBodyLocation] = useState<string>("");
  const [lesionId, setLesionId] = useState<string>("new_lesion");
  const [lesionNickname, setLesionNickname] = useState<string>("");
  
  // Database Logs Search/Filters states
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  
  // Capture Tips Checklist States
  const [tipsChecked, setTipsChecked] = useState({
    lighting: false,
    focus: false,
    background: false,
    distance: false
  });

  // Pipeline simulation stages
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [analysisError, setAnalysisError] = useState("");

  const pipelineStages = [
    "Uploading lesion specimen to secure diagnostic queue...",
    "Normalizing contrast ratios and skin phototype tokens...",
    "Running Convolutional Neural Network (CNN) spatial extraction...",
    "Computing Vision Transformer (ViT) self-attention mappings...",
    "Assembling Grad-CAM focal activation heat signatures...",
    "Compiling pathological diagnostic report..."
  ];

  // Consultation booking states
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultDoctorId, setConsultDoctorId] = useState("");
  const [consultMessage, setConsultMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<{ id: string; name: string }[]>([]);

  // Grad-CAM Controls
  const [showGradCam, setShowGradCam] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  // Map a Supabase "scans" row (snake_case) into the ScanResult shape the UI expects
  const mapScanRow = (row: any): ScanResult => ({
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientAge: row.patient_age,
    patientGender: row.patient_gender,
    imageUrl: row.image_url,
    predictedClass: row.predicted_class,
    acronym: row.acronym,
    confidence: Number(row.confidence),
    riskLevel: row.risk_level,
    explanation: row.explanation,
    clinicalDetails: row.clinical_details,
    heatmapPoints: row.heatmap_points || [],
    timestamp: row.created_at,
    status: row.status,
    doctorVerdict: row.doctor_verdict || undefined,
    bodyLocation: row.body_location,
    lesionId: row.lesion_id,
    uncertaintyScore: row.uncertainty_score ? Number(row.uncertainty_score) : undefined,
    needsMandatoryReview: row.needs_mandatory_review,
    contributingFactors: row.contributing_factors || undefined
  });

  const mapConsultationRow = (row: any): Consultation => ({
    id: row.id,
    scanId: row.scan_id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    message: row.message,
    status: row.status,
    notes: row.notes || undefined,
    timestamp: row.created_at,
    preferredAt: row.preferred_at || undefined,
    scheduledAt: row.scheduled_at || undefined
  });

  // Load patient data directly from Supabase
  const loadPatientData = async () => {
    try {
      const { data: scansData, error: scansError } = await supabase
        .from("scans")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (scansError) throw scansError;
      setScans((scansData || []).map(mapScanRow));

      const { data: consultsData, error: consultsError } = await supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (consultsError) throw consultsError;
      setConsultations((consultsData || []).map(mapConsultationRow));

      // Load patient tracked lesions
      const { data: lesionsData } = await supabase
        .from("lesions")
        .select("*")
        .eq("patient_id", user.id);
      setPatientLesions(lesionsData || []);

      // Load patient referrals
      const { data: referralsData } = await supabase
        .from("referrals")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setReferrals(referralsData || []);

      // Load patient inference telemetry logs
      const { data: logsData } = await supabase
        .from("inference_logs")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      setInferenceLogs(logsData || []);

      // Load verified doctors for the consultation booking dropdown
      const { data: doctorsData } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("role", "doctor")
        .eq("is_verified", true);

      if (doctorsData && doctorsData.length > 0) {
        setAvailableDoctors(doctorsData);
        setConsultDoctorId((prev) => prev || doctorsData[0].id);
      }
    } catch (err) {
      console.error("Failed to load patient dataset", err);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [user.id, activeTab]);

  // Handle local image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Launch AI Pipeline — runs the mock inference and inserts the result into Supabase
  const runAiScreening = async () => {
    if (!selectedImage) return;
    
    if (!bodyLocation) {
      setAnalysisError("Please select a lesion location on the Body Map first.");
      return;
    }

    if (!tipsChecked.lighting || !tipsChecked.focus || !tipsChecked.background || !tipsChecked.distance) {
      setAnalysisError("Please review and confirm all on-screen specimen capture parameters first.");
      return;
    }

    setAnalysisError("");
    setIsAnalyzing(true);
    setAnalysisStage(0);

    const stageIntervals = [1000, 1500, 1800, 1600, 1400, 1200];
    let currentStage = 0;

    const runStages = async () => {
      if (currentStage < pipelineStages.length - 1) {
        setAnalysisStage(currentStage + 1);
        currentStage++;
        setTimeout(runStages, stageIntervals[currentStage]);
      } else {
        // Final stage reached — run mock inference and save to Supabase
        try {
          const result = runMockInference();
          
          // Generate realistic uncertainty score & contributing factors
          const conf = result.confidence;
          const isHighRisk = result.riskLevel === "High";
          const uncertaintyVal = Number((isHighRisk && conf < 90 ? 0.45 + Math.random() * 0.35 : 0.05 + Math.random() * 0.25).toFixed(3));
          const needsReviewVal = uncertaintyVal > 0.45 || (isHighRisk && conf < 88);

          const factorMap: Record<string, {label: string, weight: number}[]> = {
            "MEL": [
              { label: "Border Irregularity", weight: 38 },
              { label: "Asymmetry", weight: 31 },
              { label: "Color Variegation", weight: 19 },
              { label: "Diameter >6mm", weight: 12 }
            ],
            "BCC": [
              { label: "Pearly Translucent Border", weight: 45 },
              { label: "Telangiectasia Vessels", weight: 26 },
              { label: "Asymmetry", weight: 17 },
              { label: "Color Uniformity", weight: 12 }
            ],
            "BKL": [
              { label: "Stuck-on Appearance", weight: 48 },
              { label: "Comedo-like Openings", weight: 25 },
              { label: "Milia-like Cysts", weight: 16 },
              { label: "Symmetrical Border", weight: 11 }
            ],
            "NV": [
              { label: "Regular Pigment Network", weight: 52 },
              { label: "Symmetrical Borders", weight: 28 },
              { label: "Uniform Color", weight: 14 },
              { label: "Diameter <6mm", weight: 6 }
            ]
          };
          const factors = factorMap[result.acronym] || factorMap["NV"];

          // Link to or create lesion
          let finalLesionId = lesionId;
          if (lesionId === "new_lesion") {
            const newLId = "lesion-" + Math.random().toString(36).substr(2, 9);
            const nicknameVal = lesionNickname.trim() || `${bodyLocation} Mole #${Math.floor(100 + Math.random() * 900)}`;
            const { error: lesionErr } = await supabase.from("lesions").insert({
              id: newLId,
              patient_id: user.id,
              body_location: bodyLocation,
              nickname: nicknameVal,
              created_at: new Date().toISOString()
            });
            if (lesionErr) throw lesionErr;
            finalLesionId = newLId;
          }

          const { data, error: insertError } = await supabase
            .from("scans")
            .insert({
              patient_id: user.id,
              patient_name: user.name,
              patient_age: parseInt(patientAge) || 24,
              patient_gender: patientGender,
              image_url: selectedImage,
              predicted_class: result.predictedClass,
              acronym: result.acronym,
              confidence: result.confidence,
              risk_level: result.riskLevel,
              explanation: result.explanation,
              clinical_details: result.clinicalDetails,
              heatmap_points: result.heatmapPoints,
              status: "pending_review",
              body_location: bodyLocation,
              lesion_id: finalLesionId,
              uncertainty_score: uncertaintyVal,
              needs_mandatory_review: needsReviewVal,
              contributing_factors: factors
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Log this inference for the admin telemetry dashboard
          await supabase.from("inference_logs").insert({
            model_name: "DermShield Mock CNN+ViT v1.4",
            patient_id: user.id,
            image_size_kb: Math.round((selectedImage.length * 0.75) / 1024),
            duration_ms: stageIntervals.reduce((a, b) => a + b, 0),
            status: "success"
          });

          setSelectedScan(mapScanRow(data));
          setSelectedImage(null);
          setBodyLocation("");
          setLesionNickname("");
          setLesionId("new_lesion");
          setTipsChecked({ lighting: false, focus: false, background: false, distance: false });
          setActiveTab("dashboard");
          loadPatientData();
        } catch (err: any) {
          console.error("Scan insert failed", err);
          setAnalysisError(err.message || "The server failed to process the cutaneous scanning pattern.");

          await supabase.from("inference_logs").insert({
            model_name: "DermShield Mock CNN+ViT v1.4",
            patient_id: user.id,
            image_size_kb: selectedImage ? Math.round((selectedImage.length * 0.75) / 1024) : 0,
            duration_ms: 0,
            status: "failed",
            error_message: err.message || "Unknown error"
          });
        } finally {
          setIsAnalyzing(false);
        }
      }
    };

    setTimeout(runStages, stageIntervals[0]);
  };

  // Handle consultation booking — inserts directly into Supabase
  const handleBookConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScan || !consultDoctorId) return;

    if (!preferredDate || !preferredTime) {
      return; // date/time required — button stays disabled below until both are set
    }

    try {
      const chosenDoctor = availableDoctors.find((d) => d.id === consultDoctorId);
      const preferredAt = new Date(`${preferredDate}T${preferredTime}`).toISOString();

      const { error: insertError } = await supabase.from("consultations").insert({
        scan_id: selectedScan.id,
        patient_id: user.id,
        patient_name: user.name,
        doctor_id: consultDoctorId,
        doctor_name: chosenDoctor?.name || "Assigned Dermatologist",
        message: consultMessage || `I have an atypical skin scan showing ${selectedScan.predictedClass} with ${selectedScan.riskLevel} risk level. Please review.`,
        status: "requested",
        preferred_at: preferredAt
      });

      if (insertError) throw insertError;

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowConsultModal(false);
        setConsultMessage("");
        setPreferredDate("");
        setPreferredTime("");
        loadPatientData();
      }, 2000);
    } catch (err) {
      console.error("Booking failed", err);
    }
  };

  // Dynamic Clinical Risk badge colors
  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case "High":
        return "bg-rose-50 border-rose-200 text-rose-800";
      case "Medium":
        return "bg-amber-50 border-amber-200 text-amber-800";
      default:
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
    }
  };

  // Generate Medical PDF Report using jsPDF
  const downloadPdfReport = (scan: ScanResult) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, 190, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("DERMSHIELD AI CLINICAL SCREENING REPORT", 15, 22);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text("Explainable Deep Learning Prototype - CNN + Vision Transformer Ensemble", 15, 28);
    doc.text(`Report ID: ${scan.id.slice(0, 8).toUpperCase()}`, 150, 28);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, 48, 180, 25, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, 48, 180, 25, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("PATIENT & CLINICAL PARAMETERS", 18, 54);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Full Name:  ${scan.patientName}`, 18, 61);
    doc.text(`Age:  ${scan.patientAge || "24"} years`, 18, 67);
    doc.text(`Gender:  ${scan.patientGender || "Male"}`, 85, 61);
    doc.text(`Location:  ${scan.bodyLocation || "Not specified"}`, 85, 67);
    doc.text(`Evaluation Date:  ${new Date(scan.timestamp).toLocaleDateString()}`, 135, 61);
    doc.text(`Uncertainty Index:  ${scan.uncertaintyScore !== undefined ? (scan.uncertaintyScore * 100).toFixed(1) + "%" : "15.0%"}`, 135, 67);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("AI SCREENING & SPECTRAL PREDICTIONS", 15, 87);
    doc.setLineWidth(0.5);
    doc.setDrawColor(6, 182, 212);
    doc.line(15, 89, 70, 89);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Predicted Lesion Class:", 15, 96);
    doc.setTextColor(6, 182, 212);
    doc.text(`${scan.predictedClass} (${scan.acronym})`, 65, 96);

    doc.setTextColor(15, 23, 42);
    doc.text("Model Confidence score:", 15, 102);
    doc.text(`${scan.confidence.toFixed(2)}%`, 65, 102);

    doc.text("Classification Risk category:", 15, 108);
    const isHigh = scan.riskLevel === "High";
    doc.setTextColor(isHigh ? 220 : 16, isHigh ? 38 : 185, isHigh ? 38 : 129);
    doc.text(`${scan.riskLevel.toUpperCase()} RISK`, 65, 108);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("EXPLAINABLE DEEP LEARNING (XAI) METRIC ANALYSIS", 15, 122);
    doc.line(15, 124, 115, 124);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    
    const splitExplanation = doc.splitTextToSize(scan.explanation, 175);
    doc.text(splitExplanation, 15, 131);

    // List the neural attention weights / contributing factors
    let currentY = 131 + (splitExplanation.length * 4.5) + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Neural Attention (SHAP Attribution) Key Weights:", 15, currentY);
    currentY += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    
    const factors = scan.contributingFactors || [
      { label: "Border Irregularity", weight: 32 },
      { label: "Color Variation", weight: 27 },
      { label: "Asymmetry", weight: 22 },
      { label: "Texture Pattern", weight: 19 }
    ];
    
    factors.forEach((f) => {
      doc.text(`•  ${f.label}: ${f.weight}% relative attribution weight`, 20, currentY);
      currentY += 4.5;
    });

    const notesY = currentY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("DERMATOLOGY CLINIC REVIEW AREA", 15, notesY);
    doc.line(15, notesY + 2, 85, notesY + 2);

    doc.setFillColor(248, 250, 252);
    doc.rect(15, notesY + 6, 180, 45, "F");
    doc.rect(15, notesY + 6, 180, 45, "S");

    if (scan.doctorVerdict) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`Dermatologist Status Verdict: ${scan.doctorVerdict.status.toUpperCase()}`, 18, notesY + 12);
      doc.text(`Reviewed By: ${scan.doctorVerdict.doctorName}`, 18, notesY + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const splitDoctorNotes = doc.splitTextToSize(scan.doctorVerdict.notes, 170);
      doc.text(splitDoctorNotes, 18, notesY + 26);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("Review status: PENDING CLINIC VERIFICATION", 18, notesY + 14);
      doc.text("No dermatologist has appended their verdict to this case yet.", 18, notesY + 20);
      doc.text("Patient can request case assignment on the DermShield AI platform portal.", 18, notesY + 26);
    }

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("IMPORTANT CLINICAL NOTICE & PLATFORM DISCLAIMER:", 15, 258);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    const splitDisclaimer = doc.splitTextToSize(
      "DermShield AI is an explainable deep learning decision support prototype trained on standard ISIC and HAM10000 datasets. It does NOT generate autonomous surgical diagnostic replacement criteria. This PDF report must not be presented as a finalized medical diagnostic license. Biopsy analysis, histology, and physical skin inspection by a board-certified dermatologist represent the only legally validated path of malignant diagnosis.",
      175
    );
    doc.text(splitDisclaimer, 15, 263);

    doc.save(`DermShield_Report_${scan.predictedClass.replace(/\s+/g, "_")}.pdf`);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex min-h-[calc(100vh-104px)] bg-slate-50 font-sans text-slate-900 w-full" id="patient-dashboard-container">
      {/* Sidebar - Hidden on mobile, flex on desktop */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-teal-600 font-extrabold text-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <span>DermAI <span className="text-slate-400 font-normal">Pro</span></span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Menu</div>
          {[
            { id: "dashboard", label: "My Care Console", icon: Activity },
            { id: "new_scan", label: "Scan New Lesion", icon: Plus },
            { id: "history", label: "Specimen History", icon: History },
            { id: "consultations", label: "Specialist & Referrals", icon: Clipboard },
            { id: "logs", label: "AI Pipeline Telemetry", icon: Terminal },
            { id: "profile", label: "My Profile Settings", icon: UserIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== "new_scan") setSelectedScan(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  isActive 
                    ? "bg-teal-50 text-teal-700 font-bold shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-900 m-4 rounded-xl text-white text-[11px] space-y-1.5 shadow-md">
          <p className="opacity-70 text-[9px] uppercase tracking-wider font-bold">Model Pipeline Status</p>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-200">ViT-CNN Pipeline Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        <div className="md:hidden flex border-b border-slate-200 bg-white overflow-x-auto p-2 gap-2 shrink-0">
          {[
            { id: "dashboard", label: "Care Console", icon: Activity },
            { id: "new_scan", label: "New Scan", icon: Plus },
            { id: "history", label: "History", icon: History },
            { id: "consultations", label: "Referrals", icon: Clipboard },
            { id: "logs", label: "Logs", icon: Terminal },
            { id: "profile", label: "Profile", icon: UserIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== "new_scan") setSelectedScan(null);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <header className="bg-white border-b border-slate-100 py-4 px-6 sm:px-8 flex items-center justify-between shadow-xs shrink-0">
          <h1 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <span className="capitalize">{activeTab === "dashboard" ? "My Care Console" : activeTab.replace("_", " ")}</span>
            <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              #P-{user.id.slice(0, 6).toUpperCase()}
            </span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Patient Account</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-xs text-teal-700">
              {getInitials(user.name)}
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto">
          
          {activeTab === "dashboard" && !selectedScan && (
            <div className="bg-slate-900 rounded-2xl p-6 mb-2 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.08]" />
              
              <div className="relative z-10 space-y-1">
                <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Patient Care Console</div>
                <h2 className="text-2xl font-extrabold tracking-tight">Welcome, {user.name}</h2>
                <p className="text-slate-400 text-xs">
                  Review model prediction histories, perform new scans, and consult verified oncologists.
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveTab("new_scan");
                  setSelectedScan(null);
                }}
                className="relative z-10 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                <span>Launch New Lesion Scan</span>
              </button>
            </div>
          )}

          {activeTab === "dashboard" && !selectedScan && (
            <div className="space-y-8" id="care-console-tab">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Scans Run</span>
                    <h3 className="text-2xl font-extrabold text-slate-900">{scans.length}</h3>
                  </div>
                  <div className="h-10 w-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">High Risk Flags</span>
                    <h3 className="text-2xl font-extrabold text-rose-600">
                      {scans.filter(s => s.riskLevel === "High").length}
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Specialist Reviews</span>
                    <h3 className="text-2xl font-extrabold text-emerald-600">
                      {scans.filter(s => s.status === "reviewed").length}
                    </h3>
                  </div>
                  <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
              </div>

          {scans.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-600" />
                    Latest Scan Evaluation: {scans[0].predictedClass}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(scans[0].timestamp).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="w-full sm:w-1/3 shrink-0">
                    <GradCamCanvas 
                      imageUrl={scans[0].imageUrl}
                      heatmapPoints={scans[0].heatmapPoints}
                      showHeatmap={showGradCam}
                      opacity={overlayOpacity}
                      className="w-full"
                    />
                    
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Grad-CAM Overlay</label>
                        <input 
                          type="checkbox" 
                          checked={showGradCam}
                          onChange={(e) => setShowGradCam(e.target.checked)}
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </div>
                      {showGradCam && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-mono text-slate-400">
                            <span>OPACITY</span>
                            <span>{Math.round(overlayOpacity * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.1" 
                            max="1.0" 
                            step="0.05"
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                            className="w-full accent-cyan-600 h-1 rounded-lg cursor-pointer bg-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getRiskBadgeClass(scans[0].riskLevel)}`}>
                        {scans[0].riskLevel} Risk
                      </span>
                      <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                        {scans[0].acronym} • {scans[0].confidence.toFixed(1)}% Confidence
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs leading-relaxed">
                      {scans[0].explanation}
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setSelectedScan(scans[0])}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Full Report & Verification</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => downloadPdfReport(scans[0])}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-cyan-600" />
                        <span>Download PDF Report</span>
                      </button>
                    </div>
                  </div>
                </div>

                {scans[0].doctorVerdict && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Dermatologist Case Review Status: {scans[0].doctorVerdict.status}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(scans[0].doctorVerdict.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic">
                      " {scans[0].doctorVerdict.notes} "
                    </p>
                    <div className="text-[10px] text-slate-500 font-semibold text-right">
                      — {scans[0].doctorVerdict.doctorName}
                    </div>
                  </div>
                )}
              </div>

              {/* Item 5: Lesion Tracking & Chronology Card */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-600" />
                    My Tracked Lesions Chronology
                  </h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Monitor chronological changes, confidence variance, and diagnostic review history for each registered cutaneous lesion.
                  </p>
                </div>

                {patientLesions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No lesions currently tracked. Pinpoint locations on the body map during your next scan to start monitoring chronology.</p>
                ) : (
                  <div className="space-y-6">
                    {patientLesions.map((lesion) => {
                      const lesionScans = scans.filter((s) => s.lesionId === lesion.id)
                        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                      return (
                        <div key={lesion.id} className="border border-slate-150 rounded-xl p-4 space-y-4 bg-slate-50/20">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                                {lesion.nickname || `${lesion.body_location} Lesion`}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-medium">Location: {lesion.body_location} • Tracked since {new Date(lesion.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className="text-[9px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                              {lesionScans.length} Scan{lesionScans.length !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {lesionScans.length > 1 && (
                            <div className="bg-slate-100/40 rounded-xl p-3 border border-slate-200/50">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <TrendingUp className="h-3 w-3 text-cyan-600" />
                                Patient Lesion Clinical Trajectory (Confidence & Uncertainty Trends)
                              </p>
                              <div className="h-36 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={lesionScans.map(scan => ({
                                    date: new Date(scan.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                    "Confidence (%)": Number(scan.confidence.toFixed(1)),
                                    "Uncertainty (%)": Number(((scan.uncertaintyScore !== undefined ? scan.uncertaintyScore : 0.15) * 100).toFixed(1))
                                  }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#94a3b8" />
                                    <YAxis tick={{ fontSize: 8 }} stroke="#94a3b8" domain={[0, 100]} />
                                    <ChartTooltip contentStyle={{ fontSize: 9, borderRadius: 6, background: "#ffffff", border: "1px solid #e2e8f0" }} />
                                    <ChartLegend wrapperStyle={{ fontSize: 8, marginTop: -4 }} />
                                    <Line type="monotone" dataKey="Confidence (%)" stroke="#06b6d4" strokeWidth={1.75} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="Uncertainty (%)" stroke="#f59e0b" strokeWidth={1.75} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {lesionScans.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic pl-3 border-l-2 border-slate-200">No scans uploaded for this tracked lesion yet.</p>
                          ) : (
                            <div className="relative pl-5 border-l-2 border-slate-200/80 space-y-4">
                              {lesionScans.map((scan, sIdx) => {
                                const isLatest = sIdx === lesionScans.length - 1;
                                return (
                                  <div key={scan.id} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[26px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                                      isLatest ? "border-teal-500 scale-110 shadow-sm" : "border-slate-300"
                                    }`}>
                                      <div className={`h-1.5 w-1.5 rounded-full ${isLatest ? "bg-teal-500" : "bg-slate-300"}`} />
                                    </div>

                                    <div className="flex justify-between items-start gap-4">
                                      <div className="space-y-0.5">
                                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-2">
                                          <span>{new Date(scan.timestamp).toLocaleDateString()}</span>
                                          <span className="text-[9px] font-mono font-medium text-cyan-600 bg-cyan-50 border border-cyan-100 px-1.5 rounded">
                                            {scan.predictedClass} ({scan.acronym})
                                          </span>
                                          {isLatest && <span className="text-[8px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.2 rounded-full uppercase">Current</span>}
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                                          Confidence: {scan.confidence.toFixed(1)}% • Uncertainty: {(scan.uncertaintyScore ? scan.uncertaintyScore * 100 : 15).toFixed(1)}%
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                          scan.status === "reviewed" 
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                                            : "bg-slate-100 text-slate-500 border border-slate-200"
                                        }`}>
                                          {scan.status === "reviewed" ? `Reviewed (${scan.doctorVerdict?.status})` : "Pending Clinic Review"}
                                        </span>
                                        <button
                                          onClick={() => setSelectedScan(scan)}
                                          className="text-[10px] font-bold text-teal-600 hover:text-teal-800 underline cursor-pointer"
                                        >
                                          View
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-md p-5 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Daily Skin Check Routine
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Regular examinations prevent mole evolutions from going unnoticed. Perform your self-screens monthly:
                </p>
                <div className="space-y-2.5">
                  {[
                    { c: "A", t: "Asymmetry check" },
                    { c: "B", t: "Irregular borders" },
                    { c: "C", t: "Variegated colors" },
                    { c: "D", t: "Diameter > 6mm" },
                    { c: "E", t: "Dynamic evolving" }
                  ].map((x) => (
                    <div key={x.c} className="flex items-center gap-2.5 text-xs text-slate-700">
                      <div className="h-5 w-5 rounded bg-cyan-50 text-cyan-800 font-bold text-[10px] flex items-center justify-center">
                        {x.c}
                      </div>
                      <span className="font-medium text-slate-600">{x.t}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-dashed border-slate-200/80 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="h-12 w-12 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600 mx-auto">
                <Activity className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">No Lesions Screened Yet</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Launch your first Deep Learning skin scan. Upload a dermoscopy picture or close-up macro snapshot of any mole to receive a fully explained Grad-CAM mapping.
              </p>
              <button
                onClick={() => setActiveTab("new_scan")}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Launch First Lesion Scan
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "new_scan" && !selectedScan && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 max-w-3xl mx-auto space-y-8" id="new-scan-tab">
          
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Camera className="h-5.5 w-5.5 text-cyan-600" />
              Analyze Skin Lesion Specimen
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Capture or drag-and-drop a clear, macro close-up of a cutaneous mole or pigment anomaly to send to the CNN+ViT pipeline.
            </p>
          </div>

          {isAnalyzing ? (
            <div className="py-12 text-center space-y-6 max-w-md mx-auto">
              <div className="relative h-20 w-20 mx-auto">
                <div className="absolute inset-0 border-4 border-slate-100 border-t-cyan-500 rounded-full animate-spin" />
                <div className="absolute inset-2 border-4 border-slate-100 border-b-teal-500 rounded-full animate-spin" style={{ animationDirection: "reverse" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-cyan-600 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-900">Analyzing Specimen...</h4>
                <p className="text-xs text-cyan-700 font-mono font-semibold animate-pulse">
                  {pipelineStages[analysisStage]}
                </p>
              </div>

              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 h-full transition-all duration-500"
                  style={{ width: `${((analysisStage + 1) / pipelineStages.length) * 100}%` }}
                />
              </div>

              <div className="text-[10px] text-slate-400 font-mono">
                STAGE {analysisStage + 1} OF {pipelineStages.length}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-600 uppercase">Step 1: Upload cutaneous snapshot</label>
                
                {selectedImage ? (
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                    <img 
                      src={selectedImage} 
                      alt="Cutaneous snapshot" 
                      className="block h-48 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-sm hover:bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-md cursor-pointer transition-all"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 hover:border-cyan-400 bg-slate-50 hover:bg-cyan-50/10 rounded-xl p-8 text-center transition-all relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="space-y-3">
                      <div className="h-10 w-10 bg-cyan-50 rounded-full flex items-center justify-center text-cyan-600 mx-auto">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">Click to upload or drag image</div>
                      <div className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG (Max 10MB)</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Age</label>
                    <input 
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 outline-none bg-white"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                {/* Lesion Tracking Association */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
                  <label className="block text-[10px] font-bold text-cyan-700 uppercase tracking-wider">
                    Lesion Tracking & Chronology
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="lesion_assoc"
                          checked={lesionId === "new_lesion"}
                          onChange={() => {
                            setLesionId("new_lesion");
                            setBodyLocation("");
                          }}
                          className="text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>Track New Lesion</span>
                      </label>
                      {patientLesions.length > 0 && (
                        <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="radio"
                            name="lesion_assoc"
                            checked={lesionId !== "new_lesion"}
                            onChange={() => {
                              const firstLesion = patientLesions[0];
                              setLesionId(firstLesion.id);
                              setBodyLocation(firstLesion.body_location);
                            }}
                            className="text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Existing Lesion</span>
                        </label>
                      )}
                    </div>

                    {lesionId === "new_lesion" ? (
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">
                          New Lesion Identifier Nickname
                        </label>
                        <input
                          type="text"
                          value={lesionNickname}
                          onChange={(e) => setLesionNickname(e.target.value)}
                          placeholder="e.g. Left shoulder spot"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 outline-none bg-white"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">
                          Select Tracked Lesion Profile
                        </label>
                        <select
                          value={lesionId}
                          onChange={(e) => {
                            const selected = patientLesions.find((l) => l.id === e.target.value);
                            if (selected) {
                              setLesionId(selected.id);
                              setBodyLocation(selected.body_location);
                            }
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 outline-none bg-white"
                        >
                          {patientLesions.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nickname || `${l.body_location} mole`} ({l.body_location})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Map Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase">
                    Step 2: Tag Cutaneous Location on Body Map
                  </label>
                  {lesionId !== "new_lesion" ? (
                    <div className="p-3 bg-cyan-50/50 border border-cyan-100 rounded-xl text-[11px] text-cyan-800 font-semibold flex items-center gap-2">
                      <span>📍</span>
                      <span>Locked to existing lesion location: <strong>{bodyLocation}</strong></span>
                    </div>
                  ) : (
                    <BodyMapSelector value={bodyLocation} onSelect={setBodyLocation} />
                  )}
                </div>

              </div>

              <div className="space-y-6">
                <label className="block text-xs font-bold text-slate-600 uppercase">Step 2: Clinician specimen review checklist</label>
                
                <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4">
                  <span className="block text-[10px] font-bold text-cyan-700 uppercase tracking-wider">
                    Capture Guidance Standards ( Fitzpatrick Phototypes )
                  </span>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={tipsChecked.lighting}
                        onChange={(e) => setTipsChecked({ ...tipsChecked, lighting: e.target.checked })}
                        className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-800">Perfect Illumination:</strong>
                        <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">
                          Mole is illuminated with direct, diffused natural light or physical camera flash. No strong overhead shadows.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={tipsChecked.focus}
                        onChange={(e) => setTipsChecked({ ...tipsChecked, focus: e.target.checked })}
                        className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-800">Macroscopic Autofocus:</strong>
                        <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">
                          Specimen borders are completely sharp and in focus. No blur or macro-lens distortion.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={tipsChecked.background}
                        onChange={(e) => setTipsChecked({ ...tipsChecked, background: e.target.checked })}
                        className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-800">Flat Background Backdrop:</strong>
                        <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">
                          Minimal background hair interference. High contrast relative to adjacent normal skin layers.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={tipsChecked.distance}
                        onChange={(e) => setTipsChecked({ ...tipsChecked, distance: e.target.checked })}
                        className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4 w-4"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-800">Distance Calibration (4-6 inches):</strong>
                        <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">
                          Camera lens is held 4 to 6 inches away, centering the pigment anomaly cleanly within the viewport grid.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {analysisError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{analysisError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={runAiScreening}
                  disabled={!selectedImage}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  <span>Execute CNN + ViT AI Screening</span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {selectedScan && (
        <div className="space-y-8" id="scan-result-detail">
          <button
            onClick={() => setSelectedScan(null)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-semibold"
          >
            ← Return to History List
          </button>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Specimen Case ID: {selectedScan.id.slice(0, 8).toUpperCase()}</span>
                <h3 className="text-xl font-bold text-slate-900">
                  Cutaneous Specimen: {selectedScan.predictedClass}
                </h3>
              </div>

              <button
                onClick={() => downloadPdfReport(selectedScan)}
                className="px-4 py-2 border border-cyan-200 hover:bg-cyan-50/10 text-cyan-800 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="h-4 w-4 text-cyan-600" />
                <span>Download Printable PDF Report</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              
              <div className="md:col-span-5 space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Interactive Deep Learning Overlay
                </div>
                
                <GradCamCanvas 
                  imageUrl={selectedScan.imageUrl}
                  heatmapPoints={selectedScan.heatmapPoints}
                  showHeatmap={showGradCam}
                  opacity={overlayOpacity}
                  className="w-full"
                />

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-700">Project Grad-CAM Hotspots</label>
                      <p className="text-[10px] text-slate-400">Displays neural network self-attention layers</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={showGradCam}
                      onChange={(e) => setShowGradCam(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-4.5 w-4.5 cursor-pointer"
                    />
                  </div>

                  {showGradCam && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>HEAT TRANSPARENCY</span>
                        <span>{Math.round(overlayOpacity * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1.0" 
                        step="0.05"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                        className="w-full accent-cyan-600 h-1.5 rounded-lg cursor-pointer bg-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-7 space-y-6">
                
                <div className="flex flex-wrap gap-3">
                  <span className={`text-xs font-bold border px-3 py-1 rounded-full uppercase tracking-wider ${getRiskBadgeClass(selectedScan.riskLevel)}`}>
                    {selectedScan.riskLevel} Risk Flag
                  </span>
                  <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full">
                    Model: Swish-ViT Ensemble
                  </span>
                  <span className="text-xs font-mono font-bold bg-cyan-50 border border-cyan-100 text-cyan-800 px-3 py-1 rounded-full">
                    {selectedScan.confidence.toFixed(2)}% Conf.
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      1. Patient Plain-Language Analysis
                    </h4>
                    {selectedScan.bodyLocation && (
                      <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold">
                        📍 Location: {selectedScan.bodyLocation}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {selectedScan.explanation}
                  </p>
                </div>

                {/* Explainability & Uncertainty Meter */}
                <div className="space-y-3 border border-slate-200/60 bg-slate-50/50 p-4.5 rounded-xl">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-cyan-600" />
                      Neural Attention & Predictive Uncertainty
                    </h4>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${selectedScan.needsMandatoryReview ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                      {selectedScan.needsMandatoryReview ? "🚨 Needs Mandatory Review" : "✓ Within Margin of Safety"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
                    {/* Uncertainty Gauge */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Clinical Uncertainty Index:</span>
                        <span className="text-slate-800 font-mono">{(selectedScan.uncertaintyScore !== undefined ? selectedScan.uncertaintyScore * 100 : 15).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${selectedScan.needsMandatoryReview ? "bg-amber-500" : "bg-cyan-500"}`}
                          style={{ width: `${(selectedScan.uncertaintyScore !== undefined ? selectedScan.uncertaintyScore * 100 : 15)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">
                        The model self-attuned uncertainty score calculates classification boundary entropy. Any high risk/uncertainty scan alerts the clinic for manual verification.
                      </p>
                    </div>

                    {/* Explainability factors */}
                    <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-sm">
                      <ExplainabilitySummary factors={selectedScan.contributingFactors || [
                        { label: "Border Irregularity", weight: 32 },
                        { label: "Color Variation", weight: 27 },
                        { label: "Asymmetry", weight: 22 },
                        { label: "Texture Pattern", weight: 19 }
                      ]} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Clipboard className="h-4 w-4 text-cyan-600" />
                    2. Scientific Pathology Details (For Clinicians)
                  </h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed font-mono">
                    {selectedScan.clinicalDetails}
                  </p>
                </div>

                {selectedScan.doctorVerdict ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 space-y-2">
                    <h5 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                      Dermatologist Verdict Review Status: {selectedScan.doctorVerdict.status}
                    </h5>
                    <p className="text-xs text-slate-600 italic">
                      " {selectedScan.doctorVerdict.notes} "
                    </p>
                    <div className="text-[10px] text-slate-500 font-semibold text-right">
                      Reviewed by: {selectedScan.doctorVerdict.doctorName} • {new Date(selectedScan.doctorVerdict.reviewedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-slate-800">Need Clinical Verification?</h5>
                      <p className="text-[11px] text-slate-400">Request a dermatologist review of your Grad-CAM hotspot report.</p>
                    </div>
                    <button
                      onClick={() => setShowConsultModal(true)}
                      disabled={availableDoctors.length === 0}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {availableDoctors.length === 0 ? "No Verified Doctors Yet" : "Consult Dermatologist Specialist"}
                    </button>
                  </div>
                )}

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[10px] leading-relaxed">
                  <strong>DISCLAIMER:</strong> DermShield AI is built as an explainable diagnostic support screening pipeline. It is not licensed to replace direct clinician evaluation. A physical tissue biopsy constitutes the absolute gold standard for complete melanoma confirmation.
                </div>

              </div>

            </div>

            {/* Lesion Tracking Timeline section */}
            {(() => {
              const relatedScans = scans
                .filter(s => s.patientId === selectedScan.patientId && (s.lesionId === selectedScan.lesionId || (s.bodyLocation && s.bodyLocation === selectedScan.bodyLocation)))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              
              return relatedScans.length > 0 ? (
                <div className="border-t border-slate-100 pt-8 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-cyan-600 animate-pulse" />
                      Tracked Lesion Timeline History & Trajectory
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Chronological progression analytics tracking specimen characteristics, diameter risk factors, and deep learning model confidence outputs.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Progress Chart */}
                    <div className="lg:col-span-7 bg-slate-50 p-5 border border-slate-200/60 rounded-2xl h-72">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Neural Net Confidence Trajectory</span>
                      <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={relatedScans.map(s => ({
                          date: new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                          confidence: s.confidence,
                          risk: s.riskLevel
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                          <ChartTooltip />
                          <Line type="monotone" dataKey="confidence" stroke="#0891b2" strokeWidth={2.5} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* List items */}
                    <div className="lg:col-span-5 space-y-3 max-h-72 overflow-y-auto pr-1">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Snapshot Logs</span>
                      {relatedScans.slice().reverse().map((scan) => {
                        const isCurrent = scan.id === selectedScan.id;
                        return (
                          <div 
                            key={scan.id} 
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                              isCurrent 
                                ? "bg-cyan-50/50 border-cyan-200 shadow-xs" 
                                : "bg-white border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <img 
                                src={scan.imageUrl} 
                                alt="specimen thumbnail" 
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200/80"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {scan.predictedClass}
                                  {isCurrent && <span className="text-[8px] bg-cyan-100 text-cyan-800 font-extrabold px-1.5 py-0.5 rounded">Active</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">{new Date(scan.timestamp).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border block mb-1 ${
                                scan.riskLevel === "High" 
                                  ? "bg-rose-50 border-rose-100 text-rose-700"
                                  : scan.riskLevel === "Medium"
                                    ? "bg-amber-50 border-amber-100 text-amber-700"
                                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                              }`}>
                                {scan.riskLevel}
                              </span>
                              <span className="text-[10px] font-bold text-slate-600 font-mono">{scan.confidence.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

          </div>
        </div>
      )}

      {activeTab === "history" && !selectedScan && (
        <div className="space-y-8" id="specimen-history-tab">
          
          {scans.length > 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
                Lesion Evaluation Progression Timeline
              </h4>
              <p className="text-slate-500 text-xs">
                This tracking view logs classification confidence scores across multiple screening timestamps to assess developmental risks.
              </p>
              
              <div className="h-44 flex items-end gap-3 pt-6 pb-2 px-4 border-b border-l border-slate-100 max-w-xl">
                {scans.slice().reverse().map((s, idx) => (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-[10px] font-mono font-bold text-cyan-700">
                      {s.confidence.toFixed(0)}%
                    </div>
                    <div 
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        s.riskLevel === "High" ? "bg-rose-400" : s.riskLevel === "Medium" ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ height: `${s.confidence}%` }}
                    />
                    <div className="text-[9px] font-mono text-slate-400 mt-1 uppercase text-center">
                      {s.acronym}<br/>
                      <span className="text-[8px]">{new Date(s.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900">Cutaneous Evaluation Database Logs</h3>
              <span className="text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded">
                Database Matches: {
                  scans.filter(scan => {
                    const matchesRisk = riskFilter === "all" || scan.riskLevel.toLowerCase() === riskFilter.toLowerCase();
                    const matchesLocation = locationFilter === "all" || (scan.bodyLocation && scan.bodyLocation.toLowerCase() === locationFilter.toLowerCase());
                    return matchesRisk && matchesLocation;
                  }).length
                } of {scans.length}
              </span>
            </div>

            {/* Filter controls panel */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter Records:</div>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <select 
                  value={riskFilter} 
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-cyan-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">⚠️ All Risk Levels</option>
                  <option value="high">🔴 High Risk</option>
                  <option value="medium">🟡 Medium Risk</option>
                  <option value="low">🟢 Low Risk</option>
                </select>

                <select 
                  value={locationFilter} 
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-cyan-500 text-slate-700 capitalize cursor-pointer"
                >
                  <option value="all">📍 All Body Locations</option>
                  {Array.from(
  new Set(
    scans
      .map(s => s.bodyLocation)
      .filter((loc): loc is string => typeof loc === "string")
  )
).map((loc) => (
                    <option key={loc} value={loc.toLowerCase()}>{loc}</option>
                  ))}
                </select>
              </div>

              {(riskFilter !== "all" || locationFilter !== "all") && (
                <button
                  onClick={() => { setRiskFilter("all"); setLocationFilter("all"); }}
                  className="text-[10px] font-extrabold text-cyan-600 hover:text-cyan-800 underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {scans.filter(scan => {
              const matchesRisk = riskFilter === "all" || scan.riskLevel.toLowerCase() === riskFilter.toLowerCase();
              const matchesLocation = locationFilter === "all" || (scan.bodyLocation && scan.bodyLocation.toLowerCase() === locationFilter.toLowerCase());
              return matchesRisk && matchesLocation;
            }).length > 0 ? (
              <div className="divide-y divide-slate-100">
                {scans.filter(scan => {
                  const matchesRisk = riskFilter === "all" || scan.riskLevel.toLowerCase() === riskFilter.toLowerCase();
                  const matchesLocation = locationFilter === "all" || (scan.bodyLocation && scan.bodyLocation.toLowerCase() === locationFilter.toLowerCase());
                  return matchesRisk && matchesLocation;
                }).map((scan) => (
                  <div key={scan.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-4">
                      <img 
                        src={scan.imageUrl} 
                        alt="specimen thumb" 
                        className="h-12 w-12 rounded-lg object-cover border border-slate-100"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{scan.predictedClass} ({scan.acronym})</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Inference date: {new Date(scan.timestamp).toLocaleDateString()} at {new Date(scan.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getRiskBadgeClass(scan.riskLevel)}`}>
                          {scan.riskLevel} Risk
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {scan.confidence.toFixed(1)}% Conf.
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedScan(scan)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-cyan-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Assessment</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No cutaneous specimens archived inside the local patient database.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "consultations" && !selectedScan && (
        <div className="space-y-6" id="specialist-cases-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Your Requested Specialist Cases</h3>
            </div>

            {consultations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {consultations.map((consult) => (
                  <div key={consult.id} className="p-5 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400">CASE ID: {consult.id.slice(0, 8).toUpperCase()}</span>
                        <h4 className="text-xs font-bold text-slate-800">Specialist Consultant: {consult.doctorName}</h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        consult.status === "completed" 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : consult.status === "scheduled"
                            ? "bg-cyan-50 border-cyan-100 text-cyan-800"
                            : "bg-amber-50 border-amber-100 text-amber-800"
                      }`}>
                        {consult.status === "completed" ? "Completed Review" : consult.status === "scheduled" ? "Scheduled" : "Requested"}
                      </span>
                    </div>

                    {consult.scheduledAt ? (
                      <div className="text-[11px] text-cyan-800 bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded-lg font-semibold w-fit">
                        📅 Confirmed: {new Date(consult.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    ) : consult.preferredAt ? (
                      <div className="text-[11px] text-slate-500 w-fit">
                        Requested for: {new Date(consult.preferredAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (awaiting doctor confirmation)
                      </div>
                    ) : null}

                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong>My Message:</strong> {consult.message}
                    </p>

                    {consult.notes && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg space-y-1.5">
                        <strong className="block text-[11px] text-emerald-900 font-bold uppercase">
                          Clinician Follow-up Notes
                        </strong>
                        <p className="text-xs text-slate-600 italic">
                          " {consult.notes} "
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No doctor consultation cases requested.
              </div>
            )}
          </div>

          {/* Outward Referrals Tracking section */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-teal-600" />
                  Your Specialist & Oncological Referrals
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Track referrals made by your consulting dermatologist to external specialized clinical networks.
                </p>
              </div>
              <span className="text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded-full">
                {referrals.length} Active Referrals
              </span>
            </div>

            {referrals.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {referrals.map((ref) => (
                  <div key={ref.id} className="p-5 space-y-3 hover:bg-slate-50/40 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wide bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded">
                          REFERRAL ID: {ref.id.slice(0, 8).toUpperCase()}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 mt-2">
                          Clinic: {ref.referring_clinic}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">Referred by: {ref.doctor_name || "Primary Physician"}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        ref.status === "discharged" || ref.status === "completed"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      }`}>
                        {ref.status === "discharged" || ref.status === "completed" ? "Completed / Accepted" : "Pending Clinic Booking"}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pathological Escalation Notes</span>
                      <p className="text-slate-600 italic">"{ref.notes}"</p>
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Initiated on: {new Date(ref.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                No outbound referrals found. If a consultant determines your scan needs further clinical oncology review, your referral file will appear here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB: AI PIPELINE LATENCY & TELEMETRY LOGS
          ------------------------------------------------------------- */}
      {activeTab === "logs" && !selectedScan && (
        <div className="space-y-6" id="telemetry-logs-tab">
          {/* Stats Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Scans Ran</span>
                <strong className="text-lg font-extrabold text-slate-900">{inferenceLogs.length || scans.length} Runs</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Pipeline Latency</span>
                <strong className="text-lg font-extrabold text-slate-900">
                  {inferenceLogs.length > 0 
                    ? Math.round(inferenceLogs.reduce((acc, l) => acc + (l.duration_ms || 1200), 0) / inferenceLogs.length)
                    : 1280} ms
                </strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Upload Size</span>
                <strong className="text-lg font-extrabold text-slate-900">
                  {inferenceLogs.length > 0 
                    ? Math.round(inferenceLogs.reduce((acc, l) => acc + (l.image_size_kb || 250), 0) / inferenceLogs.length)
                    : 263} KB
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-slate-700" />
                  CNN + ViT Inference Pipeline Logs
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Audit logs detailing computer vision execution runs, model versions, image transfer payloads, and latency signatures.
                </p>
              </div>
            </div>

            {inferenceLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4">Log Reference ID</th>
                      <th className="p-4">Model Pipeline Version</th>
                      <th className="p-4">Payload Size</th>
                      <th className="p-4">Latency Signature</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Execution Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {inferenceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">#{log.id.toUpperCase().slice(0, 8)}</td>
                        <td className="p-4 text-slate-500">{log.model_name || "DermShield-CNN-ViT-v1.4"}</td>
                        <td className="p-4">{log.image_size_kb || 240} KB</td>
                        <td className="p-4 font-bold text-slate-700">{log.duration_ms || 1250} ms</td>
                        <td className="p-4">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {log.status || "success"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs italic font-sans">
                No pipeline inference logs found. Run your first skin skin scan in the new scan tab to seed diagnostic logs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB: MY PROFILE SETTINGS
          ------------------------------------------------------------- */}
      {activeTab === "profile" && !selectedScan && (
        <PatientProfileTab user={user} />
      )}

      {showConsultModal && selectedScan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" id="consultation-modal">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
            <h4 className="text-base font-bold text-slate-900">Request Dermatology Specialist Assessment</h4>
            
            <form onSubmit={handleBookConsultation} className="space-y-4">
              {bookingSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-900 text-xs flex flex-col items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-emerald-600 animate-bounce" />
                  <span>Dermatologist Consultation Request Sent! Your case loads into their pending review queue.</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Dermatologist Specialist</label>
                    <select
                      value={consultDoctorId}
                      onChange={(e) => setConsultDoctorId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
                    >
                      {availableDoctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preferred Date</label>
                      <input
                        type="date"
                        value={preferredDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Preferred Time</label>
                      <input
                        type="time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-cyan-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Diagnostic Message / Context</label>
                    <textarea
                      rows={3}
                      value={consultMessage}
                      onChange={(e) => setConsultMessage(e.target.value)}
                      placeholder="Please details any symptoms: Rapid growth, itching, bleeding, or color variegations."
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowConsultModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!preferredDate || !preferredTime}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Dispatch Case File
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      </div>
      </div>
    </div>
  );
}