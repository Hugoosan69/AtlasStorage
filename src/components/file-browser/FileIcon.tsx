import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Link2,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { extensionOf, FOLDER_MIME } from "@/lib/file-types";

interface Style {
  icon: LucideIcon;
  color: string;
  label?: string;
}

const CODE = new Set(["js", "ts", "tsx", "jsx", "json", "xml", "html", "css", "sql", "py", "sh", "yml", "yaml", "java", "c", "cpp", "cs", "go", "rs", "php", "rb"]);
const ARCHIVE = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]);

function styleFor(mimeType: string, name: string): Style {
  const ext = extensionOf(name);
  const label = ext ? ext.toUpperCase().slice(0, 4) : undefined;

  if (mimeType === "application/vnd.google-apps.shortcut") return { icon: Link2, color: "#64748b" };
  if (mimeType === "application/pdf" || ext === "pdf") return { icon: FileText, color: "#e5484d", label: "PDF" };
  if (mimeType === "application/vnd.google-apps.document" || /word|opendocument\.text|rtf/.test(mimeType) || ["doc", "docx", "odt", "rtf"].includes(ext)) {
    return { icon: FileText, color: "#2f6feb", label: label || "DOC" };
  }
  if (mimeType === "application/vnd.google-apps.spreadsheet" || /spreadsheet|excel|csv/.test(mimeType) || ["xls", "xlsx", "ods", "csv"].includes(ext)) {
    return { icon: FileSpreadsheet, color: "#1e9e5a", label: label || "XLS" };
  }
  if (mimeType === "application/vnd.google-apps.presentation" || /presentation|powerpoint/.test(mimeType) || ["ppt", "pptx", "odp"].includes(ext)) {
    return { icon: Presentation, color: "#e8742a", label: label || "PPT" };
  }
  if (mimeType.startsWith("image/") || mimeType === "application/vnd.google-apps.drawing") return { icon: FileImage, color: "#c026d3", label };
  if (mimeType.startsWith("video/")) return { icon: FileVideo, color: "#7c3aed", label };
  if (mimeType.startsWith("audio/")) return { icon: FileAudio, color: "#0891b2", label };
  if (ARCHIVE.has(ext) || /zip|compressed|archive|x-tar|x-7z|x-rar/.test(mimeType)) return { icon: FileArchive, color: "#b7791f", label };
  if (CODE.has(ext)) return { icon: FileCode, color: "#475569", label };
  if (mimeType.startsWith("text/")) return { icon: FileText, color: "#64748b", label: label || "TXT" };
  return { icon: File, color: "#8b95a7", label };
}

export function FolderGlyph({ size = 20, open = false }: { size?: number; open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0" aria-hidden>
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h5.2c.4 0 .78.16 1.06.44L12 6.2h8a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18z" fill="var(--folder-back)" />
      <path
        d={open ? "M3.6 9.5A1.5 1.5 0 0 1 5.05 8.4H21.6a1 1 0 0 1 .96 1.28l-2.3 8.7A1.5 1.5 0 0 1 18.8 19.5H4a1.5 1.5 0 0 1-1.45-1.9z" : "M2.5 9A1.5 1.5 0 0 1 4 7.5h16A1.5 1.5 0 0 1 21.5 9v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18z"}
        fill="var(--folder-front)"
      />
    </svg>
  );
}

function DocGlyph({ size, color, label }: { size: number; color: string; label?: string }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 32 40" className="shrink-0" aria-hidden>
      <path d="M5 1h16.6L31 10.4V35a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V5a4 4 0 0 1 4-4z" fill="var(--doc-paper)" stroke="var(--doc-edge)" strokeWidth="1" />
      <path d="M21.5 1v6a3.5 3.5 0 0 0 3.5 3.5h6" fill="var(--doc-fold)" stroke="var(--doc-edge)" strokeWidth="1" />
      {label ? (
        <>
          <rect x="4" y="22" width={Math.max(16, label.length * 5.4 + 6)} height="11" rx="2.5" fill={color} />
          <text x={4 + Math.max(16, label.length * 5.4 + 6) / 2} y="30.1" fontSize="7.4" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="system-ui, sans-serif" letterSpacing=".2">
            {label}
          </text>
        </>
      ) : (
        <rect x="6" y="24" width="20" height="3" rx="1.5" fill={color} opacity=".7" />
      )}
    </svg>
  );
}

export function FileIcon({ mimeType, name = "", size = 20 }: { mimeType: string; name?: string; size?: number }) {
  if (mimeType === FOLDER_MIME) return <FolderGlyph size={size} />;
  const { icon: Icon, color, label } = styleFor(mimeType, name);
  if (size >= 40) return <DocGlyph size={size} color={color} label={label} />;
  return <Icon size={size} strokeWidth={1.7} style={{ color }} className="shrink-0" />;
}
