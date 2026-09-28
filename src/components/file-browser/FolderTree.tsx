"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, HardDrive, Loader2 } from "lucide-react";
import {
  DRAG_TYPE,
  MOVE_EVENT,
  getFolder,
  getRootId,
  navigateToFolder,
  onFoldersChanged,
  readDraggedIds,
  type MoveEventDetail,
} from "@/lib/drive-client";
import { FileIcon } from "./FileIcon";
import { FOLDER_MIME } from "@/lib/file-types";
import type { BreadcrumbItem } from "@/types";

type Children = Record<string, BreadcrumbItem[] | "loading" | "error">;

export function FolderTree({ onNavigate }: { onNavigate?: () => void }) {
  const current = useSearchParams().get("f") || "";
  const [root, setRoot] = useState<BreadcrumbItem | null>(null);
  const [children, setChildren] = useState<Children>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const load = useCallback(async (id: string, fresh = false) => {
    setChildren((c) => (Array.isArray(c[id]) ? c : { ...c, [id]: "loading" }));
    try {
      const listing = await getFolder(id === getRootId() ? "" : id, { fresh });
      const folders = listing.files.filter((f) => f.isFolder).map((f) => ({ id: f.id, name: f.name }));
      setChildren((c) => ({ ...c, [id]: folders }));
      return listing;
    } catch {
      setChildren((c) => ({ ...c, [id]: "error" }));
      return null;
    }
  }, []);

  useEffect(() => {
    getFolder("")
      .then((listing) => {
        setRoot(listing.breadcrumb[0]);
        setExpanded((e) => new Set(e).add(listing.folder.id));
        setChildren((c) => ({
          ...c,
          [listing.folder.id]: listing.files.filter((f) => f.isFolder).map((f) => ({ id: f.id, name: f.name })),
        }));
      })
      .catch(() => setRoot(null));
  }, []);

  // Reveal the current folder: expand every ancestor.
  useEffect(() => {
    if (!current) return;
    getFolder(current)
      .then((listing) => {
        const ancestors = listing.breadcrumb.slice(0, -1).map((b) => b.id);
        setChildren((c) => ({
          ...c,
          [listing.folder.id]: listing.files.filter((f) => f.isFolder).map((f) => ({ id: f.id, name: f.name })),
        }));
        setExpanded((e) => {
          const next = new Set(e);
          ancestors.forEach((id) => next.add(id));
          return next;
        });
        ancestors.forEach((id) => load(id));
      })
      .catch(() => {});
  }, [current, load]);

  useEffect(
    () =>
      onFoldersChanged((ids) => {
        const targets = ids ?? Object.keys(children);
        targets.filter((id) => expanded.has(id)).forEach((id) => load(id, true));
      }),
    [children, expanded, load]
  );

  function toggle(id: string) {
    const opening = !expanded.has(id);
    setExpanded((e) => {
      const next = new Set(e);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    if (opening) load(id);
  }

  if (!root) return null;

  const activeId = current || root.id;

  function renderNode(node: BreadcrumbItem, depth: number): React.ReactNode {
    const open = expanded.has(node.id);
    const kids = children[node.id];
    const isRoot = depth === 0;
    const empty = Array.isArray(kids) && kids.length === 0;

    return (
      <li key={node.id}>
        <div
          className="tree-row"
          data-active={node.id === activeId}
          data-drop={dropTarget === node.id}
          style={{ paddingLeft: 6 + depth * 14 }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTarget(node.id);
          }}
          onDragLeave={() => setDropTarget((t) => (t === node.id ? null : t))}
          onDrop={(e) => {
            setDropTarget(null);
            const ids = readDraggedIds(e);
            if (!ids) return;
            e.preventDefault();
            window.dispatchEvent(
              new CustomEvent<MoveEventDetail>(MOVE_EVENT, { detail: { ids, targetId: node.id } })
            );
          }}
        >
          <button
            className="tree-chevron"
            style={{ visibility: empty ? "hidden" : "visible" }}
            onClick={() => toggle(node.id)}
            aria-label={open ? "Recolher" : "Expandir"}
            tabIndex={-1}
          >
            {open && kids === "loading" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : undefined, transition: "transform .15s" }} />
            )}
          </button>
          <button
            className="flex-1 min-w-0 flex items-center gap-2 h-full text-left"
            onClick={() => {
              navigateToFolder(node.id);
              if (!open) toggle(node.id);
              onNavigate?.();
            }}
            title={node.name}
          >
            {isRoot ? (
              <HardDrive size={16} className="shrink-0" style={{ color: "var(--accent)" }} />
            ) : (
              <FileIcon mimeType={FOLDER_MIME} size={16} />
            )}
            <span className="truncate">{node.name}</span>
          </button>
        </div>
        {open && Array.isArray(kids) && kids.length > 0 && (
          <ul>{kids.map((child) => renderNode(child, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <nav aria-label="Pastas" className="text-[13px]">
      <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
        Pastas
      </div>
      <ul>{renderNode(root, 0)}</ul>
    </nav>
  );
}
