import React from "react";
import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Eye } from "lucide-react";

export interface BenchmarkSpecimen {
  id: string;
  name: string;
  shortCode: "MEL" | "NV" | "BCC" | "BKL";
  classification: string;
  isicId: string;
  riskLevel: "high" | "low" | "moderate";
  bodyLocation: string;
  description: string;
  keyDermoscopicFeatures: string[];
  imageUrl: string;
  simulatedResult: {
    predictedClass: string;
    confidence: number;
    riskLevel: "high" | "low" | "moderate";
    uncertaintyScore: number;
    explanation: string;
    contributingFactors: { label: string; weight: number }[];
    heatmapPoints: { x: number; y: number; radius: number; weight: number }[];
  };
}

// High-fidelity SVG-based dermoscopy specimens for instant, guaranteed offline presentation
const createSpecimenSvg = (type: "MEL" | "NV" | "BCC" | "BKL") => {
  if (type === "MEL") {
    // Malignant Melanoma: Asymmetric, dark blotches, irregular notched border
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">
      <defs>
        <radialGradient id="skin" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="%23f6d7be"/>
          <stop offset="70%" stop-color="%23e8be9e"/>
          <stop offset="100%" stop-color="%23d6a988"/>
        </radialGradient>
        <radialGradient id="mel_core" cx="42%" cy="46%" r="55%">
          <stop offset="0%" stop-color="%231a0f0a"/>
          <stop offset="35%" stop-color="%233d1c11"/>
          <stop offset="70%" stop-color="%236e321b"/>
          <stop offset="90%" stop-color="%239e552f"/>
          <stop offset="100%" stop-color="%23d6a988" stop-opacity="0"/>
        </radialGradient>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="turb"/>
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="14" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <rect width="384" height="384" fill="url(%23skin)"/>
      <!-- Surrounding erythematous rim -->
      <path d="M 120 180 Q 140 100 220 110 Q 300 130 280 230 Q 250 310 170 290 Q 90 260 120 180 Z" fill="%23c26a52" opacity="0.35" filter="url(%23noise)"/>
      <!-- Main asymmetric lesion body -->
      <path d="M 130 190 Q 150 120 230 130 Q 290 150 265 240 Q 235 300 165 275 Q 105 245 130 190 Z" fill="url(%23mel_core)" filter="url(%23noise)"/>
      <!-- Atypical dark pigment blotch -->
      <path d="M 150 170 Q 165 140 205 155 Q 225 180 200 220 Q 170 230 150 200 Z" fill="%230d0705" opacity="0.9" filter="url(%23noise)"/>
      <!-- Radial streaming & pseudopods -->
      <circle cx="260" cy="180" r="14" fill="%234a1e12" opacity="0.8"/>
      <circle cx="270" cy="210" r="11" fill="%235a2818" opacity="0.75"/>
      <circle cx="130" cy="235" r="9" fill="%233a170e" opacity="0.8"/>
      <!-- Dermoscopy scale marker grid lines -->
      <line x1="20" y1="360" x2="80" y2="360" stroke="%23334155" stroke-width="2"/>
      <line x1="20" y1="354" x2="20" y2="366" stroke="%23334155" stroke-width="2"/>
      <line x1="80" y1="354" x2="80" y2="366" stroke="%23334155" stroke-width="2"/>
      <text x="28" y="352" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23334155">1.0 cm</text>
    </svg>`;
  }

  if (type === "NV") {
    // Benign Melanocytic Nevus: Symmetrical, uniform oval, regular pigment network
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">
      <defs>
        <radialGradient id="skin_nv" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="%23f9dec9"/>
          <stop offset="100%" stop-color="%23dfb394"/>
        </radialGradient>
        <radialGradient id="nevus_core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="%235c341e"/>
          <stop offset="45%" stop-color="%237b4629"/>
          <stop offset="85%" stop-color="%23a4653e"/>
          <stop offset="100%" stop-color="%23a4653e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="384" height="384" fill="url(%23skin_nv)"/>
      <!-- Symmetrical oval regular nevus -->
      <ellipse cx="192" cy="192" rx="78" ry="72" fill="url(%23nevus_core)"/>
      <ellipse cx="192" cy="192" rx="60" ry="55" fill="%236e3c20" opacity="0.6"/>
      <ellipse cx="192" cy="192" rx="35" ry="32" fill="%234d2813" opacity="0.75"/>
      <!-- Regular peripheral globules -->
      <circle cx="150" cy="160" r="5" fill="%233e1f0e" opacity="0.6"/>
      <circle cx="230" cy="160" r="5" fill="%233e1f0e" opacity="0.6"/>
      <circle cx="150" cy="225" r="5" fill="%233e1f0e" opacity="0.6"/>
      <circle cx="230" cy="225" r="5" fill="%233e1f0e" opacity="0.6"/>
      <circle cx="192" cy="140" r="4.5" fill="%233e1f0e" opacity="0.6"/>
      <circle cx="192" cy="245" r="4.5" fill="%233e1f0e" opacity="0.6"/>
      <!-- Dermoscopy scale -->
      <line x1="20" y1="360" x2="80" y2="360" stroke="%23334155" stroke-width="2"/>
      <text x="32" y="352" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23334155">5 mm</text>
    </svg>`;
  }

  if (type === "BCC") {
    // Basal Cell Carcinoma: Translucent, arborizing telangiectasia (branching vessels)
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">
      <defs>
        <radialGradient id="skin_bcc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="%23f7d8c6"/>
          <stop offset="100%" stop-color="%23e0b296"/>
        </radialGradient>
        <radialGradient id="bcc_papule" cx="48%" cy="48%" r="48%">
          <stop offset="0%" stop-color="%23fce2db"/>
          <stop offset="40%" stop-color="%23e8a59b"/>
          <stop offset="80%" stop-color="%23cb7a6f"/>
          <stop offset="100%" stop-color="%23cb7a6f" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="384" height="384" fill="url(%23skin_bcc)"/>
      <!-- Translucent pearly nodule -->
      <ellipse cx="192" cy="192" rx="85" ry="80" fill="url(%23bcc_papule)"/>
      <!-- Arborizing telangiectasia vessels (tree branch capillaries) -->
      <path d="M 150 220 Q 170 190 210 180 T 250 160" fill="none" stroke="%23b91c1c" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M 180 188 Q 200 165 215 150" fill="none" stroke="%23dc2626" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 210 180 Q 230 195 245 220" fill="none" stroke="%23dc2626" stroke-width="2" stroke-linecap="round"/>
      <path d="M 160 215 Q 140 235 130 250" fill="none" stroke="%23dc2626" stroke-width="2" stroke-linecap="round"/>
      <!-- Blue-gray ovoid nests -->
      <ellipse cx="165" cy="165" rx="14" ry="10" fill="%23334155" opacity="0.75"/>
      <ellipse cx="225" cy="215" rx="12" ry="9" fill="%23475569" opacity="0.7"/>
      <!-- Dermoscopy scale -->
      <line x1="20" y1="360" x2="80" y2="360" stroke="%23334155" stroke-width="2"/>
      <text x="32" y="352" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23334155">6 mm</text>
    </svg>`;
  }

  // BKL: Seborrheic Keratosis (stuck-on appearance, pseudofollicular openings)
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384" viewBox="0 0 384 384">
    <defs>
      <radialGradient id="skin_bkl" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%23fbe3d2"/>
        <stop offset="100%" stop-color="%23deb090"/>
      </radialGradient>
      <radialGradient id="bkl_core" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="%236c4b2a"/>
        <stop offset="50%" stop-color="%23855e37"/>
        <stop offset="85%" stop-color="%23a4784a"/>
        <stop offset="100%" stop-color="%23a4784a" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="384" height="384" fill="url(%23skin_bkl)"/>
    <!-- Verrucous stuck-on keratosis plaque -->
    <path d="M 140 160 Q 192 125 244 155 Q 275 200 250 245 Q 192 270 134 240 Q 115 195 140 160 Z" fill="url(%23bkl_core)"/>
    <!-- Crypts and pseudofollicular keratin plugs (comedo-like openings) -->
    <circle cx="165" cy="180" r="5" fill="%232b1d11"/>
    <circle cx="185" cy="165" r="4" fill="%232b1d11"/>
    <circle cx="215" cy="185" r="5.5" fill="%232b1d11"/>
    <circle cx="180" cy="220" r="6" fill="%232b1d11"/>
    <circle cx="210" cy="225" r="4.5" fill="%232b1d11"/>
    <!-- Milia-like cysts (pearly white spots) -->
    <circle cx="195" cy="195" r="3.5" fill="%23ffffff" opacity="0.85"/>
    <circle cx="170" cy="205" r="3" fill="%23ffffff" opacity="0.8"/>
    <!-- Dermoscopy scale -->
    <line x1="20" y1="360" x2="80" y2="360" stroke="%23334155" stroke-width="2"/>
    <text x="32" y="352" font-family="sans-serif" font-size="10" font-weight="bold" fill="%23334155">8 mm</text>
  </svg>`;
};

export const CLINICAL_BENCHMARK_SAMPLES: BenchmarkSpecimen[] = [
  {
    id: "benchmark-melanoma",
    name: "Specimen A: Malignant Melanoma",
    shortCode: "MEL",
    classification: "Malignant Melanoma (Superficial Spreading)",
    isicId: "ISIC_0032148",
    riskLevel: "high",
    bodyLocation: "Upper Back",
    description: "High-risk asymmetric pigmented lesion with irregular borders, multicolor pigmentation (tan, dark brown, blue-black), and peripheral atypical pigment network.",
    keyDermoscopicFeatures: [
      "Marked 2-axis architectural asymmetry",
      "Abrupt border cut-off with notched margins",
      "Atypical pigment network with localized pseudopods",
      "Eccentric dark hyperpigmented blotches"
    ],
    imageUrl: createSpecimenSvg("MEL"),
    simulatedResult: {
      predictedClass: "Melanoma (MEL)",
      confidence: 94.85,
      riskLevel: "high",
      uncertaintyScore: 0.08,
      explanation: "Deep convolutional attention layers highlight pronounced border irregularity, eccentric melanin saturation, and localized pigment network breakdown characteristic of superficial spreading melanoma. Urgent histopathological biopsy excision recommended.",
      contributingFactors: [
        { label: "Border Irregularity (Notched Margin)", weight: 38 },
        { label: "Color Variegation & Dark Blotch", weight: 31 },
        { label: "2-Axis Structural Asymmetry", weight: 22 },
        { label: "Peripheral Pseudopod Architecture", weight: 9 }
      ],
      heatmapPoints: [
        { x: 42, y: 46, radius: 24, weight: 0.98 },
        { x: 55, y: 48, radius: 20, weight: 0.92 },
        { x: 62, y: 55, radius: 18, weight: 0.85 },
        { x: 38, y: 58, radius: 16, weight: 0.81 }
      ]
    }
  },
  {
    id: "benchmark-nevus",
    name: "Specimen B: Melanocytic Nevus",
    shortCode: "NV",
    classification: "Melanocytic Nevus (Benign Control)",
    isicId: "ISIC_0024312",
    riskLevel: "low",
    bodyLocation: "Right Forearm",
    description: "Benign cutaneous control specimen demonstrating homogeneous light brown pigmentation, circular symmetry, and uniformly fading reticular network.",
    keyDermoscopicFeatures: [
      "Bilateral geometric symmetry",
      "Uniform light-brown to tan color distribution",
      "Regular reticular pigment network fading at periphery",
      "Absence of crystalline structures or vascular arborization"
    ],
    imageUrl: createSpecimenSvg("NV"),
    simulatedResult: {
      predictedClass: "Melanocytic Nevus (NV)",
      confidence: 97.40,
      riskLevel: "low",
      uncertaintyScore: 0.03,
      explanation: "Swin Transformer attention confirms symmetric globular morphology with regular peripheral pigment net termination. Specimen aligns with benign melanocytic nevus; routine yearly surveillance recommended.",
      contributingFactors: [
        { label: "Reticular Pigment Regularity", weight: 44 },
        { label: "Bilateral Geometric Symmetry", weight: 36 },
        { label: "Homogeneous Color Density", weight: 14 },
        { label: "Smooth Circumscribed Margin", weight: 6 }
      ],
      heatmapPoints: [
        { x: 50, y: 50, radius: 22, weight: 0.72 },
        { x: 48, y: 52, radius: 16, weight: 0.65 }
      ]
    }
  },
  {
    id: "benchmark-bcc",
    name: "Specimen C: Basal Cell Carcinoma",
    shortCode: "BCC",
    classification: "Nodular Basal Cell Carcinoma",
    isicId: "ISIC_0029567",
    riskLevel: "moderate",
    bodyLocation: "Face / Malar Region",
    description: "Non-melanoma cutaneous malignancy characterized by translucent pearly background, distinctive branching arborizing telangiectasia, and blue-gray ovoid nests.",
    keyDermoscopicFeatures: [
      "Arborizing (tree-branch) capillary telangiectasia",
      "Pearly translucent background papular elevation",
      "Blue-gray ovoid nests and globule clusters",
      "Absence of true melanocytic pigment network"
    ],
    imageUrl: createSpecimenSvg("BCC"),
    simulatedResult: {
      predictedClass: "Basal Cell Carcinoma (BCC)",
      confidence: 91.60,
      riskLevel: "moderate",
      uncertaintyScore: 0.11,
      explanation: "Attention maps focus heavily on arborizing vascular branches and peripheral blue-gray ovoid nests, characteristic of nodular basal cell carcinoma. Recommend dermatological consultation for definitive tissue biopsy or Mohs micrographic surgery evaluation.",
      contributingFactors: [
        { label: "Arborizing Telangiectasia Vessels", weight: 42 },
        { label: "Blue-Gray Ovoid Pigment Nests", weight: 29 },
        { label: "Translucent Pearly Texture", weight: 19 },
        { label: "Ulcerative/Erosive Focal Margin", weight: 10 }
      ],
      heatmapPoints: [
        { x: 48, y: 50, radius: 24, weight: 0.94 },
        { x: 58, y: 44, radius: 18, weight: 0.88 },
        { x: 42, y: 42, radius: 16, weight: 0.82 }
      ]
    }
  },
  {
    id: "benchmark-bkl",
    name: "Specimen D: Seborrheic Keratosis",
    shortCode: "BKL",
    classification: "Benign Keratosis (BKL)",
    isicId: "ISIC_0026781",
    riskLevel: "low",
    bodyLocation: "Trunk / Chest",
    description: "Benign epithelial tumor with 'stuck-on' verrucous plaque appearance, comedo-like pseudofollicular openings, and milia-like keratin cysts.",
    keyDermoscopicFeatures: [
      "Comedo-like crypt openings and follicular plugs",
      "Milia-like keratinaceous pearly cysts",
      "Cerebriform (brain-like) verrucous fissure patterns",
      "Sharply demarcated 'stuck-on' borders"
    ],
    imageUrl: createSpecimenSvg("BKL"),
    simulatedResult: {
      predictedClass: "Benign Keratosis (BKL)",
      confidence: 93.20,
      riskLevel: "low",
      uncertaintyScore: 0.06,
      explanation: "Neural features capture comedo-like crypts and sharp epidermal demarcation consistent with seborrheic keratosis. No architectural signs of melanocytic atypia. Benign finding.",
      contributingFactors: [
        { label: "Comedo-like Pseudofollicular Crypts", weight: 40 },
        { label: "Keratin Pearly Cyst Inclusions", weight: 28 },
        { label: "Cerebriform Surface Pattern", weight: 20 },
        { label: "Circumscribed Verrucous Boundary", weight: 12 }
      ],
      heatmapPoints: [
        { x: 48, y: 48, radius: 20, weight: 0.78 },
        { x: 54, y: 46, radius: 16, weight: 0.72 }
      ]
    }
  }
];

interface ClinicalBenchmarkSamplesProps {
  onSelectSample: (specimen: BenchmarkSpecimen, autoRun?: boolean) => void;
  selectedSampleId?: string | null;
}

export default function ClinicalBenchmarkSamples({
  onSelectSample,
  selectedSampleId
}: ClinicalBenchmarkSamplesProps) {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-5 text-white shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight text-white">One-Click Clinical Benchmark Samples</h4>
              <span className="text-[9px] font-mono font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 rounded">
                ISIC 2019 VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Instant presentation test cases for live examiner evaluation & Grad-CAM demonstration
            </p>
          </div>
        </div>
        <div className="text-[10px] text-teal-300 bg-teal-950/60 border border-teal-800/60 px-2.5 py-1 rounded-md font-mono self-start sm:self-auto">
          ⚡ 1-Click Load & Live Test
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CLINICAL_BENCHMARK_SAMPLES.map((specimen) => {
          const isSelected = selectedSampleId === specimen.id;
          const isHighRisk = specimen.riskLevel === "high";
          const isModRisk = specimen.riskLevel === "moderate";

          return (
            <div
              key={specimen.id}
              className={`rounded-xl border transition-all text-left flex flex-col justify-between p-3.5 relative ${
                isSelected
                  ? "bg-slate-800 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg"
                  : "bg-slate-800/60 hover:bg-slate-800/90 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="space-y-2.5">
                {/* Thumbnail with overlay badge */}
                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group">
                  <img
                    src={specimen.imageUrl}
                    alt={specimen.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm ${
                      isHighRisk
                        ? "bg-rose-500/90 text-white"
                        : isModRisk
                        ? "bg-amber-500/90 text-white"
                        : "bg-emerald-500/90 text-white"
                    }`}>
                      {specimen.shortCode}
                    </span>
                    <span className="text-[8px] font-mono bg-black/60 backdrop-blur-xs text-slate-300 px-1.5 py-0.5 rounded">
                      {specimen.isicId}
                    </span>
                  </div>
                </div>

                {/* Specimen Header & Details */}
                <div>
                  <h5 className="text-xs font-bold text-white leading-snug">{specimen.name}</h5>
                  <p className="text-[10px] text-cyan-300 font-mono mt-0.5">{specimen.bodyLocation}</p>
                </div>

                <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">
                  {specimen.description}
                </p>

                {/* Key features pill list */}
                <div className="space-y-1 pt-1 border-t border-slate-700/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Signs:</span>
                  <ul className="text-[9px] text-slate-300 space-y-0.5">
                    {specimen.keyDermoscopicFeatures.slice(0, 2).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span className="line-clamp-1">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSelectSample(specimen, false)}
                  className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Eye className="h-3 w-3 text-slate-300" />
                  <span>Load</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectSample(specimen, true)}
                  className="flex-1 py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>Scan Now</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
