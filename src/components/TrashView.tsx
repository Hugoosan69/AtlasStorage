"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { FileIcon } from "@/components/file-browser/FileIcon";
import { api, folderHref, invalidateFolders } from "@/lib/drive-client";
import { formatFileSize, formatRelative, formatDateTime } from "@/lib/file-types";
import type { DriveItem } from "@/types";

type TrashItem = DriveItem & { trashedTime?: string };

export function TrashView() {
  const toast = useToast();
  const [items, setItems] = useState<TrashItem[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setItems(null);
    api<{ files: TrashItem[] }>("/api/drive/trash")
      .then((d) => setItems(d.files ?? []))
      .catch((e) => {
        toast(e.message, "error");
        setItems([]);
      });
  }, [toast]);
  useEffect(load, [load]);

  async function restore(item: TrashItem) {
    setBusy((b) => new Set(b).add(item.id));
    try {
      await api("/api/drive/restore", { method: "POST", json: { fileId: item.id } });
      setItems((all) => all?.filter((i) => i.id !== item.id) ?? null);
      invalidateFolders(item.parentId ? [item.parentId] : undefined);
      toast(`"${item.name}" restaurado em ${item.parentName || "Atlas"}`, "success", {
        action: item.parentId ? { label: "Abrir pasta", onClick: () => (window.location.href = folderHref(item.parentId!)) } : undefined,
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    } finally {
      setBusy((b) => {
        const next = new Set(b);
        next.delete(item.id);
        return next;
      });
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lixeira</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
              Itens excluídos das pastas em que você pode excluir. O Google Drive apaga definitivamente após 30 dias.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon shrink-0" onClick={load} title="Atualizar" aria-label="Atualizar">
            <RefreshCw size={16} />
          </button>
        </div>

        {!items ? (
          <div className="flex justify-center py-16" style={{ color: "var(--text-3)" }}>
            <Loader2 className="animate-spin" size={22} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-icon"><Trash2 size={26} strokeWidth={1.6} /></div>
            <p className="font-semibold text-[15px]">A lixeira está vazia</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Nada foi excluído recentemente.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <FileIcon mimeType={item.mimeType} name={item.name} size={22} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" title={item.name}>{item.name}</div>
                  <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                    em {item.parentName || "Atlas"}
                    {!item.isFolder && item.size ? ` · ${formatFileSize(item.size)}` : ""}
                    {item.trashedTime && (
                      <span title={formatDateTime(item.trashedTime)}> · excluído {formatRelative(item.trashedTime)}</span>
                    )}
                  </div>
                </div>
                <button className="btn shrink-0" disabled={busy.has(item.id)} onClick={() => restore(item)}>
                  {busy.has(item.id) ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  <span className="hidden sm:inline">Restaurar</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
