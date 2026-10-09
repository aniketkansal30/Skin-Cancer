import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sliders, Eye, Layers, Sparkles } from "lucide-react";
import { HeatmapPoint } from "../types";

interface GradCamComparisonSliderProps {
  imageUrl: string;
  heatmapPoints?: HeatmapPoint[];
  heatmapImage?: string | null;
  className?: string;
  initialSliderPos?: number; // 0 to 100
}

export default function GradCamComparisonSlider({
  imageUrl,
  heatmapPoints = [],
  heatmapImage = null,
  className = "",
  initialSliderPos = 50,
}: GradCamComparisonSliderProps) {
  const [sliderPos, setSliderPos] = useState(initialSliderPos); // percentage: 0 to 100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "blend">("split");
  const [blendOpacity, setBlendOpacity] = useState(0.7);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  // Draw Grad-CAM heatmap on hidden/overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (heatmapPoints.length === 0) return;

    heatmapPoints.forEach((point) => {
      const px = (point.x / 100) * dimensions.width;
      const py = (point.y / 100) * dimensions.height;
      const maxRadius = (point.radius / 100) * Math.max(dimensions.width, dimensions.height);

      ctx.save();
      const intensity = Math.min(1, 0.4 + (point.weight ?? 0.7) * 0.6);
      ctx.globalAlpha = intensity;

      const gradient = ctx.createRadialGradient(px, py, 1, px, py, maxRadius);
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.95)");      // Core red
      gradient.addColorStop(0.25, "rgba(249, 115, 22, 0.85)");  // Orange
      gradient.addColorStop(0.55, "rgba(234, 179, 8, 0.7)");    // Amber
      gradient.addColorStop(0.8, "rgba(16, 185, 129, 0.3)");    // Teal/emerald edge
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");      // Transparent

      ctx.beginPath();
      ctx.arc(px, py, maxRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Dashed guidance circle
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, maxRadius * 0.45, 0, 2 * Math.PI);
      ctx.stroke();

      // Core focus dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    });
  }, [dimensions, heatmapPoints]);

  // Dragging logic
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleTouchStart = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Control Bar: Mode Toggle & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 p-2.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "split"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Interactive Split Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("blend")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "blend"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Opacity Blend Mode</span>
          </button>
        </div>

        {viewMode === "split" ? (
          <div className="text-[10px] text-slate-500 font-medium hidden sm:flex items-center gap-1">
            <span>↔</span>
            <span>Drag slider divider to compare attention boundary</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="text-[10px] uppercase font-bold text-slate-400">Heatmap Alpha:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={blendOpacity}
              onChange={(e) => setBlendOpacity(parseFloat(e.target.value))}
              className="accent-cyan-600 h-1.5 w-24 rounded cursor-pointer"
            />
            <span className="font-mono text-[11px] font-bold text-slate-700 w-8">
              {Math.round(blendOpacity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square max-h-[460px] rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 select-none shadow-md"
        onMouseDown={(e) => {
          if (viewMode === "split") {
            handleMove(e.clientX);
            setIsDragging(true);
          }
        }}
        onTouchStart={(e) => {
          if (viewMode === "split" && e.touches[0]) {
            handleMove(e.touches[0].clientX);
            setIsDragging(true);
          }
        }}
      >
        {/* Layer 1: Raw Clinical Dermoscopy Specimen */}
        <img
          src={imageUrl}
          alt="Raw dermoscopy specimen"
          onLoad={() => {
            setImageLoaded(true);
            updateDimensions();
          }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Layer 2: Grad-CAM Overlay (Rendered via Split Clip Path or Opacity Blend) */}
        {viewMode === "split" ? (
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none transition-none"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            {/* Same raw image as backdrop */}
            <img
              src={imageUrl}
              alt="Backdrop for heatmap"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Heatmap overlay image or canvas */}
            {heatmapImage ? (
              <img
                src={heatmapImage}
                alt="Grad-CAM activation overlay"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.85 }}
              />
            ) : (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.85 }}
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 pointer-events-none transition-opacity duration-300">
            {heatmapImage ? (
              <img
                src={heatmapImage}
                alt="Grad-CAM activation overlay"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: blendOpacity }}
              />
            ) : (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: blendOpacity }}
              />
            )}
          </div>
        )}

        {/* Split Divider & Draggable Handle (Only in Split Mode) */}
        {viewMode === "split" && (
          <>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] cursor-ew-resize z-20 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-ew-resize flex items-center justify-center p-1"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="h-9 w-9 rounded-full bg-white text-slate-900 border-2 border-cyan-500 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform">
                <span className="text-xs font-black tracking-tighter">↔</span>
              </div>
            </div>
          </>
        )}

        {/* HUD Badges */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono font-bold uppercase shadow-sm">
            {viewMode === "split" ? "Raw Dermoscopy (Left)" : "Dermoscopy Specimen"}
          </div>
        </div>

        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="px-2.5 py-1 rounded-md bg-cyan-950/85 backdrop-blur-md border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold uppercase shadow-sm flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
            <span>SwinV2 Grad-CAM (Right)</span>
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="absolute bottom-3 inset-x-3 z-10 pointer-events-none flex justify-between items-center text-[9px] text-white/90">
          <span className="bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 font-mono">
            384×384 PyTorch Tensor
          </span>
          <span className="bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 font-mono">
            Layer: SwinStage4_Norm
          </span>
        </div>
      </div>
    </div>
  );
}
