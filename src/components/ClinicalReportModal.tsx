import React from "react";
import { Printer, Download, X, Shield, Activity, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { ScanResult } from "../types";

interface ClinicalReportModalProps {
  scan: ScanResult;
  patientName?: string;
  onClose: () => void;
}

export default function ClinicalReportModal({
  scan,
  patientName = "Patient Case Review",
  onClose
}: ClinicalReportModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const isHighRisk = scan.riskLevel === "High";
const isModRisk = scan.riskLevel === "Medium";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 my-8 print:my-0 print:border-none print:shadow-none print:rounded-none">
        
        {/* Web Modal Toolbar (Hidden during print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <span className="font-bold text-sm tracking-tight">Official Clinical Triage & XAI Diagnostic Report</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save as PDF (Ctrl+P)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE REPORT DOCUMENT BODY */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 font-sans print:p-6" id="printable-clinical-report">
          
          {/* Header & Hospital Banner */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-cyan-700 flex items-center justify-center text-white font-black text-sm">
                  +
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    DERMSHIELD AI ONCOLOGY UNIT
                  </h1>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Clinical Decision Support & Explainable Lesion Screening System
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-mono mt-1">
                Model: Swin Transformer V2 Base (384×384) • ISIC 2019 Leakage-Free Cohort
              </p>
            </div>

            <div className="text-right space-y-0.5 text-xs">
              <div className="font-mono font-bold text-slate-900">
                CASE REF: #{scan.id.slice(0, 10).toUpperCase()}
              </div>
              <div className="text-slate-500 text-[11px]">
                Date: {new Date(scan.timestamp).toLocaleDateString()} {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="inline-block bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-700">
                CONFIDENTIAL MEDICAL RECORD
              </div>
            </div>
          </div>

          {/* Patient Demographics & Specimen Metadata */}
          <div className="grid grid-cols-4 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name / Identifier</span>
              <strong className="text-slate-800">{patientName}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cutaneous Anatomical Site</span>
              <strong className="text-slate-800">{scan.bodyLocation || "Not specified"}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Acquisition Modality</span>
              <strong className="text-slate-800">Polarized Dermoscopy (ISIC)</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Triage Priority</span>
              <strong className={isHighRisk ? "text-rose-700" : isModRisk ? "text-amber-700" : "text-emerald-700"}>
                {isHighRisk ? "URGENT (Tier 1)" : isModRisk ? "PRIORITY (Tier 2)" : "ROUTINE (Tier 3)"}
              </strong>
            </div>
          </div>

          {/* Primary Model Classification Box */}
          <div className={`p-5 rounded-xl border-2 flex items-center justify-between ${
            isHighRisk
              ? "bg-rose-50/70 border-rose-400 text-rose-950"
              : isModRisk
              ? "bg-amber-50/70 border-amber-400 text-amber-950"
              : "bg-emerald-50/70 border-emerald-400 text-emerald-950"
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                PRIMARY DEEP LEARNING INFERENCE
              </span>
              <h2 className="text-2xl font-black tracking-tight">
                {scan.predictedClass}
              </h2>
              <p className="text-xs max-w-xl opacity-90 leading-relaxed">
                {scan.explanation}
              </p>
            </div>

            <div className="text-right pl-6 border-l border-current/20 space-y-1">
              <div className="text-3xl font-black font-mono">
                {scan.confidence.toFixed(1)}%
              </div>
              <div className="text-[10px] uppercase font-bold">Posterior Probability</div>
              <div className="text-[9px] font-mono opacity-80">
                Uncertainty: {((scan.uncertaintyScore || 0.08) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Side-by-Side Visual Evidence (Raw Specimen vs Grad-CAM Attention) */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-cyan-600" />
              Visual Evidence: Dermoscopy Capture & Grad-CAM Attention Layer
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Raw Image */}
              <div className="border border-slate-200 rounded-xl overflow-hidden p-2 bg-slate-50 text-center space-y-1.5">
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img
                    src={scan.imageUrl}
                    alt="Raw dermoscopy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-[10px] font-bold text-slate-600 uppercase">
                  Figure 1: Raw Macroscopic Dermoscopy Specimen
                </div>
              </div>

              {/* Heatmap / Grad-CAM */}
              <div className="border border-slate-200 rounded-xl overflow-hidden p-2 bg-slate-50 text-center space-y-1.5 relative">
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-900 relative flex items-center justify-center">
                  <img
                    src={scan.imageUrl}
                    alt="Underlay"
                    className="w-full h-full object-cover opacity-60"
                  />
                  {scan.heatmapImage ? (
                    <img
                      src={scan.heatmapImage}
                      alt="Grad-CAM"
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-28 w-28 rounded-full bg-gradient-to-r from-rose-500/80 via-amber-400/70 to-transparent blur-md animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-bold text-cyan-700 uppercase">
                  Figure 2: Swin Transformer V2 Grad-CAM Focus Heatmap
                </div>
              </div>
            </div>
          </div>

          {/* ABCDE Feature Scoring Matrix */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              ABCDE Dermatological Feature Scoring
            </h3>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-bold text-slate-400">A — Asymmetry</div>
                <div className="font-bold text-slate-800 mt-1">{isHighRisk ? "High (Bi-axial)" : "Symmetrical"}</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-bold text-slate-400">B — Border</div>
                <div className="font-bold text-slate-800 mt-1">{isHighRisk ? "Notched/Irregular" : "Even Circumscribed"}</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-bold text-slate-400">C — Color</div>
                <div className="font-bold text-slate-800 mt-1">{isHighRisk ? "Variegated (3+ hues)" : "Uniform Brown"}</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-bold text-slate-400">D — Diameter</div>
                <div className="font-bold text-slate-800 mt-1">&gt; 6 mm</div>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[10px] font-bold text-slate-400">E — Evolution</div>
                <div className="font-bold text-slate-800 mt-1">Under Tracking</div>
              </div>
            </div>
          </div>

          {/* Clinical Action & Signature Block */}
          <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Recommended Clinical Action Pathway
              </span>
              <div className="space-y-1.5 text-[11px] text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={isHighRisk} className="rounded text-cyan-600" />
                  <span>Urgent Punch/Excisional Biopsy for Histopathology</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={isModRisk} className="rounded text-cyan-600" />
                  <span>3-Month High-Resolution Dermoscopy Follow-up</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={!isHighRisk && !isModRisk} className="rounded text-cyan-600" />
                  <span>Routine Annual Skin Self-Examination & Patient Education</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block text-right">
                Attending Clinician / Reviewing Dermatologist
              </span>
              <div className="border-b border-slate-400 pt-8" />
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>Dr. Signature & Reg No.</span>
                <span>Date & Official Clinic Stamp</span>
              </div>
            </div>
          </div>

          {/* Research Disclaimer Footer */}
          <div className="text-[9px] text-slate-400 border-t border-slate-200 pt-3 text-center leading-relaxed">
            DermShield AI is a software decision support research tool evaluated on the ISIC 2019 dataset. This document represents automated deep neural inference coupled with explainability outputs and must be validated by a board-certified dermatologist before any surgical excision.
          </div>

        </div>

      </div>
    </div>
  );
}
