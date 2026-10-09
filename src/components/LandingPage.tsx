import React, { useState } from "react";
import { 
  Shield, Activity, Sparkles, BookOpen, AlertTriangle, 
  ChevronRight, ArrowRight, UserCheck, Zap, Lock, Eye, 
  Dna, Award, FileSearch, CheckCircle2, BarChart3, 
  Database, Layers, Info, ExternalLink, Cpu, TrendingUp
} from "lucide-react";
import { UserRole } from "../types";
import { useAuth } from "../AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function LandingPage() {
  const { signUp, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleSelection, setRoleSelection] = useState<UserRole>("patient");
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showResendLink, setShowResendLink] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setShowResendLink(false);
    setResendStatus("");

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      if (signInError.toLowerCase().includes("email not confirmed")) {
        setError(
          "Your email address is not verified yet. Please check your inbox (and spam folder) for a confirmation email from DermShield AI, and click the link inside before logging in."
        );
        setShowResendLink(true);
      } else if (signInError.toLowerCase().includes("invalid login credentials")) {
        setError("Incorrect email or password. Please try again.");
        setShowResendLink(false);
      } else {
        setError(signInError);
        setShowResendLink(false);
      }
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address above first.");
      return;
    }
    setResendStatus("sending");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email
    });
    setResendStatus(resendError ? "failed" : "sent");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password || !name) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (roleSelection === "doctor" && !license) {
      setError("Medical license ID is required for doctor accounts.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(
      email,
      password,
      name,
      roleSelection,
      roleSelection === "doctor" ? license.trim() : undefined
    );
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    setSuccessMessage(
      "Account created! Check your inbox to confirm your email, then log in below."
    );
    setIsRegistering(false);
    setPassword("");
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans selection:bg-cyan-500 selection:text-white" id="landing-page">
      
      {/* Top Research Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">DERMSHIELD AI</span>
                <span className="text-[9px] font-mono font-bold bg-cyan-100/70 text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-200">
                  RESEARCH PROTOTYPE
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">Explainable Skin Lesion Screening System</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button 
              type="button" 
              onClick={() => scrollToSection("research-metrics")} 
              className="hover:text-cyan-600 transition-colors cursor-pointer"
            >
              Evaluation Metrics
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("accuracy-comparison")} 
              className="hover:text-cyan-600 transition-colors cursor-pointer"
            >
              Dataset Comparison
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("model-architecture")} 
              className="hover:text-cyan-600 transition-colors cursor-pointer"
            >
              Model Architecture
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("explainability-pipeline")} 
              className="hover:text-cyan-600 transition-colors cursor-pointer"
            >
              XAI Pipeline
            </button>
            <button 
              type="button" 
              onClick={() => scrollToSection("research-limitations")} 
              className="hover:text-cyan-600 transition-colors cursor-pointer"
            >
              Limitations
            </button>
          </nav>

          <button
            type="button"
            onClick={() => scrollToSection("login-card")}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span>Access Platform</span>
            <ChevronRight className="h-3.5 w-3.5 text-cyan-400" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/70 py-16 lg:py-20" id="hero-banner">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.12] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
            
            {/* Left side: Evidence-based Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-200/80 rounded-full text-cyan-800 text-xs font-bold uppercase tracking-wider shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-cyan-600 animate-pulse" />
                <span>EXPLAINABLE AI • SKIN LESION RESEARCH</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Advanced Deep Learning for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">Skin Lesion Screening Support</span>
              </h1>

              {/* Supporting Description */}
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
                Explore a research-driven skin lesion classification platform built around modern deep learning, transparent evaluation, and explainable AI concepts.
              </p>

              {/* Functional Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => scrollToSection("login-card")}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 text-white font-bold rounded-xl text-sm shadow-md shadow-cyan-600/20 cursor-pointer transition-all flex items-center gap-2"
                >
                  <span>Access Platform</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("research-metrics")}
                  className="px-5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4 text-cyan-600" />
                  <span>Explore Research Results</span>
                </button>
              </div>

              {/* Prominent Clinical Disclaimer */}
              <div className="flex items-start gap-3 p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed max-w-2xl shadow-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-amber-950 uppercase tracking-wider text-[11px] block mb-0.5">
                    Clinical Research Disclaimer
                  </strong>
                  Experimental research and screening-support prototype. Not a medical diagnosis or a substitute for professional dermatological evaluation.
                </div>
              </div>

              {/* Featured Research Accuracy Card */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl border border-slate-700 shadow-xl max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-teal-400" />
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-teal-300">
                      Featured Research Accuracy
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    SwinV2-Base Architecture
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-4xl sm:text-5xl font-black tracking-tight text-white flex items-baseline gap-1">
                      <span>95.34%</span>
                      <span className="text-sm font-semibold text-teal-400 font-mono">Top Validation</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 font-medium">
                      Best reported validation result • Epoch 4 • ISIC 2019
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:border-l sm:border-slate-700 sm:pl-4">
                    <div>
                      <div className="text-lg font-bold text-teal-300 font-mono">93.32%</div>
                      <div className="text-[10px] text-slate-400">Balanced Accuracy</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-cyan-300 font-mono">92.47%</div>
                      <div className="text-[10px] text-slate-400">Macro F1-Score</div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-2.5 leading-relaxed flex items-start gap-1.5 font-sans">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Validation results were used for model selection. Final generalization performance should be assessed using the separate locked test set.
                  </span>
                </div>
              </div>

            </div>

            {/* Right side: Interactive Login & Registration Card (Preserved 100%) */}
            <div className="lg:col-span-5 mt-10 lg:mt-0" id="login-card">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-8 relative">
                <div className="absolute -top-3 right-4 bg-teal-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-200 animate-pulse" />
                  <span>Interactive Auth</span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Lock className="h-5 w-5 text-cyan-600" />
                  <span>{isRegistering ? "Register New Account" : "Access Platform"}</span>
                </h3>

                {error && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      <span className="leading-relaxed">{error}</span>
                    </div>
                    {showResendLink && (
                      <div className="pl-6">
                        {resendStatus === "sent" ? (
                          <span className="text-emerald-700 font-semibold">
                            Confirmation email resent! Please check your inbox.
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendConfirmation}
                            disabled={resendStatus === "sending"}
                            className="text-rose-700 font-bold underline hover:text-rose-900 cursor-pointer disabled:opacity-50"
                          >
                            {resendStatus === "sending" ? "Resending..." : "Resend confirmation email"}
                          </button>
                        )}
                        {resendStatus === "failed" && (
                          <span className="block text-rose-600 mt-1">Failed to resend. Please try again shortly.</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {successMessage && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {!isRegistering && (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Quick Demo Workspaces</span>
                      <span className="text-[9px] text-cyan-700 font-medium">Click to populate</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("patient@dermshield.com");
                          setPassword("patient123");
                        }}
                        className="py-1.5 px-2 text-[11px] font-semibold bg-white hover:bg-cyan-50 hover:text-cyan-800 border border-slate-200 rounded-lg text-slate-700 transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("doctor@dermshield.com");
                          setPassword("doctor123");
                        }}
                        className="py-1.5 px-2 text-[11px] font-semibold bg-white hover:bg-cyan-50 hover:text-cyan-800 border border-slate-200 rounded-lg text-slate-700 transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmail("admin@dermshield.com");
                          setPassword("admin123");
                        }}
                        className="py-1.5 px-2 text-[11px] font-semibold bg-white hover:bg-cyan-50 hover:text-cyan-800 border border-slate-200 rounded-lg text-slate-700 transition-colors text-center cursor-pointer shadow-2xs"
                      >
                        Admin
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Auth Form */}
                <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                  
                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Aniket Kansal"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      required
                      minLength={6}
                    />
                  </div>

                  {isRegistering && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Select Access Role</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["patient", "doctor"] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRoleSelection(r)}
                            className={`py-1.5 px-2 border rounded-lg text-xs font-semibold capitalize transition-all ${
                              roleSelection === r
                                ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRegistering && roleSelection === "doctor" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Medical Council License ID</label>
                      <input
                        type="text"
                        placeholder="LIC-XXXXX-DERM"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-600 text-white font-semibold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{isRegistering ? "Create Account" : "Secure Log In"}</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Toggle Register/Login */}
                <div className="text-center mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError("");
                      setSuccessMessage("");
                    }}
                    className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 cursor-pointer"
                  >
                    {isRegistering ? "Already registered? Login here" : "Don't have an account? Sign up here"}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Section 4: Three Research Evaluation Cards */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/80" id="research-metrics">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-cyan-700 font-mono text-xs uppercase tracking-wider font-bold">
              <BarChart3 className="h-4 w-4 text-cyan-600" />
              <span>Reported Paper Evaluation Results</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Research Performance Across Evaluation Sets
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Empirical multi-class evaluation reported across internal validation, locked test partitions, and external multi-center dermoscopic datasets. These represent published academic benchmarks, not real-time clinical guarantees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Card A — Validation Performance */}
            <div className="bg-white rounded-2xl border-2 border-teal-500/40 shadow-md p-6 space-y-5 relative hover:border-teal-500 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    VALIDATION
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Epoch 4 Checkpoint</span>
                </div>

                <div>
                  <div className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                    <span>95.34%</span>
                    <span className="text-xs text-teal-600 font-semibold uppercase">Accuracy</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">ISIC 2019 validation partition</p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Balanced Accuracy:</span>
                    <span className="font-bold text-slate-800 font-mono">93.32%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Macro F1-Score:</span>
                    <span className="font-bold text-slate-800 font-mono">92.47%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Partition Size:</span>
                    <span className="font-bold text-slate-800 font-mono">3,712 images</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-[11px] text-teal-900 leading-relaxed">
                <strong>Evaluation Role:</strong> Used for model hyperparameter selection and best checkpoint identification prior to frozen testing.
              </div>
            </div>

            {/* Card B — Locked Test Performance */}
            <div className="bg-white rounded-2xl border-2 border-cyan-500/40 shadow-md p-6 space-y-5 relative hover:border-cyan-500 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                    LOCKED TEST
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">3,645 Evaluated Images</span>
                </div>

                <div>
                  <div className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                    <span>92.76%</span>
                    <span className="text-xs text-cyan-600 font-semibold uppercase">Accuracy</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">ISIC 2019 locked test benchmark</p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Balanced Accuracy:</span>
                    <span className="font-bold text-slate-800 font-mono">86.39%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Macro F1-Score:</span>
                    <span className="font-bold text-slate-800 font-mono">88.88%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Macro Precision:</span>
                    <span className="font-bold text-slate-800 font-mono">92.45%</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 text-[11px] text-cyan-900 leading-relaxed">
                <strong>Evaluation Role:</strong> Unbiased held-out test evaluation reflecting model performance on unseen dermoscopic specimens.
              </div>
            </div>

            {/* Card C — External Validation */}
            <div className="bg-white rounded-2xl border-2 border-amber-500/40 shadow-md p-6 space-y-5 relative hover:border-amber-500 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    EXTERNAL VALIDATION
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Derm7pt Subset</span>
                </div>

                <div>
                  <div className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
                    <span>82.40%</span>
                    <span className="text-xs text-amber-600 font-semibold uppercase">Accuracy</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Out-of-distribution clinical generalization</p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Balanced Accuracy:</span>
                    <span className="font-bold text-slate-800 font-mono">67.33%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Macro F1-Score:</span>
                    <span className="font-bold text-slate-800 font-mono">71.17%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Evaluated Cases:</span>
                    <span className="font-bold text-slate-800 font-mono">375 cases</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Evaluation Role:</strong> Transparent external hospital test illustrating domain-shift drop when generalizing across acquisition hardware.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Section 5: Accuracy Comparison Visualization */}
      <section className="py-16 bg-white border-b border-slate-200/80" id="accuracy-comparison">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700">
              Comparative Benchmark Visualization
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Cross-Partition Accuracy Comparison (0–100% Scale)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Visual comparison across the three reported evaluation regimes on a common, untruncated 0–100% scale. Lower external validation highlights real-world domain adaptation challenges.
            </p>
          </div>

          {/* Accessible horizontal bar visualization */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm" role="region" aria-label="Research Accuracy Comparison Chart">
            
            {/* Scale markers */}
            <div className="hidden sm:flex justify-between text-[10px] font-mono text-slate-400 border-b border-slate-200 pb-2 px-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>

            {/* Bar 1: Validation */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs">
                <div>
                  <strong className="text-slate-900 font-bold">Validation Set</strong>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">(ISIC 2019 Validation Partition • Epoch 4 Checkpoint)</span>
                </div>
                <span className="font-extrabold font-mono text-teal-700 text-sm">95.34%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-700" 
                  style={{ width: "95.34%" }}
                  role="progressbar"
                  aria-valuenow={95.34}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Bar 2: Locked Test */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs">
                <div>
                  <strong className="text-slate-900 font-bold">Locked Test Set</strong>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">(ISIC 2019 Frozen Test Set • 3,645 Images)</span>
                </div>
                <span className="font-extrabold font-mono text-cyan-700 text-sm">92.76%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-cyan-600 to-teal-500 h-full rounded-full transition-all duration-700" 
                  style={{ width: "92.76%" }}
                  role="progressbar"
                  aria-valuenow={92.76}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Bar 3: External Derm7pt */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs">
                <div>
                  <strong className="text-slate-900 font-bold">External Validation</strong>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">(Derm7pt Independent Clinical Subset • 375 Cases)</span>
                </div>
                <span className="font-extrabold font-mono text-amber-700 text-sm">82.40%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-700" 
                  style={{ width: "82.40%" }}
                  role="progressbar"
                  aria-valuenow={82.40}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Context Note */}
            <p className="text-[11px] text-slate-500 pt-3 border-t border-slate-200/80 leading-relaxed">
              * Note: Values represent academic research evaluation reported in the project study. Common 0–100% axis displayed without truncation to avoid artificial visual distortion.
            </p>

            {/* Screen reader table alternative */}
            <div className="sr-only">
              <table>
                <caption>Research Accuracy Comparison</caption>
                <thead>
                  <tr><th>Partition</th><th>Accuracy</th></tr>
                </thead>
                <tbody>
                  <tr><td>Validation Set (ISIC 2019)</td><td>95.34%</td></tr>
                  <tr><td>Locked Test Set (ISIC 2019)</td><td>92.76%</td></tr>
                  <tr><td>External Validation (Derm7pt)</td><td>82.40%</td></tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>
      </section>

      {/* Section 6: Model Research Highlights */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/80" id="model-architecture">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700">
              Technical Specifications
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Built for Rigorous Skin Lesion Research
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Verified experimental configurations and dataset partitions evaluated during the research study.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Architecture</span>
              <div className="text-sm font-bold text-slate-900">Swin Transformer V2 Base</div>
              <span className="text-[10px] text-cyan-600 font-mono">swinv2_base_window12to24</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Input Resolution</span>
              <div className="text-sm font-bold text-slate-900">384 × 384 Pixels</div>
              <span className="text-[10px] text-slate-500 font-mono">Bicubic Interpolation</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Diagnostic Classes</span>
              <div className="text-sm font-bold text-slate-900">8 Lesion Categories</div>
              <span className="text-[10px] text-slate-500 font-mono">MEL, NV, BCC, AK, +4</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Primary Dataset</span>
              <div className="text-sm font-bold text-slate-900">ISIC 2019</div>
              <span className="text-[10px] text-slate-500 font-mono">Multi-institutional</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Training Partition</span>
              <div className="text-sm font-bold text-slate-900">17,974 Images</div>
              <span className="text-[10px] text-slate-500 font-mono">Augmented & Balanced</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Validation Partition</span>
              <div className="text-sm font-bold text-slate-900">3,712 Images</div>
              <span className="text-[10px] text-slate-500 font-mono">Hyperparameter Tuning</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">Locked Test Set</span>
              <div className="text-sm font-bold text-slate-900">3,645 Images</div>
              <span className="text-[10px] text-slate-500 font-mono">Held-out Evaluation</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">External Evaluation</span>
              <div className="text-sm font-bold text-slate-900">375 Cases (Derm7pt)</div>
              <span className="text-[10px] text-amber-600 font-mono">Multi-center Clinical</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-3 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-600" />
              <span>Training Methodology & Leakage Prevention</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              The research evaluates an imbalance-aware training strategy with data augmentation, class weighting, label smoothing, and MixUp/CutMix. A duplicate-aware, group-stratified evaluation protocol was used to reduce data leakage between partitions.
            </p>
          </div>

        </div>
      </section>

      {/* Section 7: Explainable AI Pipeline (Refined) */}
      <section className="py-16 bg-white border-b border-slate-200/80" id="explainability-pipeline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-700">
              Methodological Workflow
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Explainable AI (XAI) Research Pipeline
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              A 5-step structured clinical screening research pipeline designed to transform raw specimen captures into transparent, interpretable diagnostic predictions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6" id="pipeline-grid">
            
            {/* Step 1 */}
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-md transition-all space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-9 w-9 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-700 font-bold">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <span className="text-xl font-black text-slate-300 font-mono">01</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Lesion Capture</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Macroscopic specimen capture guided by structured clinical checklists (illumination, autofocus, distance, backdrop).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-md transition-all space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-9 w-9 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold">
                  <Dna className="h-4.5 w-4.5" />
                </div>
                <span className="text-xl font-black text-slate-300 font-mono">02</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Image Preprocessing</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Spatial resizing to 384 × 384 pixels with bicubic interpolation and standard ImageNet RGB tensor normalization.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-md transition-all space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-9 w-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700 font-bold">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <span className="text-xl font-black text-slate-300 font-mono">03</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Model Inference</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Swin Transformer V2 Base extracts hierarchical shifted-window representations, predicting softmax probabilities across 8 ISIC classes.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-md transition-all space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-9 w-9 bg-rose-100 rounded-lg flex items-center justify-center text-rose-700 font-bold">
                  <Eye className="h-4.5 w-4.5" />
                </div>
                <span className="text-xl font-black text-slate-300 font-mono">04</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Explainability / Grad-CAM</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Gradient-weighted feature activations mapped from the final transformer stage to create transparent thermal focus overlays.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-5 bg-slate-50 border border-slate-200/90 rounded-2xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-md transition-all space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-9 w-9 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold">
                  <FileSearch className="h-4.5 w-4.5" />
                </div>
                <span className="text-xl font-black text-slate-300 font-mono">05</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Clinical Report / Dispatch</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Automated risk level classification, printable clinical PDF compilation, and specialist dermatologist review queue routing.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Section 8: Transparent Research Limitations */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/80" id="research-limitations">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-700">
              Scientific Transparency
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Transparent Evaluation. Responsible AI.
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Ethical clinical machine learning requires clear communication of statistical boundaries, minority-class challenges, and external generalization limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Layers className="h-4.5 w-4.5 text-cyan-600" />
                <span>Validation vs. Test Discrepancy</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Validation accuracy reached 95.34%, while locked-test accuracy was 92.76%. These results represent different evaluation sets. Validation numbers are utilized for model checkpoint selection, not final generalization claims.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <TrendingUp className="h-4.5 w-4.5 text-amber-600" />
                <span>Cross-Dataset Generalization</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Accuracy on the external Derm7pt subset was 82.40%, with balanced accuracy of 67.33%. Performance may vary across datasets and image sources due to lighting, camera optics, and patient demographic variations.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                <span>Minority-Class Challenges</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Performance varied across diagnostic categories, with lower recall for some less frequent classes. A high aggregate overall score does not guarantee uniform clinical sensitivity across rare dermatological conditions.
              </p>
            </div>

          </div>

          <div className="p-5 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-950 text-xs leading-relaxed max-w-3xl mx-auto space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900 uppercase text-[11px]">
              <Info className="h-4 w-4 text-amber-700" />
              <span>Mandatory Clinical Notice</span>
            </div>
            <p>
              This research platform has recognized limitations, including limited external evaluation and the need for further clinical validation. Model predictions must never be interpreted as confirmed pathology or used to delay urgent consultation with a qualified dermatologist.
            </p>
          </div>

        </div>
      </section>

      {/* Section 9: Clinical Education Hub */}
      <section className="py-16 bg-white border-b border-slate-200/80" id="education-hub">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-cyan-600 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="h-4 w-4" />
              <span>DermShield Education Center</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Dermatological Literacy & Self-Check Rules
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Early detection remains the single most effective tool against aggressive cutaneous lesions. Understand standardized clinical self-evaluation frameworks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* The ABCDE Rule Card Panel */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md space-y-6" id="abcde-card">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="h-5 w-5 text-cyan-600" />
                <span>The Clinical "ABCDE" Self-Screening Guideline</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">A</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Asymmetry</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Benign nevi are typically symmetrical. If one half does not visually match the other half, it indicates an atypical melanocytic pattern.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">B</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Border</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Look closely at the lesion edges. Jagged, notched, blurred, scalloped, or irregular margins warrant dermatological examination.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">C</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Color</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Uniform coloration is characteristic of healthy moles. Multiple shades of tan, brown, black, red, white, or blue in a single spot are important warning signs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">D</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Diameter</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Spots greater than 6 mm in diameter (approximately the size of a pencil eraser) should be tracked carefully, though aggressive melanomas can also present smaller.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">E</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Evolving</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Any mole that dynamically shifts in size, shape, color, or elevation, or displays new symptoms such as bleeding, itching, or crusting, requires urgent clinical review.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Skin Protection Rules & Citations */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-gradient-to-br from-cyan-600 to-teal-600 text-white p-6 rounded-2xl shadow-md space-y-4">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-200" />
                  <span>Primary UV Prevention Guide</span>
                </h4>
                <ul className="space-y-3 text-xs text-cyan-50">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">1.</span>
                    <span><strong>SPF 30+ Daily:</strong> Apply broad-spectrum sunscreen daily, even during overcast weather. Reapply every two hours during sun exposure.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">2.</span>
                    <span><strong>Peak UV Shielding:</strong> Minimize direct exposure between 10:00 AM and 4:00 PM when solar UV radiation is most intense.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">3.</span>
                    <span><strong>Avoid Artificial UV:</strong> Tanning bed exposure significantly multiplies cellular DNA mutations and skin cancer incidence.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">4.</span>
                    <span><strong>Protective Wear:</strong> Protect sensitive facial areas with wide-brimmed hats and UV400-rated polarized sunglasses.</span>
                  </li>
                </ul>
              </div>

              {/* Research Citations */}
              <div className="bg-white border border-slate-200/90 p-6 rounded-2xl shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-cyan-600" />
                  <span>Research Datasets & Citations</span>
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Developed in connection with Explainable Deep Learning research, utilizing major public dermatopathology repositories:
                </p>
                <div className="space-y-1.5 text-[10px] font-mono text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <div>• ISIC 2019 (International Skin Imaging Collaboration)</div>
                  <div>• HAM10000 (Human Against Machine with 10,000 cases)</div>
                  <div>• Derm7pt (Seven-Point Checklist Dermatology Dataset)</div>
                  <div>• Fitzpatrick17k (Diverse skin phototype repository)</div>
                  <div>• PAD-UFES-20 (Smartphone clinical lesion dataset)</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Platform Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800" id="landing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
            <Shield className="h-5 w-5 text-cyan-500" />
            <span>DermShield AI Platform</span>
          </div>
          <p className="text-xs max-w-2xl mx-auto leading-relaxed text-slate-400">
            DermShield AI is an experimental decision-support prototype trained on public research datasets. It is not licensed as an autonomous diagnostic software. Always obtain primary medical diagnostic assessments and biopsies from a registered medical practitioner.
          </p>
          <div className="text-[10px] text-slate-500 font-mono">
            © 2026 DermShield AI Research Project • All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
