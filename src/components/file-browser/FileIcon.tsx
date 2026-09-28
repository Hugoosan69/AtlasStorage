import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Presentation,
  File,
} from "lucide-react";

const TYPES: Array<{ test: (m: string) => boolean; icon: typeof File; color: string }> = [
  { test: (m) => m === "application/vnd.google-apps.folder", icon: Folder, color: "#f5b82e" },
  { test: (m) => m.startsWith("image/"), icon: FileImage, color: "#ec4899" },
  { test: (m) => m.startsWith("video/"), icon: FileVideo, color: "#8b5cf6" },
  { test: (m) => m.startsWith("audio/"), icon: FileAudio, color: "#06b6d4" },
  { test: (m) => m.includes("pdf"), icon: FileText, color: "#ef4444" },
  { test: (m) => m.includes("spreadsheet") || m.includes("excel") || m.includes("csv"), icon: FileSpreadsheet, color: "#16a34a" },
  { test: (m) => m.includes("presentation") || m.includes("powerpoint"), icon: Presentation, color: "#f97316" },
  { test: (m) => m.includes("document") || m.includes("word") || m.startsWith("text/"), icon: FileText, color: "#3b82f6" },
  { test: (m) => m.includes("zip") || m.includes("rar") || m.includes("7z") || m.includes("tar") || m.includes("archive"), icon: FileArchive, color: "#a16207" },
  { test: (m) => m.includes("json") || m.includes("javascript") || m.includes("xml") || m.includes("html"), icon: FileCode, color: "#64748b" },
];

export function FileIcon({ mimeType, size = 20 }: { mimeType: string; size?: number }) {
  const match = TYPES.find((t) => t.test(mimeType));
  const Icon = match?.icon ?? File;
  const color = match?.color ?? "#94a3b8";
  const isFolder = mimeType === "application/vnd.google-apps.folder";
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      style={{ color }}
      fill={isFolder ? color : "none"}
      fillOpacity={isFolder ? 0.25 : 0}
      className="shrink-0"
    />
  );
}
