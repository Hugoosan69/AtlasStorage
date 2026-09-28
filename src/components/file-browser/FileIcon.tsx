"use client";

import {
  Folder,
  Image,
  Video,
  Music,
  FileText,
  File,
  Archive,
  Table,
  Presentation,
} from "lucide-react";
import { getFileIcon } from "@/lib/utils";

export function FileIcon({
  mimeType,
  size = 20,
}: {
  mimeType: string;
  size?: number;
}) {
  const icon = getFileIcon(mimeType);
  const props = { size, strokeWidth: 1.5 };

  switch (icon) {
    case "folder":
      return <Folder {...props} style={{ color: "var(--warning)" }} />;
    case "image":
      return <Image {...props} style={{ color: "#8b5cf6" }} />;
    case "video":
      return <Video {...props} style={{ color: "#ef4444" }} />;
    case "audio":
      return <Music {...props} style={{ color: "#f97316" }} />;
    case "file-text":
      return <FileText {...props} style={{ color: "var(--accent)" }} />;
    case "sheet":
      return <Table {...props} style={{ color: "var(--success)" }} />;
    case "presentation":
      return <Presentation {...props} style={{ color: "#f97316" }} />;
    case "archive":
      return <Archive {...props} style={{ color: "var(--text-secondary)" }} />;
    default:
      return <File {...props} style={{ color: "var(--text-secondary)" }} />;
  }
}
