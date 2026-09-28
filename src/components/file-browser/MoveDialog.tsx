"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FileIcon } from "./FileIcon";
import type { BreadcrumbItem, DriveItem } from "@/types";

const FOLDER = "application/vnd.google-apps.folder";

export function MoveDialog({
  open,
  items,
  startFolderId,
  onClose,
  onMove,
  title,
  confirmText = "Mover para cá",
  pickMode = false,
}: {
  open: boolean;
  items: DriveItem[];
  startFolderId: string;
  onClose: () => void;
  onMove: (targetId: string, targetName: string) => Promise<void>;
  title?: string;
  confirmText?: string;
  pickMode?: boolean;
}) {
  const [folderId, setFolderId] = useState(startFolderId);
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const itemKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (open) setFolderId(startFolderId);
  }, [open, startFolderId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/drive/list${folderId ? `?folderId=${encodeURIComponent(folderId)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data.error) return;
        if (!folderId) setFolderId(data.breadcrumb[data.breadcrumb.length - 1]?.id || "");
        const movingIds = new Set(itemKey.split(","));
        setFolders(data.files.filter((f: DriveItem) => f.isFolder && !movingIds.has(f.id)));
        setCrumbs(data.breadcrumb);
        setCanUpload(data.permissions.can_upload);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, folderId, itemKey]);

  const sameFolder = !pickMode && folderId === startFolderId;
  const blocked = !pickMode && !canUpload;

  return (
    <Modal
      open={open}
      title={title ?? `Mover ${items.length === 1 ? `"${items[0].name}"` : `${items.length} itens`}`}
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={busy || loading || sameFolder || blocked}
            onClick={async () => {
              setBusy(true);
              await onMove(folderId, crumbs[crumbs.length - 1]?.name || "");
              setBusy(false);
            }}
          >
            {busy ? "Aguarde..." : confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-center flex-wrap gap-0.5 text-sm mb-3" style={{ color: "var(--text-2)" }}>
        {crumbs.map((c, i) => (
          <span key={c.id} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight size={14} />}
            <button
              className="px-1.5 py-0.5 rounded hover:underline"
              style={{ color: i === crumbs.length - 1 ? "var(--text)" : undefined }}
              onClick={() => setFolderId(c.id)}
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>
      <div className="rounded-lg overflow-y-auto h-72" style={{ border: "1px solid var(--border)" }}>
        {loading ? (
          <div className="h-full flex items-center justify-center" style={{ color: "var(--text-3)" }}>
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : folders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--text-3)" }}>
            Nenhuma subpasta
          </div>
        ) : (
          folders.map((f) => (
            <button
              key={f.id}
              className="w-full flex items-center gap-3 px-3 h-10 text-sm text-left hover:bg-[var(--hover)]"
              onClick={() => setFolderId(f.id)}
            >
              <FileIcon mimeType={FOLDER} size={18} />
              <span className="flex-1 truncate">{f.name}</span>
              <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
            </button>
          ))
        )}
      </div>
      {!loading && blocked && !sameFolder && (
        <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>
          Você não tem permissão para enviar itens para esta pasta.
        </p>
      )}
    </Modal>
  );
}
