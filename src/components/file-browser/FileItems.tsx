"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Minus, MoreHorizontal } from "lucide-react";
import { FileIcon, FolderGlyph } from "./FileIcon";
import { formatDate, formatFileSize, previewKind } from "@/lib/file-types";
import type { MenuAnchor } from "@/components/ui/Menu";
import type { DriveItem } from "@/types";

export type SortKey = "name" | "modifiedTime" | "size";

export interface ItemHandlers {
  onPress: (item: DriveItem, e: React.MouseEvent) => void;
  onOpen: (item: DriveItem) => void;
  onNameClick: (item: DriveItem) => void;
  onCheck: (item: DriveItem, e: React.MouseEvent) => void;
  onLongPress: (item: DriveItem) => void;
  onMenu: (item: DriveItem, anchor: MenuAnchor) => void;
  onOpenLocation: (item: DriveItem) => void;
  canDrag: (item: DriveItem) => boolean;
  onDragStart: (item: DriveItem, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverItem: (item: DriveItem, e: React.DragEvent) => void;
  onDragLeaveItem: (item: DriveItem) => void;
  onDropOnItem: (item: DriveItem, e: React.DragEvent) => void;
}

export type GridSize = "sm" | "md" | "lg";

interface ViewProps extends ItemHandlers {
  items: DriveItem[];
  selected: Set<string>;
  cursorId: string | null;
  dropTargetId: string | null;
  draggingIds: Set<string>;
  showLocation: boolean;
  selectionMode: boolean;
  touch: boolean;
  gridSize?: GridSize;
}

export function Checkbox({
  checked,
  onClick,
  label,
  className = "",
}: {
  checked: boolean | "mixed";
  onClick: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`checkbox ${className}`}
      data-checked={checked !== false}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {checked === "mixed" ? <Minus size={12} strokeWidth={3} /> : checked ? <Check size={12} strokeWidth={3} /> : null}
    </button>
  );
}

function useItemEvents(item: DriveItem, props: ViewProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const folderDrop = item.isFolder && !props.draggingIds.has(item.id);

  const cancelPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return {
    "data-item-id": item.id,
    "data-selected": props.selected.has(item.id),
    "data-cursor": props.cursorId === item.id,
    "data-drop": props.dropTargetId === item.id,
    "data-dragging": props.draggingIds.has(item.id),
    draggable: props.canDrag(item),
    onClick: (e: React.MouseEvent) => {
      if (longPressed.current) {
        longPressed.current = false;
        return;
      }
      props.onPress(item, e);
    },
    onDoubleClick: () => props.onOpen(item),
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      cancelPress();
      props.onMenu(item, { x: e.clientX, y: e.clientY });
    },
    onTouchStart: () => {
      longPressed.current = false;
      cancelPress();
      timer.current = setTimeout(() => {
        longPressed.current = true;
        navigator.vibrate?.(15);
        props.onLongPress(item);
      }, 450);
    },
    onTouchMove: cancelPress,
    onTouchEnd: cancelPress,
    onDragStart: (e: React.DragEvent) => props.onDragStart(item, e),
    onDragEnd: props.onDragEnd,
    onDragOver: folderDrop ? (e: React.DragEvent) => props.onDragOverItem(item, e) : undefined,
    onDragLeave: folderDrop ? () => props.onDragLeaveItem(item) : undefined,
    onDrop: folderDrop ? (e: React.DragEvent) => props.onDropOnItem(item, e) : undefined,
  };
}

