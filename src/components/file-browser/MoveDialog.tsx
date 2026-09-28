"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, HardDrive, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { getFolder } from "@/lib/drive-client";
import { FolderGlyph } from "./FileIcon";
import type { BreadcrumbItem, DriveItem } from "@/types";

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
    getFolder(folderId)
      .then((data) => {
        if (cancelled) return;
        const moving = new Set(itemKey.split(","));
        setFolders(data.files.filter((f) => f.isFolder && !moving.has(f.id)));
        setCrumbs(data.breadcrumb);
        setCanUpload(data.permissions.can_upload);
        if (!folderId) setFolderId(data.folder.id);
      })
      .catch(() => !cancelled && setFolders([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, folderId, itemKey]);

  const current = crumbs[crumbs.length - 1];
  const sameFolder = !pickMode && folderId === startFolderId;
  const blocked = !pickMode && !canUpload;
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  return (
    <Modal
      open={open}
      title={title ?? `Mover ${items.length === 1 ? `"${items[0].name}"` : `${items.length} itens`}`}
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <span className="mr-auto text-xs self-center truncate" style={{ color: "var(--text-3)" }}>
            {sameFolder ? "Os itens já estão aqui" : blocked && !loading ? "Sem permissão para adicionar aqui" : current ? `Destino: ${current.name}` : ""}
          </span>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={busy || loading || sameFolder || blocked || !current}
            onClick={async () => {
              setBusy(true);
              await onMove(folderId, current?.name || "");
              setBusy(false);
            }}
          >
            {busy ? "Aguarde..." : confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-1 mb-2 min-h-9">
        {parent ? (
          <button className="btn btn-ghost btn-icon h-8 w-8 shrink-0" onClick={() => setFolderId(parent.id)} aria-label="Voltar">
            <ChevronLeft size={18} />
          </button>
        ) : (
          <span className="w-8 h-8 flex items-center justify-center shrink-0" style={{ color: "var(--accent)" }}>
            <HardDrive size={17} />
          </span>
        )}
        <div className="flex items-center min-w-0 text-sm overflow-x-auto">
          {crumbs.map((c, i) => (
            <span key={c.id} className="flex items-center shrink-0">
              {i > 0 && <ChevronRight size={14} style={{ color: "var(--text-3)" }} />}
              <button
                className="px-1.5 py-1 rounded-md hover:bg-[var(--hover)] max-w-40 truncate"
                style={{ color: i === crumbs.length - 1 ? "var(--text)" : "var(--text-2)", fontWeight: i === crumbs.length - 1 ? 600 : 400 }}
                onClick={() => setFolderId(c.id)}
              >
                {c.name}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="picker-list h-72 overflow-y-auto rounded-xl">
        {loading && !folders.length ? (
          <div className="h-full flex items-center justify-center" style={{ color: "var(--text-3)" }}>
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : folders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-sm" style={{ color: "var(--text-3)" }}>
            <FolderGlyph size={36} />
            Nenhuma subpasta
          </div>
        ) : (
          folders.map((f) => (
            <button key={f.id} className="picker-row" onClick={() => setFolderId(f.id)}>
              <FolderGlyph size={20} />
              <span className="flex-1 truncate text-left">{f.name}</span>
              <ChevronRight size={16} style={{ color: "var(--text-3)" }} />
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
