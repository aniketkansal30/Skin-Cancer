// Base URL for API requests.
// When deploying Frontend on Vercel:
// Add environment variable in Vercel Project Settings:
//   VITE_API_URL = https://your-backend.onrender.com
// If empty, falls back to relative `/api/*` (for local development or same-host deployment).
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}
