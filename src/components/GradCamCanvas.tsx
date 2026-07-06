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

  // Update canvas size on container resize or image load
  useEffect(() => {
    if (!imgRef.current || !imageLoaded) return;

    const updateSize = () => {
      const img = imgRef.current;
      if (img) {
        setDimensions({
          width: img.clientWidth,
          height: img.clientHeight,
        });
      }
    };

    updateSize();

    // Resize observer
    if (containerRef.current) {
      const observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [imageLoaded, imageUrl]);

  // Draw Heatmap on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous drawing
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (!showHeatmap || heatmapPoints.length === 0) return;

    // Set canvas dimensions to match the rendered image
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Set global transparency
    ctx.globalAlpha = opacity;

    // Draw each heatmap point
    heatmapPoints.forEach((point) => {
      // Calculate coordinates in pixels
      const px = (point.x / 100) * dimensions.width;
      const py = (point.y / 100) * dimensions.height;
      const maxRadius = (point.radius / 100) * Math.max(dimensions.width, dimensions.height);

      // Create radial gradient for a heat signature glow
      const gradient = ctx.createRadialGradient(px, py, 1, px, py, maxRadius);
      
      // Clinical Red-Yellow-Blue-Alpha Heat Map gradient
      // High intensity centers are red, fading into yellow, then transparent teal/blue
      gradient.addColorStop(0, "rgba(239, 68, 68, 1)");      // Core Red
      gradient.addColorStop(0.2, "rgba(239, 68, 68, 0.95)");
      gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.8)");  // Mid Yellow-Amber
      gradient.addColorStop(0.8, "rgba(16, 185, 129, 0.35)"); // Outer Emerald-Teal
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");    // Transparent Blue-Teal edge

      ctx.beginPath();
      ctx.arc(px, py, maxRadius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw subtle dashed alignment circle around focal center
      ctx.globalAlpha = opacity * 0.4;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, maxRadius * 0.4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Small core target crosshair dot
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [dimensions, heatmapPoints, showHeatmap, imageLoaded, opacity]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 ${className}`}
      style={{ minHeight: "200px" }}
      id="gradcam-overlay-container"
    >
      {/* Source Lesion Image */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Dermscopic skin lesion specimen"
        referrerPolicy="no-referrer"
        onLoad={() => setImageLoaded(true)}
        className="block h-auto w-full max-w-full object-cover transition-all duration-300"
        style={{ pointerEvents: "none" }}
      />

      {/* Grad-CAM Heatmap overlay canvas */}
      {imageLoaded && (
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 h-full w-full pointer-events-none transition-opacity duration-300"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }}
        />
      )}

      {/* Calibration HUD Indicator in corner */}
      {showHeatmap && imageLoaded && (
        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-sm text-slate-100 text-[10px] font-mono px-2 py-1 rounded border border-slate-700 flex items-center gap-1.5 shadow-md">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>Grad-CAM Activation HUD</span>
        </div>
      )}
    </div>
  );
}
