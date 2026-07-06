import React, { useState } from "react";

// -----------------------------------------------------------------------
// BodyMapSelector
// A simple clickable human-silhouette SVG that lets a patient tag WHERE
// on their body a mole/lesion is located. Emits a location string like
// "Left Forearm" or "Upper Back" via onSelect.
//
// USAGE (inside PatientDashboard "new_scan" step, before/after image upload):
//
//   import BodyMapSelector from "./BodyMapSelector";
//   const [bodyLocation, setBodyLocation] = useState<string>("");
//   <BodyMapSelector value={bodyLocation} onSelect={setBodyLocation} />
//
// Then include `bodyLocation` in the Supabase insert for the `scans` table
// (add a `body_location text` column — see the SQL migration file).
// -----------------------------------------------------------------------

interface BodyRegion {
  id: string;
  label: string;
  // Simple rect/circle hitboxes on a 200x400 viewBox silhouette
  cx: number;
  cy: number;
  r: number;
}

const FRONT_REGIONS: BodyRegion[] = [
  { id: "head", label: "Face / Scalp", cx: 100, cy: 30, r: 18 },
  { id: "neck", label: "Neck", cx: 100, cy: 55, r: 10 },
  { id: "chest", label: "Chest", cx: 100, cy: 90, r: 22 },
  { id: "l_shoulder", label: "Left Shoulder", cx: 65, cy: 70, r: 12 },
  { id: "r_shoulder", label: "Right Shoulder", cx: 135, cy: 70, r: 12 },
  { id: "l_arm", label: "Left Upper Arm", cx: 55, cy: 110, r: 12 },
  { id: "r_arm", label: "Right Upper Arm", cx: 145, cy: 110, r: 12 },
  { id: "l_forearm", label: "Left Forearm", cx: 48, cy: 155, r: 11 },
  { id: "r_forearm", label: "Right Forearm", cx: 152, cy: 155, r: 11 },
  { id: "l_hand", label: "Left Hand", cx: 42, cy: 195, r: 10 },
  { id: "r_hand", label: "Right Hand", cx: 158, cy: 195, r: 10 },
  { id: "abdomen", label: "Abdomen", cx: 100, cy: 130, r: 20 },
  { id: "l_thigh", label: "Left Thigh", cx: 85, cy: 220, r: 14 },
  { id: "r_thigh", label: "Right Thigh", cx: 115, cy: 220, r: 14 },
  { id: "l_shin", label: "Left Lower Leg", cx: 85, cy: 290, r: 12 },
  { id: "r_shin", label: "Right Lower Leg", cx: 115, cy: 290, r: 12 },
  { id: "l_foot", label: "Left Foot", cx: 85, cy: 350, r: 10 },
  { id: "r_foot", label: "Right Foot", cx: 115, cy: 350, r: 10 },
];

const BACK_REGIONS: BodyRegion[] = [
  { id: "scalp_back", label: "Back of Head", cx: 100, cy: 30, r: 18 },
  { id: "upper_back", label: "Upper Back", cx: 100, cy: 90, r: 24 },
  { id: "lower_back", label: "Lower Back", cx: 100, cy: 135, r: 20 },
  { id: "l_arm_back", label: "Left Upper Arm (Back)", cx: 55, cy: 110, r: 12 },
  { id: "r_arm_back", label: "Right Upper Arm (Back)", cx: 145, cy: 110, r: 12 },
  { id: "glutes", label: "Glutes", cx: 100, cy: 175, r: 18 },
  { id: "l_thigh_back", label: "Left Thigh (Back)", cx: 85, cy: 220, r: 14 },
  { id: "r_thigh_back", label: "Right Thigh (Back)", cx: 115, cy: 220, r: 14 },
  { id: "l_calf", label: "Left Calf", cx: 85, cy: 290, r: 12 },
  { id: "r_calf", label: "Right Calf", cx: 115, cy: 290, r: 12 },
];

interface BodyMapSelectorProps {
  value?: string;
  onSelect: (label: string) => void;
}

export default function BodyMapSelector({ value, onSelect }: BodyMapSelectorProps) {
  const [view, setView] = useState<"front" | "back">("front");
  const [hovered, setHovered] = useState<string | null>(null);
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">
          Step: Tag Lesion Body Location
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
          {/* Simple silhouette outline */}
          <ellipse cx="100" cy="30" rx="18" ry="20" fill="#e2e8f0" />
          <rect x="80" y="48" width="40" height="20" rx="8" fill="#e2e8f0" />
          <path
            d="M 55 65 Q 100 55 145 65 L 150 160 Q 100 175 50 160 Z"
            fill="#e2e8f0"
          />
          {/* arms */}
          <rect x="35" y="70" width="20" height="130" rx="10" fill="#e2e8f0" />
          <rect x="145" y="70" width="20" height="130" rx="10" fill="#e2e8f0" />
          {/* legs */}
          <rect x="72" y="160" width="26" height="200" rx="12" fill="#e2e8f0" />
          <rect x="102" y="160" width="26" height="200" rx="12" fill="#e2e8f0" />

          {/* Clickable region hotspots */}
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

      <div className="text-center">
        {value ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full">
            📍 {value}
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">
            Tap a region above to mark where the mole is located
          </span>
        )}
      </div>
    </div>
  );
}