function MenuButton({ item, onMenu, className = "" }: { item: DriveItem; onMenu: ViewProps["onMenu"]; className?: string }) {
  return (
    <button
      className={`item-menu-btn ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onMenu(item, { rect: e.currentTarget.getBoundingClientRect(), align: "end" });
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={`Ações para ${item.name}`}
    >
      <MoreHorizontal size={17} />
    </button>
  );
}

function NameButton({ item, onOpen }: { item: DriveItem; onOpen: (item: DriveItem) => void }) {
  // Plain clicks open the item; modifier clicks fall through to the row to extend the selection.
  return (
    <button
      className="item-name truncate text-left"
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.stopPropagation();
        onOpen(item);
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      title={item.name}
      tabIndex={-1}
    >
      {item.name}
    </button>
  );
}

/* ---------------- List ---------------- */

function ListRow({ item, props }: { item: DriveItem; props: ViewProps }) {
  const events = useItemEvents(item, props);
  const checked = props.selected.has(item.id);
  const meta = [formatDate(item.modifiedTime), item.isFolder ? null : formatFileSize(item.size)].filter(Boolean).join(" · ");

  return (
    <div role="row" className={`file-row ${props.showLocation ? "with-location" : ""}`} {...events}>
      <div className="flex items-center justify-center">
        <Checkbox
          checked={checked}
          onClick={(e) => props.onCheck(item, e)}
          label={`Selecionar ${item.name}`}
          className={props.selectionMode ? "" : "reveal"}
        />
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <FileIcon mimeType={item.mimeType} name={item.name} size={22} />
        <div className="min-w-0 flex flex-col">
          <NameButton item={item} onOpen={props.onNameClick} />
          <span className="sm:hidden text-xs truncate" style={{ color: "var(--text-3)" }}>
            {props.showLocation && item.parentName ? `${item.parentName} · ` : ""}
            {meta}
          </span>
        </div>
      </div>
      {props.showLocation && (
        <div className="hidden sm:block min-w-0">
          <button
            className="cell-link truncate max-w-full"
            onClick={(e) => {
              e.stopPropagation();
              props.onOpenLocation(item);
            }}
            title={`Abrir ${item.parentName}`}
          >
            {item.parentName || "Atlas"}
          </button>
        </div>
      )}
      <div className="hidden sm:block cell-muted">{formatDate(item.modifiedTime)}</div>
      <div className="hidden sm:block cell-muted text-right tabular-nums">{item.isFolder ? "—" : formatFileSize(item.size)}</div>
      <div className="flex justify-end">
        <MenuButton item={item} onMenu={props.onMenu} />
      </div>
    </div>
  );
}

function SortButton({
  label,
  column,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; asc: boolean };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === column;
  return (
    <button className={`sort-btn ${className}`} data-active={active} onClick={() => onSort(column)}>
      {label}
      {active && (sort.asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  );
}

export function ListView(
  props: ViewProps & {
    sort: { key: SortKey; asc: boolean };
    onSort: (key: SortKey) => void;
    allChecked: boolean | "mixed";
    onToggleAll: () => void;
  }
) {
  return (
    <div role="grid" aria-label="Arquivos" aria-multiselectable className={`file-table ${props.touch && !props.selectionMode ? "hide-checks" : ""}`}>
      <div role="row" className={`file-row file-head ${props.showLocation ? "with-location" : ""}`}>
        <div className="flex items-center justify-center">
          <Checkbox
            checked={props.allChecked}
            onClick={props.onToggleAll}
            label="Selecionar todos"
            className={props.selectionMode ? "" : "reveal-head"}
          />
        </div>
        <SortButton label="Nome" column="name" sort={props.sort} onSort={props.onSort} />
        {props.showLocation && <span className="hidden sm:block">Local</span>}
        <SortButton label="Modificado" column="modifiedTime" sort={props.sort} onSort={props.onSort} className="hidden sm:flex" />
        <SortButton label="Tamanho" column="size" sort={props.sort} onSort={props.onSort} className="hidden sm:flex justify-end" />
        <span />
      </div>
      {props.items.map((item) => (
        <ListRow key={item.id} item={item} props={props} />
      ))}
    </div>
  );
}

/* ---------------- Grid ---------------- */

function GridThumb({ item }: { item: DriveItem }) {
  const kind = previewKind(item.mimeType, item.name);
  const thumbSrc = item.thumb ? `${item.thumb}&s=480` : null;
  const inlineSrc = kind === "image" ? `/api/drive/download?fileId=${encodeURIComponent(item.id)}&inline=1` : null;
  const initialSrc = thumbSrc || inlineSrc;
  const [src, setSrc] = useState(initialSrc);
  const [state, setState] = useState<"loading" | "ok" | "fail">(initialSrc ? "loading" : "fail");
  return (
    <div className="card-thumb">
      {state !== "fail" && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: state === "ok" ? 1 : 0 }}
          onLoad={() => setState("ok")}
          onError={() => {
            if (src === thumbSrc && inlineSrc) {
              setSrc(inlineSrc);
              setState("loading");
            } else {
              setState("fail");
            }
          }}
        />
      )}
      {state !== "ok" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <FileIcon mimeType={item.mimeType} name={item.name} size={56} />
        </div>
      )}
    </div>
  );
}

function FolderTile({ item, props }: { item: DriveItem; props: ViewProps }) {
  const events = useItemEvents(item, props);
  return (
    <div className="folder-tile group" {...events}>
      <Checkbox
        checked={props.selected.has(item.id)}
        onClick={(e) => props.onCheck(item, e)}
        label={`Selecionar ${item.name}`}
        className={`tile-check ${props.selectionMode ? "" : "reveal"}`}
      />
      <FolderGlyph size={26} />
      <div className="min-w-0 flex-1">
        <NameButton item={item} onOpen={props.onNameClick} />
        {props.showLocation && item.parentName && (
          <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>em {item.parentName}</div>
        )}
      </div>
      <MenuButton item={item} onMenu={props.onMenu} className="-mr-1" />
    </div>
  );
}

function FileCard({ item, props }: { item: DriveItem; props: ViewProps }) {
  const events = useItemEvents(item, props);
  return (
    <div className="file-card group" {...events}>
      <GridThumb item={item} />
      <Checkbox
        checked={props.selected.has(item.id)}
        onClick={(e) => props.onCheck(item, e)}
        label={`Selecionar ${item.name}`}
        className={`card-check ${props.selectionMode ? "" : "reveal"}`}
      />
      <MenuButton item={item} onMenu={props.onMenu} className="card-menu" />
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-3 min-w-0">
        <FileIcon mimeType={item.mimeType} name={item.name} size={16} />
        <div className="min-w-0 flex-1">
          <NameButton item={item} onOpen={props.onNameClick} />
          <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>
            {props.showLocation && item.parentName ? `em ${item.parentName}` : `${formatFileSize(item.size)} · ${formatDate(item.modifiedTime)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

const GRID_COLS: Record<GridSize, string> = {
  sm: "grid-cols-[repeat(auto-fill,minmax(120px,1fr))]",
  md: "grid-cols-[repeat(auto-fill,minmax(160px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]",
  lg: "grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
};

const FOLDER_COLS: Record<GridSize, string> = {
  sm: "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]",
  md: "grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  lg: "grid-cols-[repeat(auto-fill,minmax(250px,1fr))]",
};

export function GridView(props: ViewProps) {
  const folders = props.items.filter((i) => i.isFolder);
  const files = props.items.filter((i) => !i.isFolder);
  const sz = props.gridSize ?? "md";
  return (
    <div className={`space-y-6 ${props.touch && !props.selectionMode ? "hide-checks" : ""}`}>
      {folders.length > 0 && (
        <section>
          <h2 className="section-label">Pastas</h2>
          <div className={`grid gap-2.5 ${FOLDER_COLS[sz]}`}>
            {folders.map((item) => (
              <FolderTile key={item.id} item={item} props={props} />
            ))}
          </div>
        </section>
      )}
      {files.length > 0 && (
        <section>
          <h2 className="section-label">Arquivos</h2>
          <div className={`grid gap-3 ${GRID_COLS[sz]}`}>
            {files.map((item) => (
              <FileCard key={item.id} item={item} props={props} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function LoadingSkeleton({ view, gridSize = "md" }: { view: "list" | "grid"; gridSize?: GridSize }) {
  if (view === "grid") {
    return (
      <div className={`grid gap-3 ${GRID_COLS[gridSize]}`}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="file-card !cursor-default">
            <div className="card-thumb skeleton" />
            <div className="px-3 py-3 space-y-2">
              <div className="skeleton h-3 rounded w-3/4" />
              <div className="skeleton h-2.5 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="file-table">
      <div className="file-row file-head" />
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="file-row !cursor-default">
          <span />
          <div className="flex items-center gap-3">
            <div className="skeleton w-5 h-5 rounded" />
            <div className="skeleton h-3 rounded" style={{ width: `${40 + ((i * 37) % 40)}%` }} />
          </div>
          <div className="hidden sm:block skeleton h-3 rounded w-20" />
          <div className="hidden sm:block skeleton h-3 rounded w-12 ml-auto" />
          <span />
        </div>
      ))}
    </div>
  );
}
