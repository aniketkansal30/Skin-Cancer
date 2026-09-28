import React, { useRef, useEffect, useState } from "react";
import { HeatmapPoint } from "../types";

interface GradCamCanvasProps {
  imageUrl: string;
  heatmapPoints: HeatmapPoint[];
  showHeatmap: boolean;
  opacity?: number; // 0 to 1
  className?: string;
}

export default function GradCamCanvas({
  imageUrl,
  heatmapPoints,
  showHeatmap,
  opacity = 0.65,
  className = "",
}: GradCamCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // New image -> reset state (also handles images that were already cached/complete)
  useEffect(() => {
    setImageLoaded(false);
    setDimensions({ width: 0, height: 0 });
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setImageLoaded(true);
  }, [imageUrl]);

  // Keep canvas size in sync with the rendered image
  useEffect(() => {
    if (!imageLoaded) return;

    const img = imgRef.current;
    const update = () => {
      if (img) setDimensions({ width: img.clientWidth, height: img.clientHeight });
    };
    update();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [imageLoaded, imageUrl]);

  // Draw heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Setting width/height also clears the canvas
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    if (!showHeatmap || heatmapPoints.length === 0) return;

    heatmapPoints.forEach((point) => {
      const px = (point.x / 100) * dimensions.width;
      const py = (point.y / 100) * dimensions.height;
      const maxRadius = (point.radius / 100) * Math.max(dimensions.width, dimensions.height);

      // save/restore per point: previously the dashed-ring alpha (opacity * 0.4) leaked into
      // the next point, so every heat spot after the first was drawn too faint.
      ctx.save();

      // Stronger model weight -> stronger glow
      const intensity = Math.min(1, 0.4 + (point.weight ?? 0.7) * 0.6);
      ctx.globalAlpha = opacity * intensity;

      const gradient = ctx.createRadialGradient(px, py, 1, px, py, maxRadius);
      gradient.addColorStop(0, "rgba(239, 68, 68, 1)");       // core red
      gradient.addColorStop(0.2, "rgba(239, 68, 68, 0.95)");
      gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.8)");  // amber
      gradient.addColorStop(0.8, "rgba(16, 185, 129, 0.35)"); // emerald
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");    // transparent edge

      ctx.beginPath();
      ctx.arc(px, py, maxRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // dashed alignment ring
      ctx.globalAlpha = opacity * 0.4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, maxRadius * 0.4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // core dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    });
  }, [dimensions, heatmapPoints, showHeatmap, imageLoaded, opacity]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 ${className}`}
      style={{ minHeight: "200px" }}
      id="gradcam-overlay-container"
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Dermoscopic skin lesion specimen"
        referrerPolicy="no-referrer"
        onLoad={() => setImageLoaded(true)}
        className="block h-auto w-full max-w-full object-cover transition-all duration-300"
        style={{ pointerEvents: "none" }}
      />

      {imageLoaded && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 pointer-events-none transition-opacity duration-300"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }}
        />
      )}

      {showHeatmap && imageLoaded && (
        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-sm text-slate-100 text-[10px] font-mono px-2 py-1 rounded border border-slate-700 flex items-center gap-1.5 shadow-md">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>Grad-CAM Activation HUD</span>
        </div>
      )}
    </div>
  );
}
