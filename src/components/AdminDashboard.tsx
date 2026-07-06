import React, { useState, useEffect } from "react";
import { 
  Users, Terminal, Settings, ShieldAlert, CheckCircle, 
  XCircle, Award, Eye, Trash2, ArrowUpRight, Zap, RefreshCw, BarChart, Download
} from "lucide-react";
import { User, InferenceLog } from "../types";
import { supabase } from "../lib/supabaseClient";

interface AdminDashboardProps {
  user: User;
}

// Generic CSV export helper — converts an array of objects into a downloadable CSV file
function exportToCsv(filename: string, rows: Record<string, any>[]) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: any) => {
    const str = value === null || value === undefined ? "" : String(value);
    // Wrap in quotes and escape any existing quotes if the value contains commas/quotes/newlines
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(","))
  ];

  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<InferenceLog[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "logs" | "stats">("users");
  const [stats, setStats] = useState<any>(null);
  const [actionSuccess, setActionSuccess] = useState("");

  // Search and Filter states
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("all");

  // Map a Supabase "profiles" row (snake_case) into the User shape the UI expects
  const mapUserRow = (row: any): User => ({
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    medicalLicense: row.medical_license || undefined,
    isVerified: row.is_verified || false,
    registrationDate: row.registration_date
  });

  const mapLogRow = (row: any): InferenceLog => ({
    id: row.id,
    timestamp: row.created_at,
    modelName: row.model_name,
    patientId: row.patient_id,
    imageSizeKb: Number(row.image_size_kb) || 0,
    durationMs: Number(row.duration_ms) || 0,
    status: row.status,
    errorMessage: row.error_message || undefined
  });

  const loadAdminData = async () => {
    try {
      // Load Users (all profiles)
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("*")
        .order("registration_date", { ascending: false });

      if (usersError) throw usersError;
      setUsers((usersData || []).map(mapUserRow));

      // Load Logs (most recent first)
      const { data: logsData, error: logsError } = await supabase
        .from("inference_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;
      setLogs((logsData || []).map(mapLogRow));

      // Compute overview stats directly from Supabase counts
      const [
        { count: totalScans },
        { count: totalPatients },
        { count: totalDoctors },
        { count: pendingReviews },
        { data: reviewedScans }
      ] = await Promise.all([
        supabase.from("scans").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "patient"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "doctor"),
        supabase.from("scans").select("*", { count: "exact", head: true }).eq("status", "pending_review"),
        supabase.from("scans").select("doctor_verdict").eq("status", "reviewed")
      ]);

      // Agreement rate = % of reviewed scans where the doctor's verdict was "Agree"
      let agreementRate = 0;
      if (reviewedScans && reviewedScans.length > 0) {
        const agreedCount = reviewedScans.filter(
          (s: any) => s.doctor_verdict?.status === "Agree"
        ).length;
        agreementRate = Math.round((agreedCount / reviewedScans.length) * 100);
      }

      setStats({
        totalScans: totalScans || 0,
        totalPatients: totalPatients || 0,
        totalDoctors: totalDoctors || 0,
        pendingReviews: pendingReviews || 0,
        agreementRate
      });
    } catch (err) {
      console.error("Failed to load admin dataset", err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user.id, activeTab]);

  // Handle Physician Verification action — updates the profiles table directly
  const verifyDoctorLicense = async (doctorId: string, verify: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: verify })
        .eq("id", doctorId);

      if (error) throw error;

      setActionSuccess(`Physician credentials updated successfully!`);
      setTimeout(() => setActionSuccess(""), 2000);
      loadAdminData();
    } catch (err) {
      console.error("Failed to verify doctor", err);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Export handlers — build clean flat rows for CSV, then trigger download
  const handleExportUsers = () => {
    const rows = users.map((u) => ({
      Name: u.name,
      Email: u.email,
      Role: u.role,
      Verified: u.role === "doctor" ? (u.isVerified ? "Yes" : "No") : "N/A",
      MedicalLicense: u.medicalLicense || "",
      RegisteredOn: new Date(u.registrationDate).toLocaleDateString(),
      UserID: u.id
    }));
    exportToCsv(`dermshield_users_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const handleExportLogs = () => {
    const rows = logs.map((log) => ({
      InferenceID: log.id,
      Model: log.modelName,
      PatientID: log.patientId,
      Timestamp: new Date(log.timestamp).toLocaleString(),
      DurationMs: log.durationMs,
      ImageSizeKb: log.imageSizeKb,
      Status: log.status,
      Error: log.errorMessage || ""
    }));
    exportToCsv(`dermshield_inference_logs_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.medicalLicense && u.medicalLicense.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = logs.filter((l) => {
    const matchesSearch = l.id.toLowerCase().includes(logSearch.toLowerCase()) || 
                          l.modelName.toLowerCase().includes(logSearch.toLowerCase()) || 
                          l.patientId.toLowerCase().includes(logSearch.toLowerCase()) || 
                          (l.errorMessage && l.errorMessage.toLowerCase().includes(logSearch.toLowerCase()));
    const matchesStatus = logStatusFilter === "all" || l.status.toLowerCase() === logStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-[calc(100vh-104px)] bg-slate-50 font-sans text-slate-900 w-full" id="admin-console-container">
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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Orchestration</div>
          {[
            { id: "users", label: "User Verification Portal", icon: Users },
            { id: "logs", label: "Inference Telemetry", icon: Terminal },
            { id: "stats", label: "System Core Analytics", icon: BarChart }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
            { id: "users", label: "Users", icon: Users },
            { id: "logs", label: "Telemetry Logs", icon: Terminal },
            { id: "stats", label: "System Analytics", icon: BarChart }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
            <span className="capitalize">{activeTab === "users" ? "Platform User Verification" : activeTab}</span>
            <span className="text-[10px] font-mono font-semibold bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
              System Orchestrator
            </span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Super Administrator</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center font-bold text-xs text-red-700">
              {getInitials(user.name)}
            </div>
          </div>
        </header>

        {/* Main Padded Content */}
        <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1 overflow-y-auto">
          
          {/* Admin Header Card */}
          <div className="bg-slate-900 rounded-2xl p-6 mb-2 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.08]" />
            
            <div className="relative z-10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Platform Orchestration Workspace</div>
              <h2 className="text-2xl font-extrabold tracking-tight">System Admin Console</h2>
              <p className="text-slate-400 text-xs">
                Reviewing system pipeline logs, orchestrating physician verifications, and monitoring model performance.
              </p>
            </div>

            <div className="relative z-10 flex gap-4 text-center shrink-0">
              <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 px-4 py-2 rounded-xl">
                <div className="text-xs font-mono text-slate-400 uppercase">CNN+ViT Model</div>
                <div className="text-sm font-bold text-cyan-400">DermShield v1.4 (Swish)</div>
              </div>
            </div>
          </div>

          {actionSuccess && (
            <div className="mb-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

      {/* -------------------------------------------------------------
          TAB 1: USER & PHYSICIAN VERIFICATION ROSTER
          ------------------------------------------------------------- */}
      {activeTab === "users" && (
        <div className="space-y-6" id="user-verification-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Registered Platform Users ({filteredUsers.length} of {users.length})</h3>
              <button
                onClick={handleExportUsers}
                disabled={users.length === 0}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5 text-cyan-600" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Users Search & Filters */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="🔍 Search users by name, email, or license..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">👥 All Roles</option>
                  <option value="patient">👤 Patients</option>
                  <option value="doctor">🩺 Doctors</option>
                  <option value="admin">🔑 Admins</option>
                </select>
                {(userSearch !== "" || userRoleFilter !== "all") && (
                  <button
                    onClick={() => { setUserSearch(""); setUserRoleFilter("all"); }}
                    className="text-[10px] font-extrabold text-teal-600 hover:text-teal-800 underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div key={u.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-all">
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">{u.name}</strong>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          u.role === "admin" 
                            ? "bg-slate-900 text-white" 
                            : u.role === "doctor" 
                              ? "bg-teal-50 text-teal-800 border border-teal-100" 
                              : "bg-cyan-50 text-cyan-800 border border-cyan-100"
                        }`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Email: {u.email} • ID: {u.id.slice(0, 8)} • Joined: {new Date(u.registrationDate).toLocaleDateString()}
                      </div>
                      {u.role === "doctor" && (
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-slate-400" />
                          <span>License Register ID: {u.medicalLicense || "LIC-PENDING-MED"}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {u.role === "doctor" && (
                        <>
                          {u.isVerified ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Verified Physician</span>
                              </span>
                              <button
                                onClick={() => verifyDoctorLicense(u.id, false)}
                                className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-600 font-bold rounded-lg cursor-pointer"
                              >
                                Revoke
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                <span>Pending Verification</span>
                              </span>
                              <button
                                onClick={() => verifyDoctorLicense(u.id, true)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg shadow-sm cursor-pointer"
                              >
                                Approve & Verify License
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                  {users.length > 0 
                    ? "No registered platform users match your search criteria or role filters."
                    : "No registered users found yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 2: DEEP LEARNING MODEL INFERENCE TELEMETRY LOGS
          ------------------------------------------------------------- */}
      {activeTab === "logs" && (
        <div className="space-y-6" id="telemetry-logs-tab">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">Ensemble Model Execution Trace ({filteredLogs.length} of {logs.length})</h3>
              <button
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5 text-cyan-600" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Logs Search & Filters */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  placeholder="🔍 Search log trace by model, inference ID, patient, or error..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-teal-500 text-slate-700 cursor-pointer"
                >
                  <option value="all">⚡ All Statuses</option>
                  <option value="success">🟢 Success</option>
                  <option value="error">🔴 Error</option>
                </select>
                {(logSearch !== "" || logStatusFilter !== "all") && (
                  <button
                    onClick={() => { setLogSearch(""); setLogStatusFilter("all"); }}
                    className="text-[10px] font-extrabold text-teal-600 hover:text-teal-800 underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {filteredLogs.length > 0 ? (
              <div className="font-mono text-xs divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 transition-all">
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${log.status === "success" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                        <span className="text-slate-800 font-bold">Inference ID: {log.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-[11px] text-slate-500 font-semibold">{log.modelName}</span>
                      </div>

                      <div className="text-[10px] text-slate-500 font-sans">
                        Timestamp: {new Date(log.timestamp).toLocaleString()} • PatientRef: {log.patientId?.slice(0, 8) || "N/A"}
                      </div>

                      {log.errorMessage && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 p-2 rounded-md border border-rose-100 mt-2 max-w-2xl font-sans">
                          <strong>ERROR STACK:</strong> {log.errorMessage}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-right sm:text-left text-[10px]">
                      <div>
                        <span className="text-slate-400 block uppercase tracking-wider text-[8px]">Inference Time</span>
                        <strong className="text-slate-700">{log.durationMs} ms</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase tracking-wider text-[8px]">Image Size</span>
                        <strong className="text-slate-700">{log.imageSizeKb} KB</strong>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs font-mono">
                {logs.length > 0 
                  ? "No pipeline execution logs match your search queries or status filters."
                  : "No active neural network pipeline executions traced in log buffer."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          TAB 3: PLATFORM CORE ANALYTICS
          ------------------------------------------------------------- */}
      {activeTab === "stats" && stats && (
        <div className="space-y-8" id="core-analytics-tab">
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Scans Screened</span>
              <h3 className="text-2xl font-extrabold text-slate-900">{stats.totalScans}</h3>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Registered Patients</span>
              <h3 className="text-2xl font-extrabold text-cyan-600">{stats.totalPatients}</h3>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Dermatologists Boarded</span>
              <h3 className="text-2xl font-extrabold text-teal-600">{stats.totalDoctors}</h3>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Pending Review Case load</span>
              <h3 className="text-2xl font-extrabold text-amber-600">{stats.pendingReviews}</h3>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="h-5 w-5 text-red-600" />
              CNN + ViT Architecture Validation Summary
            </h4>
            <p className="text-slate-600 text-xs leading-relaxed max-w-3xl">
              Platform-wide Concordance is currently tracking at <strong>{stats.agreementRate}%</strong>. This means clinicians find the explainable attention maps generated by our Swish CNN-Vision Transformer ensemble highly indicative of the underlying pathological presentation.
            </p>
          </div>

        </div>
      )}

      </div>
      </div>
    </div>
  );
}