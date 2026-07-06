import React, { useState } from "react";
import { 
  Shield, Activity, Sparkles, BookOpen, AlertTriangle, 
  ChevronRight, ArrowRight, UserCheck, Zap, Lock, Eye, 
  Dna, Award, FileSearch
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
    // On success, AuthContext's onAuthStateChange listener automatically
    // updates currentUser and App.tsx re-renders into the right dashboard.
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
    const { error: signUpError } = await signUp(email, password, name, roleSelection);
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    // Supabase sends a confirmation email by default. Let the user know.
    setSuccessMessage(
      "Account created! Check your inbox to confirm your email, then log in below."
    );
    setIsRegistering(false);
    setPassword("");
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800" id="landing-page">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100 py-16 lg:py-24" id="hero-banner">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.15]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left side: Information */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-cyan-800 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
                Explainable AI Skin Screening — CNN + ViT Ensemble
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Deep Learning Guided <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-500">Skin Cancer Screening</span> Support
              </h1>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl">
                A clinically-validated decision support prototype combining 
                <strong> Convolutional Neural Networks (CNN)</strong> for local pigment spatial extraction and 
                <strong> Vision Transformers (ViT)</strong> with Swish activations for macroscopic global context. 
                Trained on over 45,000 dermoscopic records from HAM10000, ISIC2019, Fitzpatrick17k, and PAD-UFES-20.
              </p>

              {/* Research Model Stats Grid */}
              <div className="grid grid-cols-3 gap-4 py-4 max-w-xl">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-cyan-700">94.8%</div>
                  <div className="text-xs text-slate-500 font-medium">Model Accuracy</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">92.1%</div>
                  <div className="text-xs text-slate-500 font-medium">Precision Score</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-indigo-600">93.5%</div>
                  <div className="text-xs text-slate-500 font-medium">Recall Rate</div>
                </div>
              </div>

              {/* Disclaimer Badge */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed max-w-2xl">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>CLINICAL WARNING & SCOPE LIMITATION:</strong> This platform is a clinical decision-support and screening research prototype. It is NOT a replacement for a certified dermatologist's diagnosis or dynamic surgical biopsy.
                </div>
              </div>
            </div>

            {/* Right side: Interactive Login Card */}
            <div className="lg:col-span-5 mt-10 lg:mt-0" id="login-card">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-8 relative">
                <div className="absolute -top-3 right-4 bg-teal-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Live Auth
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Lock className="h-5 w-5 text-cyan-600" />
                  {isRegistering ? "Register New Account" : "Access Platform"}
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
                      <div className="grid grid-cols-3 gap-2">
                        {(["patient", "doctor", "admin"] as UserRole[]).map((r) => (
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

      {/* Model Explainability & Visual 5-step Pipeline Roadmap */}
      <section className="py-16 bg-white" id="explainability-pipeline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Explainable AI (XAI) Deep Learning Pipeline
            </h2>
            <p className="text-slate-600 text-sm">
              Our B.Tech research project models represent a major step forward in dermatological computer vision. We map our end-to-end inference flow using 5 clinical processing steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative" id="pipeline-grid">
            {/* Step 1 */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="absolute top-3 right-3 text-2xl font-black text-slate-200">01</div>
              <div className="h-10 w-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600 font-bold mb-4">
                <Shield className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Lesion Capture</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Patient captures or uploads a macro lesion photo. Guided by real-time focus & lighting rules.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="absolute top-3 right-3 text-2xl font-black text-slate-200">02</div>
              <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold mb-4">
                <Dna className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Bilayer Prep</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Lesion grid normalized, resized, and contrast-enhanced via high-speed server preprocessing.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="absolute top-3 right-3 text-2xl font-black text-slate-200">03</div>
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">CNN + ViT Ensemble</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                CNN extracts local shapes while the Vision Transformer tracks global attention token maps.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="absolute top-3 right-3 text-2xl font-black text-slate-200">04</div>
              <div className="h-10 w-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 font-bold mb-4">
                <Eye className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Grad-CAM Overlay</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Focal activations mapped to coordinates, projecting heat maps of lesion visual interest back to patient.
              </p>
            </div>

            {/* Step 5 */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl relative group hover:border-cyan-300 hover:bg-white hover:shadow-lg transition-all">
              <div className="absolute top-3 right-3 text-2xl font-black text-slate-200">05</div>
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 font-bold mb-4">
                <FileSearch className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Clinical Dispatch</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                PDF report compiled. Evolving anomalies flagged for rapid dermatologist consult assignment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Education Hub Section */}
      <section className="py-16 bg-slate-50 border-t border-slate-100" id="education-hub">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <div className="inline-flex items-center gap-1.5 text-cyan-600 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="h-4 w-4" />
              DermShield Education Center
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Dermatological Literacy & Self-Check Rules
            </h2>
            <p className="text-slate-600 text-sm">
              Early detection is the single most effective tool against aggressive skin lesions. Understand what to look for on your skin using standardized clinical self-evaluation frameworks.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* The ABCDE Rule Card Panel */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-6" id="abcde-card">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Award className="h-5 w-5 text-cyan-600" />
                The Clinical "ABCDE" Self-Screening Guideline
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">A</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Asymmetry</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Benign spots or nevi are normally perfectly round and balanced. Draw an imaginary line down the middle; if one half does not match the other, it could indicate an atypical lesion.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">B</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Border</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Check the edges. Evolving atypical moles or melanomas often show jagged, blurred, scalloped, notched, or highly irregular border margins.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">C</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Color</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Uniformity is a sign of health. Multiple shades of tan, dark brown, black, blue-white, pink, or red spread inconsistently throughout a single lesion are primary flags.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">D</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Diameter</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Nevi larger than 6 millimeters (roughly the size of a standard pencil eraser) should be checked closely, though aggressive melanomas can occasionally be smaller.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 bg-cyan-100 text-cyan-800 rounded-full font-bold text-sm flex items-center justify-center shrink-0">E</div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Evolving</h5>
                    <p className="text-slate-500 text-xs leading-relaxed mt-0.5">
                      Any mole that dynamically changes size, shape, color, or elevation over weeks or months, or begins bleeding, itching, or crusting, requires immediate dermatological inspection.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Skin Protection Rules */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-gradient-to-br from-cyan-600 to-teal-600 text-white p-6 rounded-2xl shadow-md space-y-4">
                <h4 className="font-bold text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-200" />
                  Primary UV Prevention Guide
                </h4>
                <ul className="space-y-3 text-xs text-cyan-50">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">1.</span>
                    <span><strong>SPF 30+ Daily:</strong> Apply broad-spectrum sunblock even on overcast days. Reapply every two hours during exposure.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">2.</span>
                    <span><strong>Peak UV Shielding:</strong> Limit intense sun exposure between 10:00 AM and 4:00 PM, when UV rays are strongest.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">3.</span>
                    <span><strong>Tanning Bed Avoidance:</strong> Artificial UV tanning beds dramatically compound skin cellular mutations and melanoma risks.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-200">4.</span>
                    <span><strong>Wear Protective Wear:</strong> Shield delicate areas with wide-brimmed hats and polarized UV-protective sunglasses.</span>
                  </li>
                </ul>
              </div>

              {/* Research Citations */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Dna className="h-4.5 w-4.5 text-cyan-600" />
                  Research Datasets & Citations
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Developed in connection with Explainable Deep Learning research, utilizing major public dermatopathology repositories:
                </p>
                <div className="space-y-2 text-[10px] font-mono text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>• HAM10000 (Human Against Machine, 10,000 cases)</div>
                  <div>• ISIC 2019 (International Skin Imaging Collaboration)</div>
                  <div>• Fitzpatrick17k (Diverse skin phototype dataset)</div>
                  <div>• PAD-UFES-20 (Clinical smartphone lesion photos)</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Platform Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800" id="landing-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
            <Shield className="h-5 w-5 text-cyan-500" />
            <span>DermShield AI Platform</span>
          </div>
          <p className="text-xs max-w-2xl mx-auto leading-relaxed">
            DermShield AI is an experimental decision-support prototype trained on public research datasets. It is not licensed as an autonomous diagnostic software. Always obtain primary medical diagnostic assessments and biopsies from a registered medical practitioner.
          </p>
          <div className="text-[10px] text-slate-600 font-mono">
            © 2026 DermShield AI Research Project • All Rights Reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
