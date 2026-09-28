import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return "—";
  const size = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(size)) return "—";
  if (size === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getFileIcon(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "file-text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "sheet";
  if (mimeType.includes("document") || mimeType.includes("word"))
    return "file-text";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "presentation";
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return "archive";
  return "file";
}
