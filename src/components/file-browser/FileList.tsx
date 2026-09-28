"use client";

import { useState } from "react";
import {
  Download,
  Pencil,
  Trash2,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { FileIcon } from "./FileIcon";
import { formatFileSize, formatDate } from "@/lib/utils";
import type { DriveItem, UserPermissions } from "@/types";

export function FileList({
  files,
  permissions,
  loading,
  onOpenFolder,
  onDownload,
  onRename,
  onDelete,
}: {
  files: DriveItem[];
  permissions: UserPermissions;
  loading: boolean;
  onOpenFolder: (folderId: string) => void;
  onDownload: (fileId: string, fileName: string) => void;
  onRename: (fileId: string, currentName: string, isFolder: boolean) => void;
  onDelete: (fileId: string, name: string, isFolder: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--accent)" }}
        />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p
          className="text-lg font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Pasta vazia
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Nenhum arquivo ou pasta encontrado
        </p>
      </div>
    );
  }

  const folders = files.filter((f) => f.isFolder);
  const regularFiles = files.filter((f) => !f.isFolder);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th
              className="text-left py-2 px-3 font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Nome
            </th>
            <th
              className="text-left py-2 px-3 font-medium hidden sm:table-cell"
              style={{ color: "var(--text-secondary)" }}
            >
              Tamanho
            </th>
            <th
              className="text-left py-2 px-3 font-medium hidden md:table-cell"
              style={{ color: "var(--text-secondary)" }}
            >
              Modificado
            </th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {[...folders, ...regularFiles].map((file) => (
            <tr
              key={file.id}
              className="group transition-colors cursor-pointer"
              style={{ borderBottom: "1px solid var(--border)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
              onClick={() => {
                if (file.isFolder) onOpenFolder(file.id);
              }}
              onDoubleClick={() => {
                if (!file.isFolder && permissions.can_download) {
                  onDownload(file.id, file.name);
                }
              }}
            >
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-3">
                  <FileIcon mimeType={file.mimeType} />
                  <span
                    className="truncate max-w-xs sm:max-w-md"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {file.name}
                  </span>
                </div>
              </td>
              <td
                className="py-2.5 px-3 hidden sm:table-cell"
                style={{ color: "var(--text-secondary)" }}
              >
                {file.isFolder ? "—" : formatFileSize(file.size)}
              </td>
              <td
                className="py-2.5 px-3 hidden md:table-cell"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatDate(file.modifiedTime)}
              </td>
              <td className="py-2.5 px-3 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === file.id ? null : file.id);
                  }}
                  className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {menuOpen === file.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(null)}
                    />
                    <div
                      className="absolute right-0 top-full z-20 min-w-[160px] rounded-lg py-1 shadow-lg"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {!file.isFolder && permissions.can_download && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(file.id, file.name);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Download size={14} />
                          Download
                        </button>
                      )}
                      {((file.isFolder && permissions.can_rename_folders) ||
                        (!file.isFolder && permissions.can_rename_files)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRename(file.id, file.name, file.isFolder);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                          style={{ color: "var(--text-primary)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Pencil size={14} />
                          Renomear
                        </button>
                      )}
                      {((file.isFolder && permissions.can_delete_folders) ||
                        (!file.isFolder && permissions.can_delete_files)) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(file.id, file.name, file.isFolder);
                            setMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                          style={{ color: "var(--danger)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <Trash2 size={14} />
                          Excluir
                        </button>
                      )}
                    </div>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
