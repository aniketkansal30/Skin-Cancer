import React, { useState, useEffect } from "react";
import { 
  ClipboardList, CheckCircle, AlertTriangle, Users, BarChart2, 
  ChevronRight, ArrowLeft, Send, ThumbsUp, RefreshCw, Layers, Sliders, Forward,
  Terminal, User as UserIcon, Clock, Settings, ArrowUpRight, Activity, FileText, Phone,
  TrendingUp, ExternalLink
} from "lucide-react";
import { User, ScanResult, Consultation } from "../types";
import GradCamCanvas from "./GradCamCanvas";
import DoctorProfileTab from "./DoctorProfileTab";
import { supabase } from "../lib/supabaseClient";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts";

interface DoctorDashboardProps {
  user: User;
}

export default function DoctorDashboard({ user }: DoctorDashboardProps) {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"queue" | "history" | "analytics" | "consultations" | "referrals" | "logs" | "profile">("queue");
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);

  // Search and Filter states
  const [queueSearch, setQueueSearch] = useState("");
  const [queueRiskFilter, setQueueRiskFilter] = useState("all");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveRiskFilter, setArchiveRiskFilter] = useState("all");

  // Verdict Form State
  const [verdict, setVerdict] = useState<"Agree" | "Disagree" | "Needs Biopsy" | "Needs Follow-up">("Agree");
  const [verdictNotes, setVerdictNotes] = useState("");
  const [submittingVerdict, setSubmittingVerdict] = useState(false);
  const [verdictSuccess, setVerdictSuccess] = useState(false);
  
  // Oncology/Surgical Referral state
  const [needReferral, setNeedReferral] = useState(false);
  const [referringClinic, setReferringClinic] = useState("");
  const [referralNotes, setReferralNotes] = useState("");

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
      const mappedScans = (scansData || []).map(mapScanRow);
      setScans(mappedScans);

      // Audit logs: scans reviewed by this doctor
      const reviewedScans = mappedScans.filter(
        (s) => s.status === "reviewed" && s.doctorVerdict?.doctorId === user.id
      );
      setAuditLogs(reviewedScans);

      // Consultations specifically routed to this doctor
      const { data: consultsData, error: consultsError } = await supabase
        .from("consultations")
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (consultsError) throw consultsError;
      setConsultations((consultsData || []).map(mapConsultationRow));

      // Referrals made by this doctor
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });
      if (!referralsError) {
        setReferrals(referralsData || []);
      }
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
      // 1. Update the Scan verdict in "scans" table
      const { error: updateError } = await supabase
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

      if (updateError) throw updateError;

      // 2. If Oncology/Surgical referral is requested, insert into "referrals" table
      if (needReferral) {
        const referralId = "ref-" + Math.random().toString(36).substr(2, 9);
        const { error: referralError } = await supabase
          .from("referrals")
          .insert({
            id: referralId,
            patient_id: selectedScan.patientId,
            patient_name: selectedScan.patientName,
            doctor_id: user.id,
            doctor_name: user.name,
            scan_id: selectedScan.id,
            referring_clinic: referringClinic.trim() || "National Dermatopathology Specialists Clinic",
            notes: referralNotes.trim() || `Urgent referral request due to highly suspect ${selectedScan.predictedClass} presenting atypical characteristics.`,
            status: "pending",
            created_at: new Date().toISOString()
          });

        if (referralError) throw referralError;
      }

      setVerdictSuccess(true);
      setTimeout(() => {
        setVerdictSuccess(false);
        setSelectedScan(null);
        setVerdictNotes("");
        setNeedReferral(false);
        setReferringClinic("");
        setReferralNotes("");
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

  const filteredPendingCases = pendingCases.filter((s) => {
    const matchesSearch = s.patientName.toLowerCase().includes(queueSearch.toLowerCase()) || 
                          s.predictedClass.toLowerCase().includes(queueSearch.toLowerCase()) || 
                          (s.bodyLocation && s.bodyLocation.toLowerCase().includes(queueSearch.toLowerCase()));
    const matchesRisk = queueRiskFilter === "all" || s.riskLevel.toLowerCase() === queueRiskFilter.toLowerCase();
    return matchesSearch && matchesRisk;
  });

  const filteredReviewedCases = reviewedCases.filter((s) => {
    const matchesSearch = s.patientName.toLowerCase().includes(archiveSearch.toLowerCase()) || 
                          s.predictedClass.toLowerCase().includes(archiveSearch.toLowerCase()) || 
                          (s.bodyLocation && s.bodyLocation.toLowerCase().includes(archiveSearch.toLowerCase()));
    const matchesRisk = archiveRiskFilter === "all" || s.riskLevel.toLowerCase() === archiveRiskFilter.toLowerCase();
    return matchesSearch && matchesRisk;
  });

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
            { id: "referrals", label: "Specialist Referrals", icon: Forward },
            { id: "history", label: "Patient Case History", icon: Users },
            { id: "analytics", label: "Case Load Analytics", icon: BarChart2 },
            { id: "logs", label: "Clinical Audit Logs", icon: Terminal },
            { id: "profile", label: "My Profile Settings", icon: UserIcon }
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
            { id: "referrals", label: "Referrals", icon: Forward },
            { id: "history", label: "Patient History", icon: Users },
            { id: "analytics", label: "Analytics", icon: BarChart2 },
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
            <span className="capitalize">
              {activeTab === "queue" 
                ? "Clinical Case Review" 
                : activeTab === "referrals"
                  ? "Specialty Referrals Panel"
                  : activeTab === "consultations"
                    ? "Consultation Requests Queue"
                    : activeTab}
            </span>
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
              <h3 className="text-sm font-bold text-slate-900">Outstanding Patient Specimen Cases ({filteredPendingCases.length} of {pendingCases.length})</h3>
              <span className="text-[10px] text-slate-400 font-medium">Auto-refresh active</span>
            </div>

            {/* Queue Search & Filter Controls */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="🔍 Search patient name, predicted class, or body location..."
                  value={queueSearch}
                  onChange={(e) => setQueueSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <select
                  value={queueRiskFilter}
                  onChange={(e) => setQueueRiskFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">⚠️ All Risk Levels</option>
                  <option value="high">🔴 High Risk</option>
                  <option value="medium">🟡 Medium Risk</option>
                  <option value="low">🟢 Low Risk</option>
                </select>
                {(queueSearch !== "" || queueRiskFilter !== "all") && (
                  <button
                    onClick={() => { setQueueSearch(""); setQueueRiskFilter("all"); }}
                    className="text-[10px] font-extrabold text-teal-600 hover:text-teal-800 underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {filteredPendingCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredPendingCases.map((scan) => (
                  <div key={scan.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-all">
                    
                    <div className="flex items-center gap-4">
                      <img 
                        src={scan.imageUrl} 
                        alt="lesion thumb" 
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200 shadow-sm shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{scan.patientName}</span>
                          {scan.bodyLocation && (
                            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2 py-0.2 rounded">
                              📍 {scan.bodyLocation}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Age: {scan.patientAge || 24} • Gender: {scan.patientGender || "Male"} • Evaluation: <span className="font-semibold text-teal-600">{scan.predictedClass} ({scan.acronym})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                          {scan.needsMandatoryReview && (
                            <span className="text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full animate-pulse">
                              🚨 Needs Review
                            </span>
                          )}
                          <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider ${getRiskColor(scan.riskLevel)}`}>
                            {scan.riskLevel} Risk
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {scan.confidence.toFixed(1)}% Conf.
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono font-medium">
                          Uncertainty Index: <strong className={scan.needsMandatoryReview ? "text-amber-600 font-bold" : "text-slate-600"}>{(scan.uncertaintyScore !== undefined ? scan.uncertaintyScore * 100 : 15).toFixed(1)}%</strong>
                        </div>
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
                {pendingCases.length > 0 
                  ? "No outstanding cases match your current search queries or risk level filters."
                  : "No outstanding patient screening cases waiting in your clinic queue."}
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

                        {/* Oncology/Surgical Referral section */}
                        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={needReferral}
                              onChange={(e) => {
                                setNeedReferral(e.target.checked);
                                if (e.target.checked && !referringClinic) {
                                  setReferringClinic("National Oncology & Surgical Dermatology Clinic");
                                  setReferralNotes(`Formal oncological evaluation requested. Case ID ${selectedScan.id.slice(0, 8).toUpperCase()} presents as high-concern ${selectedScan.predictedClass}.`);
                                }
                              }}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800">Initiate Surgical / Oncology Referral</span>
                          </label>

                          {needReferral && (
                            <div className="space-y-3 pt-1">
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-slate-500 uppercase">Target Specialty Clinic</label>
                                <input
                                  type="text"
                                  value={referringClinic}
                                  onChange={(e) => setReferringClinic(e.target.value)}
                                  placeholder="e.g. Mayo Clinic Dermatology Dept"
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold text-slate-500 uppercase">Referral Dispatch Briefing Notes</label>
                                <textarea
                                  rows={2}
                                  value={referralNotes}
                                  onChange={(e) => setReferralNotes(e.target.value)}
                                  placeholder="Specific reasons for escalation or pathological concerns..."
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 outline-none bg-white"
                                  required
                                />
                              </div>
                            </div>
                          )}
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

            {/* Lesion Tracking Timeline section */}
            {(() => {
              const relatedScans = scans
                .filter(s => s.patientId === selectedScan.patientId && (s.lesionId === selectedScan.lesionId || (s.bodyLocation && s.bodyLocation === selectedScan.bodyLocation)))
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              
              return relatedScans.length > 0 ? (
                <div className="border-t border-slate-100 pt-8 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-teal-600 animate-pulse" />
                      Lesion Chronology & Progression Timeline
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
                          <Tooltip />
                          <Line type="monotone" dataKey="confidence" stroke="#0f766e" strokeWidth={2.5} activeDot={{ r: 8 }} />
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
                                ? "bg-teal-50/50 border-teal-200 shadow-xs" 
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
                                  {isCurrent && <span className="text-[8px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.5 rounded">Active</span>}
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
          TAB: SPECIALIST REFERRALS (ONCOLOGY/SURGICAL ESCALATION)
          ------------------------------------------------------------- */}
      {activeTab === "referrals" && !selectedScan && (
        <div className="space-y-6" id="referrals-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Forward className="h-5 w-5 text-teal-600" />
                  Specialist & Oncology Referrals Queue
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Track outwards pathological escalations, surgical recommendations, and external clinic acceptances.
                </p>
              </div>
              <span className="text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded-full">
                {referrals.length} Outward Referrals
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
                          Patient: {ref.patient_name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">Referred by: {ref.doctor_name || "Primary Physician"}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        ref.status === "discharged" || ref.status === "completed"
                          ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                          : "bg-amber-50 border-amber-100 text-amber-800"
                      }`}>
                        {ref.status === "discharged" || ref.status === "completed" ? "Completed / Accepted" : "Pending Specialty Acceptance"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Target Specialist Clinic</span>
                        <strong className="text-slate-700">{ref.referring_clinic}</strong>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Referral Briefing & Pathology Notes</span>
                        <p className="text-slate-600 italic">"{ref.notes}"</p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex justify-between items-center pt-2 border-t border-slate-100">
                      <span>Initiated on: {new Date(ref.created_at).toLocaleDateString()}</span>
                      
                      {ref.status === "pending" && (
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from("referrals")
                                .update({ status: "discharged" })
                                .eq("id", ref.id);
                              if (error) throw error;
                              loadDoctorData();
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                        >
                          Mark as Accepted / Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                No active outgoing referrals found. Initiate an oncological referral during a patient skin scan review in the queue tab.
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
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Clinically Evaluated Specimen Records ({filteredReviewedCases.length} of {reviewedCases.length})</h3>
            </div>

            {/* Archive Search & Filter Controls */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="🔍 Search patient name, predicted class, or location..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <select
                  value={archiveRiskFilter}
                  onChange={(e) => setArchiveRiskFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">⚠️ All Risk Levels</option>
                  <option value="high">🔴 High Risk</option>
                  <option value="medium">🟡 Medium Risk</option>
                  <option value="low">🟢 Low Risk</option>
                </select>
                {(archiveSearch !== "" || archiveRiskFilter !== "all") && (
                  <button
                    onClick={() => { setArchiveSearch(""); setArchiveRiskFilter("all"); }}
                    className="text-[10px] font-extrabold text-teal-600 hover:text-teal-800 underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {filteredReviewedCases.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredReviewedCases.map((scan) => (
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
                {reviewedCases.length > 0 
                  ? "No clinically completed cases match your current search queries or risk filters."
                  : "No clinically completed cases archived in this workspace."}
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

      {/* -------------------------------------------------------------
          TAB: CLINICAL DECISION AUDIT LOGS
          ------------------------------------------------------------- */}
      {activeTab === "logs" && !selectedScan && (
        <div className="space-y-6" id="clinical-audit-logs-tab">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cases Evaluated</span>
                <strong className="text-lg font-extrabold text-slate-900">{auditLogs.length} Cases</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                <ThumbsUp className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Concordance</span>
                <strong className="text-lg font-extrabold text-slate-900">
                  {auditLogs.length > 0 
                    ? Math.round((auditLogs.filter(l => l.doctorVerdict?.verdict === "Agree").length / auditLogs.length) * 100)
                    : 100}%
                </strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Biopsies Instructed</span>
                <strong className="text-lg font-extrabold text-slate-900">
                  {auditLogs.filter(l => l.doctorVerdict?.verdict === "Needs Biopsy").length} Cases
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-slate-700" />
                Dermatology Clinical Verdict Audit Trails
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Comprehensive record of active clinical assessments, diagnostic concordance ratings, and pathologically escalated cases associated with your credentials.
              </p>
            </div>

            {auditLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4">Case Specimen ID</th>
                      <th className="p-4">Patient Name</th>
                      <th className="p-4">AI Target Diagnosis</th>
                      <th className="p-4">AI Risk Level</th>
                      <th className="p-4">My Clinical Verdict</th>
                      <th className="p-4">Evaluation Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-900">#{log.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-4">{log.patientName}</td>
                        <td className="p-4 font-semibold text-slate-800">{log.classLabel}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            log.riskLevel === "high" 
                              ? "bg-rose-50 border-rose-100 text-rose-700"
                              : log.riskLevel === "medium"
                                ? "bg-amber-50 border-amber-100 text-amber-700"
                                : "bg-emerald-50 border-emerald-100 text-emerald-700"
                          }`}>
                            {log.riskLevel}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            log.doctorVerdict?.verdict === "Agree" 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                              : log.doctorVerdict?.verdict === "Needs Biopsy"
                                ? "bg-rose-50 border-rose-100 text-rose-700"
                                : "bg-blue-50 border-blue-100 text-blue-700"
                          }`}>
                            {log.doctorVerdict?.verdict}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 font-mono">{log.doctorVerdict?.reviewedAt ? new Date(log.doctorVerdict.reviewedAt).toLocaleDateString() : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                No clinical audit logs found. Visit the active review queue and approve/disagree with patient specimens to populate logs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB: CLINICIAN PROFILE SETTINGS
          ------------------------------------------------------------- */}
      {activeTab === "profile" && !selectedScan && (
        <DoctorProfileTab user={user} />
      )}

      </div>
      </div>
    </div>
  );
}