import React from "react";
import { Layers } from "lucide-react";

// -----------------------------------------------------------------------
// ExplainabilitySummary
// Renders a "Top Contributing Factors" breakdown next to the Grad-CAM
// heatmap — this is the SHAP/LIME-style explainability piece from your
// synopsis, shown as a simple readable bar list (no need to run real
// SHAP in the browser — the FastAPI model service computes the actual
// percentages and sends them in the API response).
//
// EXPECTED NEW FIELD FROM YOUR MODEL API (add to the /predict response):
//
//   "contributingFactors": [
//     { "label": "Border Irregularity", "weight": 34 },
//     { "label": "Color Variation", "weight": 28 },
//     { "label": "Asymmetry", "weight": 21 },
//     { "label": "Diameter", "weight": 17 }
//   ]
//
// Add this to types.ts:
//   export interface ContributingFactor { label: string; weight: number; }
//   // then in ScanResult: contributingFactors?: ContributingFactor[];
//
// USAGE (drop this next to GradCamCanvas in PatientDashboard/DoctorDashboard):
//   <ExplainabilitySummary factors={selectedScan.contributingFactors} />
// -----------------------------------------------------------------------

interface ContributingFactor {
  label: string;
  weight: number; // 0-100
}

interface ExplainabilitySummaryProps {
  factors?: ContributingFactor[];
}

const BAR_COLORS = ["#0d9488", "#06b6d4", "#f59e0b", "#94a3b8"];

export default function ExplainabilitySummary({ factors }: ExplainabilitySummaryProps) {
  // Graceful fallback if the model hasn't sent factors yet (e.g. mock inference)
  const data =
    factors && factors.length > 0
      ? factors
      : [
          { label: "Border Irregularity", weight: 32 },
          { label: "Color Variation", weight: 27 },
          { label: "Asymmetry", weight: 22 },
          { label: "Texture Pattern", weight: 19 },
        ];

  const sorted = [...data].sort((a, b) => b.weight - a.weight).slice(0, 4);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-cyan-600" />
        Top Contributing Factors
      </h4>
      <p className="text-[10px] text-slate-400 leading-relaxed -mt-2">
        Explainability breakdown of which visual features most influenced this
        prediction (SHAP-derived attribution).
      </p>

      <div className="space-y-3">
        {sorted.map((factor, idx) => (
          <div key={factor.label} className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold text-slate-700">{factor.label}</span>
              <span className="font-mono font-bold text-slate-500">{factor.weight}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${factor.weight}%`,
                  backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {!factors && (
        <p className="text-[9px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
          Placeholder values shown — connect the model API's{" "}
          <code className="font-mono">contributingFactors</code> field to
          display real attribution scores.
        </p>
      )}
    </div>
  );
}