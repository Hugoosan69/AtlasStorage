export const FOLDER_MIME = "application/vnd.google-apps.folder";

export type PreviewKind = "image" | "pdf" | "video" | "audio" | "text" | "none";

const GOOGLE_TYPES: Record<string, string> = {
  "application/vnd.google-apps.folder": "Pasta",
  "application/vnd.google-apps.document": "Documento Google",
  "application/vnd.google-apps.spreadsheet": "Planilha Google",
  "application/vnd.google-apps.presentation": "Apresentação Google",
  "application/vnd.google-apps.drawing": "Desenho Google",
  "application/vnd.google-apps.form": "Formulário Google",
  "application/vnd.google-apps.shortcut": "Atalho",
};

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "Documento PDF",
  doc: "Documento Word",
  docx: "Documento Word",
  odt: "Documento de texto",
  rtf: "Documento RTF",
  txt: "Texto",
  md: "Markdown",
  xls: "Planilha Excel",
  xlsx: "Planilha Excel",
  ods: "Planilha",
  csv: "Planilha CSV",
  ppt: "Apresentação PowerPoint",
  pptx: "Apresentação PowerPoint",
  odp: "Apresentação",
  zip: "Arquivo ZIP",
  rar: "Arquivo RAR",
  "7z": "Arquivo 7-Zip",
  tar: "Arquivo TAR",
  gz: "Arquivo GZip",
  dwg: "Desenho AutoCAD",
  dxf: "Desenho CAD",
  psd: "Photoshop",
  ai: "Illustrator",
  cdr: "CorelDRAW",
  json: "JSON",
  xml: "XML",
  html: "Página HTML",
  exe: "Aplicativo",
  msi: "Instalador",
};

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function describeType(mimeType: string, name: string): string {
  if (GOOGLE_TYPES[mimeType]) return GOOGLE_TYPES[mimeType];
  const ext = extensionOf(name);
  if (EXTENSION_TYPES[ext]) return EXTENSION_TYPES[ext];
  if (mimeType.startsWith("image/")) return `Imagem ${ext ? ext.toUpperCase() : ""}`.trim();
  if (mimeType.startsWith("video/")) return `Vídeo ${ext ? ext.toUpperCase() : ""}`.trim();
  if (mimeType.startsWith("audio/")) return `Áudio ${ext ? ext.toUpperCase() : ""}`.trim();
  if (mimeType.startsWith("text/")) return "Texto";
  return ext ? `Arquivo ${ext.toUpperCase()}` : "Arquivo";
}

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "csv", "json", "xml", "log", "yml", "yaml", "ini", "conf", "js", "ts", "tsx", "jsx",
  "css", "html", "sql", "py", "sh", "bat", "ps1", "java", "c", "cpp", "cs", "go", "rs", "php", "rb",
]);

export function previewKind(mimeType: string, name: string): PreviewKind {
  if (mimeType === FOLDER_MIME) return "none";
  if (/^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)$/.test(mimeType)) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/vnd.google-apps.document" ||
    mimeType === "application/vnd.google-apps.spreadsheet" ||
    mimeType === "application/vnd.google-apps.presentation" ||
    mimeType === "application/vnd.google-apps.drawing"
  ) {
    return "pdf";
  }
  if (/^video\/(mp4|webm|ogg|quicktime)$/.test(mimeType)) return "video";
  if (/^audio\//.test(mimeType)) return "audio";
  if (mimeType.startsWith("text/") || TEXT_EXTENSIONS.has(extensionOf(name))) return "text";
  return "none";
}

export function formatFileSize(bytes?: string | number): string {
  if (bytes === undefined || bytes === null || bytes === "") return "—";
  const size = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (!Number.isFinite(size)) return "—";
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

export function formatRelative(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const diff = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "agora";
  if (abs < 3600) return relative.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 7) return relative.format(Math.round(diff / 86400), "day");
  return formatDate(dateStr);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}
