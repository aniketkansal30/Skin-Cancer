import React, { useState, useEffect } from "react";
import { 
  ClipboardList, CheckCircle, AlertTriangle, Users, BarChart2, 
  ChevronRight, ArrowLeft, Send, ThumbsUp, RefreshCw, Layers, Sliders
} from "lucide-react";
import { User, ScanResult, Consultation } from "../types";
import GradCamCanvas from "./GradCamCanvas";
import { supabase } from "../lib/supabaseClient";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";

interface DoctorDashboardProps {
  user: User;
}

export default function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "history" | "analytics" | "consultations">("queue");
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);

  // Verdict Form State
  const [verdict, setVerdict] = useState<"Agree" | "Disagree" | "Needs Biopsy" | "Needs Follow-up">("Agree");
  const [verdictNotes, setVerdictNotes] = useState("");
  const [submittingVerdict, setSubmittingVerdict] = useState(false);
  const [verdictSuccess, setVerdictSuccess] = useState(false);

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
    doctorVerdict: row.doctor_verdict || undefined
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

  // Scheduling confirmation state
  const [confirmingConsultId, setConfirmingConsultId] = useState<string | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmTime, setConfirmTime] = useState("");
  const [completingConsultId, setCompletingConsultId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");

  // Load doctor data directly from Supabase
  const loadDoctorData = async () => {
    try {
      // Doctors see the full platform-wide review queue (any patient's scans),
      // ordered so the newest submissions appear first.
      const { data: scansData, error: scansError } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false });

      if (scansError) throw scansError;
      setScans((scansData || []).map(mapScanRow));

      // Consultations specifically routed to this doctor
      const { data: consultsData, error: consultsError } = await supabase
        .from("consultations")
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (consultsError) throw consultsError;
      setConsultations((consultsData || []).map(mapConsultationRow));
    } catch (err) {
      console.error("Failed to load doctor data", err);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [user.id, activeTab]);

  // Submit a clinical verdict — updates the scan row's doctor_verdict + status directly
  const handleSubmitVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScan) return;

    setSubmittingVerdict(true);
    try {
      const { error } = await supabase
        .from("scans")
        .update({
          status: "reviewed",
          doctor_verdict: {
            status: verdict,
            notes: verdictNotes,
            reviewedAt: new Date().toISOString(),
            doctorId: user.id,
            doctorName: user.name
          }
        })
        .eq("id", selectedScan.id);

      if (error) throw error;

      setVerdictSuccess(true);
      setTimeout(() => {
        setVerdictSuccess(false);
        setSelectedScan(null);
        setVerdictNotes("");
        loadDoctorData();
      }, 1500);
    } catch (err) {
      console.error("Verdict submit failed", err);
    } finally {
      setSubmittingVerdict(false);
    }
  };

  // Confirm a consultation's schedule with a doctor-set date/time
  const handleConfirmSchedule = async (consultId: string) => {
    if (!confirmDate || !confirmTime) return;
    try {
      const scheduledAt = new Date(`${confirmDate}T${confirmTime}`).toISOString();
      const { error } = await supabase
        .from("consultations")
        .update({ status: "scheduled", scheduled_at: scheduledAt })
        .eq("id", consultId);

      if (error) throw error;

      setConfirmingConsultId(null);
      setConfirmDate("");
      setConfirmTime("");
      loadDoctorData();
    } catch (err) {
      console.error("Failed to confirm schedule", err);
    }
  };

  // Mark a consultation as completed with closing notes
  const handleCompleteConsultation = async (consultId: string) => {
    try {
      const { error } = await supabase
        .from("consultations")
        .update({ status: "completed", notes: completionNotes })
        .eq("id", consultId);

      if (error) throw error;

      setCompletingConsultId(null);
      setCompletionNotes("");
      loadDoctorData();
    } catch (err) {
      console.error("Failed to complete consultation", err);
    }
  };
  const pendingCases = scans.filter((s) => s.status === "pending_review" || s.status === "none");
  const reviewedCases = scans.filter((s) => s.status === "reviewed");

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High": return "text-rose-600 bg-rose-50 border-rose-200";
      case "Medium": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-emerald-600 bg-emerald-50 border-emerald-200";
    }
  };

  // Recharts Analytics calculations
  const classCounts: { [key: string]: number } = {};
  scans.forEach((s) => {
    classCounts[s.predictedClass] = (classCounts[s.predictedClass] || 0) + 1;
  });

  const chartData = Object.keys(classCounts).map((key) => ({
    name: key.split(" ")[0],
    cases: classCounts[key]
  }));

  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  scans.forEach((s) => {
    if (s.riskLevel === "Low") riskCounts.Low++;
    if (s.riskLevel === "Medium") riskCounts.Medium++;
    if (s.riskLevel === "High") riskCounts.High++;
  });

  const pieChartData = [
    { name: "Low Risk", value: riskCounts.Low, color: "#10b981" },
    { name: "Medium Risk", value: riskCounts.Medium, color: "#f59e0b" },
    { name: "High Risk", value: riskCounts.High, color: "#ef4444" }
  ];

  // Real concordance rate: % of reviewed scans where doctor verdict was "Agree"
  const agreementRate = reviewedCases.length > 0
    ? Math.round((reviewedCases.filter(s => s.doctorVerdict?.status === "Agree").length / reviewedCases.length) * 100)
    : 0;

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex min-h-[calc(100vh-104px)] bg-slate-50 font-sans text-slate-900 w-full" id="doctor-console-container">
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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Workspace</div>
          {[
            { id: "queue", label: "Active Review Queue", icon: ClipboardList },
            { id: "consultations", label: "Consultation Requests", icon: Users },
            { id: "history", label: "Patient Case History", icon: Users },
            { id: "analytics", label: "Case Load Analytics", icon: BarChart2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedScan(null);
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

        {/* Model Status block */}
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
        
        {/* Mobile Navigation bar */}
        <div className="md:hidden flex border-b border-slate-200 bg-white overflow-x-auto p-2 gap-2 shrink-0">
          {[
            { id: "queue", label: "Review Queue", icon: ClipboardList },
            { id: "consultations", label: "Consultations", icon: Users },
            { id: "history", label: "Patient History", icon: Users },
            { id: "analytics", label: "Analytics", icon: BarChart2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedScan(null);
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

        {/* Header Block inside Main Area */}
        <header className="bg-white border-b border-slate-100 py-4 px-6 sm:px-8 flex items-center justify-between shadow-xs shrink-0">
          <h1 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <span className="capitalize">{activeTab === "queue" ? "Clinical Case Review" : activeTab}</span>
            <span className="text-[10px] font-mono font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
              MD Board-Certified
            </span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Specialist Consultant</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-xs text-teal-700">
              {getInitials(user.name)}
            </div>
          </div>
        </header>

        {/* Main Padded Content */}
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto">
          
          {/* Clinician Header Card */}
          {!selectedScan && (
            <div className="bg-slate-900 rounded-2xl p-6 mb-2 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.08]" />
              
              <div className="relative z-10 space-y-1">
                <div className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Clinical Oncopathology Workspace</div>
                <h2 className="text-2xl font-extrabold tracking-tight">{user.name}</h2>
                <p className="text-slate-400 text-xs">
                  Reviewing clinical decision assistance queues, adding patient verdicts, and verifying neural networks.
                </p>
              </div>

              <div className="relative z-10 flex gap-4 text-center shrink-0">
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-xl">
                  <div className="text-xl font-black text-cyan-400">{pendingCases.length}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Pending Cases</div>
                </div>
                <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-xl">
                  <div className="text-xl font-black text-emerald-400">{reviewedCases.length}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Reviewed Cases</div>
                </div>
              </div>
            </div>
          )}

      {/* -------------------------------------------------------------
          TAB 1: CLINICAL ACTIVE REVIEW QUEUE
          ------------------------------------------------------------- */}
      {activeTab === "queue" && !selectedScan && (
        <div className="space-y-6" id="review-queue-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Outstanding Patient Specimen Cases ({pendingCases.length})</h3>
              <span className="text-[10px] text-slate-400 font-medium">Auto-refresh active</span>
            </div>

            {pendingCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {pendingCases.map((scan) => (
                  <div key={scan.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-all">
                    
                    <div className="flex items-center gap-4">
                      <img 
                        src={scan.imageUrl} 
                        alt="lesion thumb" 
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{scan.patientName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Age: {scan.patientAge || 24} • Gender: {scan.patientGender || "Male"} • Evaluation: <span className="font-semibold text-teal-600">{scan.predictedClass} ({scan.acronym})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getRiskColor(scan.riskLevel)}`}>
                          {scan.riskLevel} Risk
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          {scan.confidence.toFixed(1)}% Confidence
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedScan(scan)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Examine Specimen</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No outstanding patient screening cases waiting in your clinic queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          CASE REVIEW FULL DETAILS VIEW (IF SELECTED)
          ------------------------------------------------------------- */}
      {selectedScan && (
        <div className="space-y-6" id="case-review-details-container">
          <button
            onClick={() => setSelectedScan(null)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Queue</span>
          </button>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8">
            
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Case Reference ID: {selectedScan.id.slice(0, 8).toUpperCase()}</span>
              <h3 className="text-xl font-bold text-slate-900">
                Clinician Examination of {selectedScan.patientName}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Age: {selectedScan.patientAge || 24} • Gender: {selectedScan.patientGender || "Male"} • Submitted: {new Date(selectedScan.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Image Overlay Visual Canvas */}
              <div className="lg:col-span-5 space-y-4">
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

                {/* Live Controls Slider */}
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
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4.5 w-4.5 cursor-pointer"
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
                        className="w-full accent-teal-600 h-1.5 rounded-lg cursor-pointer bg-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: AI Analysis & Verdict Review Form */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* AI metrics card */}
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
                      <Layers className="h-4.5 w-4.5 text-teal-600" />
                      Model Screening Inference Output
                    </span>
                    <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getRiskColor(selectedScan.riskLevel)}`}>
                      {selectedScan.riskLevel} Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Predicted Specimen Class</span>
                      <strong className="text-slate-800 text-sm">{selectedScan.predictedClass} ({selectedScan.acronym})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Ensemble Confidence Score</span>
                      <strong className="text-slate-800 text-sm">{selectedScan.confidence.toFixed(2)}%</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-200 pt-3">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase">Model Pathological Indication</span>
                    <p className="leading-relaxed font-mono text-[11px] text-slate-500">
                      {selectedScan.clinicalDetails}
                    </p>
                  </div>
                </div>

                {/* Verdict Addition Area */}
                {selectedScan.status === "reviewed" ? (
                  /* Verdict Already Completed */
                  <div className="p-5 bg-teal-50 border border-teal-100 rounded-2xl space-y-3">
                    <h5 className="text-sm font-bold text-teal-800 flex items-center gap-1.5">
                      <CheckCircle className="h-5 w-5 text-teal-600" />
                      Case Assessment Verdict Submitted
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-xs border-b border-teal-100 pb-2">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Clinician Verdict</span>
                        <strong className="text-slate-800">{selectedScan.doctorVerdict?.status.toUpperCase()}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase">Reviewed Timestamp</span>
                        <strong className="text-slate-800">
                          {selectedScan.doctorVerdict?.reviewedAt ? new Date(selectedScan.doctorVerdict.reviewedAt).toLocaleString() : ""}
                        </strong>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic mt-2">
                      " {selectedScan.doctorVerdict?.notes} "
                    </p>
                  </div>
                ) : (
                  /* Active Form to add Verdict */
                  <form onSubmit={handleSubmitVerdict} className="border border-slate-200/80 p-5 rounded-2xl space-y-4">
                    <h5 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                      Submit Dermatological Decision Verdict
                    </h5>

                    {verdictSuccess ? (
                      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center text-teal-900 text-xs flex flex-col items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-teal-600 animate-bounce" />
                        <span>Dermatology Assessment Submitted Successfully! Informational feed dispatched to patient.</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Diagnostic Verdict Status</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(["Agree", "Disagree", "Needs Biopsy", "Needs Follow-up"] as const).map((v) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => setVerdict(v)}
                                className={`py-1.5 px-1.5 border rounded-lg text-xs font-semibold whitespace-nowrap capitalize transition-all ${
                                  verdict === v
                                    ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dermatopathology Notes & Surgical Follow-ups</label>
                          <textarea
                            rows={3}
                            value={verdictNotes}
                            onChange={(e) => setVerdictNotes(e.target.value)}
                            placeholder="Provide formal clinician instructions, biopsy advisories, or lifestyle SPF modifications."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingVerdict}
                          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                        >
                          {submittingVerdict ? (
                            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>Dispatch Clinic Assessment & Inform Patient</span>
                            </>
                          )}
                        </button>
                      </>
                    )}

                  </form>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB: CONSULTATION REQUESTS (SCHEDULING)
          ------------------------------------------------------------- */}
      {activeTab === "consultations" && !selectedScan && (
        <div className="space-y-6" id="consultations-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Patient Consultation Requests ({consultations.length})</h3>
            </div>

            {consultations.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {consultations.map((consult) => (
                  <div key={consult.id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400">CASE ID: {consult.id.slice(0, 8).toUpperCase()}</span>
                        <h4 className="text-xs font-bold text-slate-800">{consult.patientName}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        consult.status === "completed"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : consult.status === "scheduled"
                            ? "bg-cyan-50 border-cyan-100 text-cyan-800"
                            : "bg-amber-50 border-amber-100 text-amber-800"
                      }`}>
                        {consult.status === "completed" ? "Completed" : consult.status === "scheduled" ? "Scheduled" : "Awaiting Confirmation"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong>Patient Message:</strong> {consult.message}
                    </p>

                    {consult.preferredAt && (
                      <div className="text-[11px] text-slate-500">
                        Patient requested: <strong className="text-slate-700">{new Date(consult.preferredAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</strong>
                      </div>
                    )}

                    {consult.scheduledAt && (
                      <div className="text-[11px] text-cyan-800 bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded-lg font-semibold w-fit">
                        📅 Confirmed slot: {new Date(consult.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    )}

                    {consult.notes && (
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-slate-600 italic">
                        " {consult.notes} "
                      </div>
                    )}

                    {/* Requested — doctor needs to confirm a schedule */}
                    {consult.status === "requested" && (
                      confirmingConsultId === consult.id ? (
                        <div className="flex flex-col sm:flex-row gap-2 items-end pt-2 border-t border-slate-100">
                          <div className="flex-1 w-full">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Confirm Date</label>
                            <input type="date" value={confirmDate} min={new Date().toISOString().slice(0,10)} onChange={(e) => setConfirmDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none" />
                          </div>
                          <div className="flex-1 w-full">
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Confirm Time</label>
                            <input type="time" value={confirmTime} onChange={(e) => setConfirmTime(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none" />
                          </div>
                          <button
                            onClick={() => handleConfirmSchedule(consult.id)}
                            disabled={!confirmDate || !confirmTime}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white text-[11px] font-bold rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            Confirm Slot
                          </button>
                          <button
                            onClick={() => setConfirmingConsultId(null)}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmingConsultId(consult.id);
                            if (consult.preferredAt) {
                              const d = new Date(consult.preferredAt);
                              setConfirmDate(d.toISOString().slice(0, 10));
                              setConfirmTime(d.toTimeString().slice(0, 5));
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Confirm Schedule
                        </button>
                      )
                    )}

                    {/* Scheduled — doctor can mark as completed with notes */}
                    {consult.status === "scheduled" && (
                      completingConsultId === consult.id ? (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <textarea
                            rows={2}
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            placeholder="Consultation summary / follow-up notes for the patient..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setCompletingConsultId(null)}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleCompleteConsultation(consult.id)}
                              disabled={!completionNotes.trim()}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCompletingConsultId(consult.id)}
                          className="px-3 py-1.5 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Mark as Completed
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No consultation requests routed to you yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: COMPLETED CLINICAL CASE HISTORIES
          ------------------------------------------------------------- */}
      {activeTab === "history" && !selectedScan && (
        <div className="space-y-6" id="case-history-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Clinically Evaluated Specimen Records ({reviewedCases.length})</h3>
            </div>

            {reviewedCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {reviewedCases.map((scan) => (
                  <div key={scan.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-all">
                    
                    <div className="flex items-center gap-4">
                      <img 
                        src={scan.imageUrl} 
                        alt="lesion thumb" 
                        className="h-12 w-12 rounded-lg object-cover border border-slate-100 shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{scan.patientName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Age: {scan.patientAge || 24} • Diagnosed Class: <span className="font-semibold text-slate-700">{scan.predictedClass}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getRiskColor(scan.riskLevel)}`}>
                          {scan.riskLevel} Risk
                        </span>
                        <span className="text-[9px] font-bold bg-teal-50 border border-teal-100 text-teal-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Verdict: {scan.doctorVerdict?.status}
                        </span>
                      </div>

                      <button
                        onClick={() => setSelectedScan(scan)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Record</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No clinically completed cases archived in this workspace.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: CLINICAL STATISTICS & CASELOAD ANALYTICS (Recharts)
          ------------------------------------------------------------- */}
      {activeTab === "analytics" && !selectedScan && (
        <div className="space-y-8" id="case-analytics-tab">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Bar Chart: Lesion category load */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-teal-600" />
                Diagnostic Categorization Case Load
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Distribution of uploaded tissue scans grouped by AI target classifications.
              </p>
              
              <div className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip cursor={{ fill: "rgba(6, 182, 212, 0.05)" }} />
                    <Bar dataKey="cases" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Risk distribution */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-600" />
                Ensemble Risk Profile Allocation
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Percentage breakdown of low, medium, and high-risk classifications running on our deep learning microservices.
              </p>

              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Model Concordance Audit statistic — now computed from real reviewed scans */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.08]" />
            <div className="space-y-1 relative z-10">
              <h4 className="text-sm font-bold">Model-vs-Doctor Congruence Rate</h4>
              <p className="text-slate-400 text-xs">
                Audit metric tracking the percentage of cases where the clinical dermatologist's final verdict aligns with the Swish CNN+ViT predictions.
              </p>
            </div>
            <div className="text-center relative z-10 shrink-0">
              <div className="text-4xl font-black text-cyan-400">{agreementRate}%</div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Historical Concordance ({reviewedCases.length} reviewed)</span>
            </div>
          </div>

        </div>
      )}

      </div>
      </div>
    </div>
  );
}