import React, { useState } from "react";

// -----------------------------------------------------------------------
// BodyMapSelector
// Clickable body silhouette so a patient can tag WHERE a mole/lesion is.
// Emits a label like "Left Forearm" or "Upper Back" via onSelect.
//
// FIX: Left/Right now follow ANATOMICAL convention (the patient's own left/right).
//   - Front view: the viewer's left side of the picture is the patient's RIGHT.
//   - Back view:  the viewer's left side of the picture is the patient's LEFT.
// Previously the labels were mirrored (wrong side would reach the doctor).
// The back view also now has shoulders, forearms, hands, neck and feet.
// -----------------------------------------------------------------------

interface BodyRegion {
  id: string;
  label: string;
  cx: number;
  cy: number;
  r: number;
}

interface RegionSpec {
  key: string;
  name: string;
  cy: number;
  r: number;
  dx?: number; // if set -> a left/right pair placed at 100 -/+ dx
}

const FRONT_SPECS: RegionSpec[] = [
  { key: "head", name: "Face / Scalp", cy: 30, r: 18 },
  { key: "neck", name: "Neck", cy: 55, r: 10 },
  { key: "chest", name: "Chest", cy: 90, r: 22 },
  { key: "abdomen", name: "Abdomen", cy: 130, r: 20 },
  { key: "shoulder", name: "Shoulder", cy: 70, r: 12, dx: 35 },
  { key: "arm", name: "Upper Arm", cy: 110, r: 12, dx: 45 },
  { key: "forearm", name: "Forearm", cy: 155, r: 11, dx: 52 },
  { key: "hand", name: "Hand", cy: 195, r: 10, dx: 58 },
  { key: "thigh", name: "Thigh", cy: 220, r: 14, dx: 15 },
  { key: "shin", name: "Lower Leg", cy: 290, r: 12, dx: 15 },
  { key: "foot", name: "Foot", cy: 350, r: 10, dx: 15 },
];

const BACK_SPECS: RegionSpec[] = [
  { key: "scalp_back", name: "Back of Head", cy: 30, r: 18 },
  { key: "neck_back", name: "Back of Neck", cy: 55, r: 10 },
  { key: "upper_back", name: "Upper Back", cy: 90, r: 22 },
  { key: "lower_back", name: "Lower Back", cy: 135, r: 20 },
  { key: "glutes", name: "Glutes", cy: 175, r: 18 },
  { key: "shoulder_back", name: "Shoulder (Back)", cy: 70, r: 12, dx: 35 },
  { key: "arm_back", name: "Upper Arm (Back)", cy: 110, r: 12, dx: 45 },
  { key: "forearm_back", name: "Forearm (Back)", cy: 155, r: 11, dx: 52 },
  { key: "hand_back", name: "Hand (Back)", cy: 195, r: 10, dx: 58 },
  { key: "thigh_back", name: "Thigh (Back)", cy: 220, r: 14, dx: 15 },
  { key: "calf", name: "Calf", cy: 290, r: 12, dx: 15 },
  { key: "foot_back", name: "Foot (Heel / Sole)", cy: 350, r: 10, dx: 15 },
];

function buildRegions(view: "front" | "back"): BodyRegion[] {
  const specs = view === "front" ? FRONT_SPECS : BACK_SPECS;
  const regions: BodyRegion[] = [];

  specs.forEach((s) => {
    if (!s.dx) {
      regions.push({ id: `${view}-${s.key}`, label: s.name, cx: 100, cy: s.cy, r: s.r });
      return;
    }
    (["viewerLeft", "viewerRight"] as const).forEach((pos) => {
      const cx = pos === "viewerLeft" ? 100 - s.dx! : 100 + s.dx!;
      const patientSide =
        view === "front"
          ? pos === "viewerLeft" ? "Right" : "Left"
          : pos === "viewerLeft" ? "Left" : "Right";
      regions.push({
        id: `${view}-${s.key}-${pos}`,
        label: `${patientSide} ${s.name}`,
        cx,
        cy: s.cy,
        r: s.r,
      });
    });
  });

  return regions;
}

const FRONT_REGIONS = buildRegions("front");
const BACK_REGIONS = buildRegions("back");

interface BodyMapSelectorProps {
  value?: string;
  onSelect: (label: string) => void;
}

export default function BodyMapSelector({ value, onSelect }: BodyMapSelectorProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const [hovered, setHovered] = useState<string | null>(null);
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const hoveredLabel = regions.find((r) => r.id === hovered)?.label;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">
          Tag Lesion Body Location
        </span>
        <div className="flex bg-slate-100 rounded-lg p-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setView("front")}
            className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
              view === "front" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setView("back")}
            className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
              view === "back" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
            }`}
          >
            Back
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <svg viewBox="0 0 200 400" className="h-72 w-auto">
          {/* Silhouette */}
          <ellipse cx="100" cy="30" rx="18" ry="20" fill="#e2e8f0" />
          <rect x="80" y="48" width="40" height="20" rx="8" fill="#e2e8f0" />
          <path d="M 55 65 Q 100 55 145 65 L 150 160 Q 100 175 50 160 Z" fill="#e2e8f0" />
          <rect x="35" y="70" width="20" height="130" rx="10" fill="#e2e8f0" />
          <rect x="145" y="70" width="20" height="130" rx="10" fill="#e2e8f0" />
          <rect x="72" y="160" width="26" height="200" rx="12" fill="#e2e8f0" />
          <rect x="102" y="160" width="26" height="200" rx="12" fill="#e2e8f0" />

          {/* Clickable hotspots */}
          {regions.map((region) => {
            const isSelected = value === region.label;
            const isHovered = hovered === region.id;
            return (
              <circle
                key={region.id}
                cx={region.cx}
                cy={region.cy}
                r={region.r}
                fill={isSelected ? "#0d9488" : isHovered ? "#5eead4" : "transparent"}
                stroke={isSelected ? "#0d9488" : "#06b6d4"}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isSelected ? "0" : "3,2"}
                opacity={isSelected ? 0.85 : isHovered ? 0.5 : 0.35}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(region.label)}
              >
                <title>{region.label}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="text-center space-y-1">
        {value ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full">
            📍 {value}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">
            {hoveredLabel || "Tap a region above to mark where the mole is located"}
          </span>
        )}
        <p className="text-[10px] text-slate-400">Left / Right refer to your own body.</p>
      </div>
    </div>
  );
}
