import React from "react";
import { Shield, LogOut, AlertTriangle, UserCheck } from "lucide-react";
import { AuthProvider, useAuth } from "./AuthContext";
import LandingPage from "./components/LandingPage";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { NotificationProvider, NotificationBell } from "./lib/NotificationContext";

function AppContent() {
  const { currentUser, loading, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  // Show a simple loading state while Supabase checks for an existing session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Loading DermShield AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans" id="dermshield-app-root">
      
      {/* Top Clinical Disclaimer Banner */}
      <div className="bg-amber-600 text-amber-50 px-4 py-1.5 text-center text-[10px] sm:text-xs font-semibold select-none flex items-center justify-center gap-1.5 shadow-sm relative z-50">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-200" />
        <span>
          <strong>Decision Screening Support Aid:</strong> For clinical evaluation and training only. Do not present as legal medical diagnosis.
        </span>
      </div>

      {/* Main Navigation Bar */}
      <header className="bg-white border-b border-slate-100 py-3 px-4 sm:px-6 lg:px-8 shadow-sm relative z-40" id="main-header">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-2.5 select-none">
            <div className="h-8 w-8 bg-gradient-to-r from-cyan-600 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              <Shield className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">DermShield AI</h1>
              <span className="text-[9px] font-bold text-cyan-600 font-mono tracking-wider">CNN+ViT Screening Pipeline</span>
            </div>
          </div>

          {/* Logged in user info + logout */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.role === "patient" && <NotificationBell />}
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
                <div className="text-[9px] font-bold text-cyan-700 uppercase tracking-wider flex items-center justify-end gap-1 font-mono">
                  <UserCheck className="h-2.5 w-2.5" />
                  <span>{currentUser.role} Workspace</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out of workspace"
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg cursor-pointer transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
              Explainable AI Dermatopathology
            </div>
          )}

        </div>
      </header>

      {/* Main Body View Layouts based on auth status and roles */}
      <main className="flex-1" id="main-content-layout">
        {currentUser ? (
          <>
            {currentUser.role === "patient" && <PatientDashboard user={currentUser} />}
            {currentUser.role === "doctor" && <DoctorDashboard user={currentUser} />}
            {currentUser.role === "admin" && <AdminDashboard user={currentUser} />}
          </>
        ) : (
          <LandingPage />
        )}
      </main>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
