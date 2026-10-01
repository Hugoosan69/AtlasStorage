"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Download,
  Eye,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  FolderUp,
  HardDrive,
  Info,
  Keyboard,
  LayoutGrid,
  Link2,
  List,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useToast, useToastControls } from "@/components/ui/Toast";
import { ConfirmModal, Modal, PromptModal } from "@/components/ui/Modal";
import { Menu, type MenuAnchor, type MenuEntry } from "@/components/ui/Menu";
import {
  api,
  ApiError,
  DRAG_TYPE,
  MOVE_EVENT,
  folderHref,
  getFolder,
  invalidateFolders,
  navigateToFolder,
  onFoldersChanged,
  peekFolder,
  readDraggedIds,
  type MoveEventDetail,
} from "@/lib/drive-client";
import { formatFileSize } from "@/lib/file-types";
import { Breadcrumbs } from "./Breadcrumbs";
import { DetailsPanel } from "./DetailsPanel";
import { GridView, ListView, LoadingSkeleton, type SortKey } from "./FileItems";
import { MoveDialog } from "./MoveDialog";
import { PreviewModal } from "./PreviewModal";
import { UploadPanel } from "./UploadPanel";
import { entriesFromDataTransfer, entriesFromFileList, useUploader } from "./useUploader";
import type { AppUser, DriveItem, FolderListing, UserPermissions } from "@/types";

const NO_PERMS: UserPermissions = {
  can_view: false,
  can_download: false,
  can_upload: false,
  can_create_folder: false,
  can_rename_files: false,
  can_rename_folders: false,
  can_move_files: false,
  can_move_folders: false,
  can_delete_files: false,
  can_delete_folders: false,
};

type Dialog =
  | { kind: "none" }
  | { kind: "newFolder" }
  | { kind: "rename"; item: DriveItem }
  | { kind: "delete"; items: DriveItem[] }
  | { kind: "move"; items: DriveItem[] }
  | { kind: "shortcuts" };

type Sort = { key: SortKey; asc: boolean };

function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    [key]
  );
  return [value, update] as const;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function FileBrowser({ user }: { user: AppUser }) {
  const toast = useToast();
  const { dismiss } = useToastControls();
  const params = useSearchParams();
  const folderParam = params.get("f") || "";
  const openParam = params.get("open");

  const [listing, setListing] = useState<FolderListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const listingRef = useRef<FolderListing | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DriveItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [view, setView] = usePersistentState<"list" | "grid">("atlas:view", "list");
  const [gridSize, setGridSize] = usePersistentState<"sm" | "md" | "lg">("atlas:gridSize", "md");
  const [sort, setSort] = usePersistentState<Sort>("atlas:sort", { key: "name", asc: true });
  const [showDetails, setShowDetails] = usePersistentState<boolean>("atlas:details", false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [cursorId, setCursorId] = useState<string | null>(null);

  const [menu, setMenu] = useState<{ entries: MenuEntry[]; anchor: MenuAnchor; title?: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [preview, setPreview] = useState<{ items: DriveItem[]; index: number } | null>(null);

  const [dragging, setDragging] = useState<Set<string>>(new Set());
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [fileDrag, setFileDrag] = useState(false);
  const dragDepth = useRef(0);
  const pendingSelect = useRef<string | null>(null);
  const handledOpen = useRef<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const coarse = useMediaQuery("(pointer: coarse)");

  const wide = useMediaQuery("(min-width: 1024px)");
  const matchesParam = !!listing && (folderParam ? listing.folder.id === folderParam : listing.breadcrumb.length === 1);
  const ready = matchesParam && !error;
  const folderId = listing?.folder.id ?? "";
  const breadcrumb = useMemo(() => listing?.breadcrumb ?? [], [listing]);
  const perms = ready ? listing!.permissions : NO_PERMS;
  const searching = results !== null || searchLoading;
  const canUploadHere = !searching && perms.can_upload && !!folderId;

  /* ---------- data loading ---------- */

  useEffect(() => {
    listingRef.current = listing;
  }, [listing]);

  useEffect(() => {
    let cancelled = false;
    const current = listingRef.current;
    const sameFolder = !!current && (folderParam ? current.folder.id === folderParam : current.breadcrumb.length === 1);
    const cached = peekFolder(folderParam);

    if (cached) {
      setListing(cached);
      setError(null);
      setLoading(false);
    } else if (!sameFolder) {
      setLoading(true);
    }

    getFolder(folderParam, { fresh: !!cached })
      .then((data) => {
        if (cancelled) return;
        setListing(data);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setListing(null);
        setError({ status: e instanceof ApiError ? e.status : 500, message: e instanceof Error ? e.message : "Erro" });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [folderParam, reloadTick]);

  useEffect(() => {
    setSelected(new Set());
    setAnchorId(null);
    setCursorId(null);
    setQuery("");
    setResults(null);
    setPreview(null);
  }, [folderParam]);

  useEffect(
    () =>
      onFoldersChanged((ids) => {
        const current = listingRef.current?.folder.id;
        if (!ids || (current && ids.includes(current))) setReloadTick((t) => t + 1);
      }),
    []
  );

  useEffect(() => {
    document.title = listing ? `${listing.folder.name} · Atlas` : "Atlas";
  }, [listing]);

  // Search with debounce; ignore stale responses.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api<{ files: DriveItem[] }>(`/api/drive/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((data) => {
          setResults(data.files);
          setSelected(new Set());
          setCursorId(null);
        })
        .catch((e) => {
          if (e.name !== "AbortError") toast(e.message, "error");
        })
        .finally(() => !controller.signal.aborted && setSearchLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, toast, reloadTick]);

  const items = useMemo(() => {
    const base = results ?? listing?.files ?? [];
    const dir = sort.asc ? 1 : -1;
    return [...base].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      if (sort.key === "size") return (Number(a.size || 0) - Number(b.size || 0)) * dir;
      if (sort.key === "modifiedTime") return (a.modifiedTime || "").localeCompare(b.modifiedTime || "") * dir;
      return a.name.localeCompare(b.name, "pt-BR", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [results, listing, sort]);

  const selectedItems = useMemo(() => items.filter((i) => selected.has(i.id)), [items, selected]);

  // Drop selection entries that disappeared after a refresh; apply post-create selection.
  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    setSelected((s) => {
      const kept = [...s].filter((id) => ids.has(id));
      return kept.length === s.size ? s : new Set(kept);
    });
    if (pendingSelect.current && ids.has(pendingSelect.current)) {
      const id = pendingSelect.current;
      pendingSelect.current = null;
      setSelected(new Set([id]));
      setAnchorId(id);
      setCursorId(id);
    }
  }, [items]);

  useEffect(() => {
    if (!cursorId) return;
    document.querySelector(`[data-item-id="${CSS.escape(cursorId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursorId]);

  /* ---------- permissions ---------- */

  const can = useMemo(
    () => ({
      download: (i: DriveItem) => !i.isFolder && (searching || perms.can_download),
      rename: (i: DriveItem) => !searching && (i.isFolder ? perms.can_rename_folders : perms.can_rename_files),
      move: (i: DriveItem) => !searching && (i.isFolder ? perms.can_move_folders : perms.can_move_files),
      del: (i: DriveItem) => !searching && (i.isFolder ? perms.can_delete_folders : perms.can_delete_files),
    }),
    [perms, searching]
  );

  /* ---------- navigation & opening ---------- */

  const navigate = useCallback((id: string) => {
    setQuery("");
    setResults(null);
    navigateToFolder(id);
  }, []);

  const openPreview = useCallback(
    (item: DriveItem) => {
      const files = items.filter((i) => !i.isFolder);
      const index = files.findIndex((f) => f.id === item.id);
      if (index >= 0) setPreview({ items: files, index });
    },
    [items]
  );

  const open = useCallback(
    (item: DriveItem) => (item.isFolder ? navigate(item.id) : openPreview(item)),
    [navigate, openPreview]
  );

  // Deep link: /?f=folder&open=file opens the file preview once the folder loads.
  useEffect(() => {
    if (!openParam || !listing || handledOpen.current === openParam) return;
    handledOpen.current = openParam;
    const item = listing.files.find((f) => f.id === openParam);
    if (item) openPreview(item);
    const rest = new URLSearchParams(window.location.search);
    rest.delete("open");
    window.history.replaceState(null, "", rest.size ? `/?${rest}` : "/");
  }, [openParam, listing, openPreview]);

  async function download(targets: DriveItem[]) {
    const files = targets.filter((i) => !i.isFolder);
    for (let n = 0; n < files.length; n++) {
      const item = files[n];
      try {
        await api(`/api/drive/download?fileId=${encodeURIComponent(item.id)}&check=1`);
      } catch (e) {
        toast(`${item.name}: ${e instanceof Error ? e.message : "Erro"}`, "error");
        continue;
      }
      const a = document.createElement("a");
      a.href = `/api/drive/download?fileId=${encodeURIComponent(item.id)}`;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (n < files.length - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }

  async function copyLink(item: DriveItem) {
    const parent = item.parentId || folderId;
    const url = item.isFolder
      ? `${location.origin}${folderHref(item.id)}`
      : `${location.origin}/?${new URLSearchParams({ f: parent, open: item.id })}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado. Quem tiver acesso ao Atlas e à pasta poderá abrir.", "success");
    } catch {
      toast("Não foi possível copiar o link", "error");
    }
  }

  /* ---------- selection ---------- */

  const selectOnly = useCallback((id: string) => {
    setSelected(new Set([id]));
    setAnchorId(id);
    setCursorId(id);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAnchorId(id);
    setCursorId(id);
  }, []);

  const selectRange = useCallback(
    (toId: string) => {
      const ids = items.map((i) => i.id);
      const from = ids.indexOf(anchorId ?? toId);
      const to = ids.indexOf(toId);
      if (from === -1 || to === -1) return selectOnly(toId);
      const [lo, hi] = from < to ? [from, to] : [to, from];
      setSelected(new Set(ids.slice(lo, hi + 1)));
      setCursorId(toId);
    },
    [items, anchorId, selectOnly]
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setAnchorId(null);
  }, []);

  const allChecked: boolean | "mixed" =
    items.length > 0 && selected.size === items.length ? true : selected.size > 0 ? "mixed" : false;

  /* ---------- mutations ---------- */

  async function createFolder(name: string) {
    try {
      const folder = await api<DriveItem>("/api/drive/folder", { method: "POST", json: { parentId: folderId, name } });
      pendingSelect.current = folder.id;
      setDialog({ kind: "none" });
      toast(`Pasta "${name}" criada`, "success");
      invalidateFolders([folderId]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  async function rename(item: DriveItem, newName: string) {
    if (newName === item.name) return setDialog({ kind: "none" });
    try {
      await api("/api/drive/rename", { method: "PATCH", json: { fileId: item.id, newName } });
      setDialog({ kind: "none" });
      setListing((l) => l && { ...l, files: l.files.map((f) => (f.id === item.id ? { ...f, name: newName } : f)) });
      toast("Nome alterado", "success");
      invalidateFolders([folderId, ...(item.isFolder ? [item.id] : [])]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  async function restore(targets: DriveItem[], parents: string[]) {
    let ok = 0;
    for (const item of targets) {
      try {
        await api("/api/drive/restore", { method: "POST", json: { fileId: item.id } });
        ok++;
      } catch (e) {
        toast(`${item.name}: ${e instanceof Error ? e.message : "Erro"}`, "error");
      }
    }
    if (ok) toast(ok === 1 ? `"${targets[0].name}" restaurado` : `${ok} itens restaurados`, "success");
    invalidateFolders(parents);
  }

  async function remove(targets: DriveItem[]) {
    setDialog({ kind: "none" });
    const ids = new Set(targets.map((t) => t.id));
    const parents = [...new Set(targets.map((t) => t.parentId || folderId))];
    setListing((l) => l && { ...l, files: l.files.filter((f) => !ids.has(f.id)) });
    setResults((r) => r && r.filter((f) => !ids.has(f.id)));
    clearSelection();

    const deleted: DriveItem[] = [];
    for (const item of targets) {
      try {
        await api(`/api/drive/delete?fileId=${encodeURIComponent(item.id)}`, { method: "DELETE" });
        deleted.push(item);
      } catch (e) {
        toast(`${item.name}: ${e instanceof Error ? e.message : "Erro"}`, "error");
      }
    }
    invalidateFolders([...parents, ...deleted.filter((d) => d.isFolder).map((d) => d.id)]);
    if (!deleted.length) return;
    toast(
      deleted.length === 1 ? `"${deleted[0].name}" foi para a lixeira` : `${deleted.length} itens foram para a lixeira`,
      "success",
      { action: { label: "Desfazer", onClick: () => restore(deleted, parents) } }
    );
  }

  async function move(targets: DriveItem[], destination: string, isUndo = false) {
    const sources = new Map(targets.map((t) => [t.id, t.parentId || folderId]));
    const movable = targets.filter((t) => sources.get(t.id) !== destination && t.id !== destination);
    if (!movable.length) return;
    setDialog({ kind: "none" });

    const progress = toast(`Movendo ${plural(movable.length, "item", "itens")}...`, "loading");
    const moved: DriveItem[] = [];
    for (const item of movable) {
      try {
        await api("/api/drive/move", { method: "PATCH", json: { fileId: item.id, newParentId: destination } });
        moved.push(item);
      } catch (e) {
        toast(`${item.name}: ${e instanceof Error ? e.message : "Erro"}`, "error");
      }
    }
    dismiss(progress);
    clearSelection();
    invalidateFolders([...new Set([...sources.values(), destination])]);
    if (!moved.length) return;

    const origin = sources.get(moved[0].id)!;
    const message = moved.length === 1 ? `"${moved[0].name}" movido` : `${moved.length} itens movidos`;
    toast(message, "success", {
      action: isUndo
        ? undefined
        : {
            label: "Desfazer",
            onClick: () => move(moved.map((m) => ({ ...m, parentId: destination })), origin, true),
          },
    });
  }

  const moveByIds = useCallback(
    (ids: string[], destination: string) => {
      const targets = ids.map((id) => items.find((i) => i.id === id)).filter((i): i is DriveItem => !!i);
      if (targets.length && targets.every(can.move)) move(targets, destination);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, can]
  );

  useEffect(() => {
    const onMove = (e: Event) => {
      const { ids, targetId } = (e as CustomEvent<MoveEventDetail>).detail;
      moveByIds(ids, targetId);
    };
    window.addEventListener(MOVE_EVENT, onMove);
    return () => window.removeEventListener(MOVE_EVENT, onMove);
  }, [moveByIds]);

  const uploader = useUploader(useCallback((ids: string[]) => invalidateFolders(ids), []));

  /* ---------- menus ---------- */

  function itemEntries(item: DriveItem, targets: DriveItem[]): MenuEntry[] {
    const multi = targets.length > 1;
    const entries: MenuEntry[] = [];
    if (!multi) {
      entries.push(
        item.isFolder
          ? { label: "Abrir", icon: FolderOpen, onSelect: () => navigate(item.id), hint: "Enter" }
          : { label: "Visualizar", icon: Eye, onSelect: () => openPreview(item), hint: "Espaço" }
      );
    }
    const files = targets.filter((t) => !t.isFolder);
    if (files.length && files.every(can.download)) {
      entries.push({ label: multi ? `Baixar ${plural(files.length, "arquivo", "arquivos")}` : "Baixar", icon: Download, onSelect: () => download(files) });
    }
    if (!multi && item.parentId && searching) {
      entries.push({ label: "Abrir local", icon: FolderSearch, onSelect: () => navigate(item.parentId!) });
    }
    if (!multi) entries.push({ label: "Copiar link", icon: Link2, onSelect: () => copyLink(item) });

    const edit: MenuEntry[] = [];
    if (!multi && can.rename(item)) {
      edit.push({ label: "Renomear", icon: Pencil, hint: "F2", onSelect: () => setDialog({ kind: "rename", item }) });
    }
    if (targets.every(can.move)) {
      edit.push({ label: "Mover para...", icon: FolderInput, onSelect: () => setDialog({ kind: "move", items: targets }) });
    }
    if (edit.length) entries.push("separator", ...edit);
    if (!multi) {
      entries.push({
        label: "Detalhes",
        icon: Info,
        hint: "I",
        onSelect: () => {
          selectOnly(item.id);
          setShowDetails(true);
        },
      });
    }
    if (targets.every(can.del)) {
      entries.push("separator", {
        label: multi ? `Excluir ${targets.length} itens` : "Excluir",
        icon: Trash2,
        danger: true,
        hint: "Del",
        onSelect: () => setDialog({ kind: "delete", items: targets }),
      });
    }
    return entries;
  }

  function openItemMenu(item: DriveItem, anchor: MenuAnchor) {
    const inSelection = selected.has(item.id);
    const targets = inSelection && selectedItems.length > 1 ? selectedItems : [item];
    if (!inSelection) selectOnly(item.id);
    setMenu({ entries: itemEntries(item, targets), anchor, title: targets.length > 1 ? `${targets.length} itens` : item.name });
  }

  const newEntries: MenuEntry[] = [
    ...(perms.can_create_folder ? [{ label: "Nova pasta", icon: FolderPlus, onSelect: () => setDialog({ kind: "newFolder" }) }] : []),
    ...(perms.can_create_folder && perms.can_upload ? ["separator" as const] : []),
    ...(perms.can_upload
      ? [
          { label: "Enviar arquivos", icon: Upload, onSelect: () => fileInput.current?.click() },
          ...(perms.can_create_folder ? [{ label: "Enviar pasta", icon: FolderUp, onSelect: () => folderInput.current?.click() }] : []),
        ]
      : []),
  ];

  function openBackgroundMenu(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-item-id]")) return;
    e.preventDefault();
    clearSelection();
    const entries: MenuEntry[] = [...(!searching ? newEntries : [])];
    if (entries.length) entries.push("separator");
    entries.push(
      { label: "Atualizar", icon: RefreshCw, onSelect: () => invalidateFolders([folderId]) },
      { label: view === "list" ? "Ver em grade" : "Ver em lista", icon: view === "list" ? LayoutGrid : List, onSelect: () => setView(view === "list" ? "grid" : "list") }
    );
    setMenu({ entries, anchor: { x: e.clientX, y: e.clientY } });
  }

  function openSortMenu(e: React.MouseEvent<HTMLButtonElement>) {
    const option = (key: SortKey, label: string): MenuEntry => ({
      label,
      checked: sort.key === key,
      onSelect: () => setSort({ key, asc: sort.key === key ? !sort.asc : key === "name" }),
    });
    setMenu({
      anchor: { rect: e.currentTarget.getBoundingClientRect(), align: "end" },
      entries: [
        option("name", "Nome"),
        option("modifiedTime", "Data de modificação"),
        option("size", "Tamanho"),
        "separator",
        { label: sort.asc ? "Crescente" : "Decrescente", icon: ArrowDownUp, onSelect: () => setSort({ ...sort, asc: !sort.asc }) },
      ],
    });
  }

  /* ---------- keyboard ---------- */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        searchInput.current?.focus();
        searchInput.current?.select();
        return;
      }
      if (typing || menu || preview || dialog.kind !== "none" || document.querySelector("[role=dialog]")) return;

      const index = cursorId ? items.findIndex((i) => i.id === cursorId) : -1;
      const cursorItem = index >= 0 ? items[index] : null;

      const moveCursor = (to: number) => {
        if (!items.length) return;
        const next = items[Math.max(0, Math.min(items.length - 1, to))];
        if (e.shiftKey) selectRange(next.id);
        else selectOnly(next.id);
      };

      let step = 1;
      if (view === "grid" && cursorItem && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const el = document.querySelector(`[data-item-id="${CSS.escape(cursorItem.id)}"]`);
        const siblings = el?.parentElement ? Array.from(el.parentElement.children) : [];
        const top = siblings[0]?.getBoundingClientRect().top;
        step = Math.max(1, siblings.filter((s) => s.getBoundingClientRect().top === top).length);
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveCursor(index === -1 ? 0 : index + step);
          break;
        case "ArrowUp":
          e.preventDefault();
          moveCursor(index === -1 ? 0 : index - step);
          break;
        case "ArrowRight":
          if (view !== "grid") return;
          e.preventDefault();
          moveCursor(index + 1);
          break;
        case "ArrowLeft":
          if (view !== "grid") return;
          e.preventDefault();
          moveCursor(index === -1 ? 0 : index - 1);
          break;
        case "Home":
          e.preventDefault();
          moveCursor(0);
          break;
        case "End":
          e.preventDefault();
          moveCursor(items.length - 1);
          break;
        case "Enter":
          if (cursorItem) open(cursorItem);
          break;
        case " ":
          if (cursorItem && !cursorItem.isFolder) {
            e.preventDefault();
            openPreview(cursorItem);
          }
          break;
        case "Backspace":
          if (!searching && breadcrumb.length > 1) navigate(breadcrumb[breadcrumb.length - 2].id);
          break;
        case "Delete":
          if (selectedItems.length && selectedItems.every(can.del)) setDialog({ kind: "delete", items: selectedItems });
          break;
        case "F2":
          e.preventDefault();
          if (selectedItems.length === 1 && can.rename(selectedItems[0])) setDialog({ kind: "rename", item: selectedItems[0] });
          break;
        case "Escape":
          if (selected.size) clearSelection();
          else if (searching) setQuery("");
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelected(new Set(items.map((i) => i.id)));
          }
          break;
        case "i":
          if (!e.ctrlKey && !e.metaKey) setShowDetails(!showDetails);
          break;
        case "?":
          setDialog({ kind: "shortcuts" });
          break;
        default:
          if (e.key === "ArrowUp" && e.altKey && breadcrumb.length > 1) navigate(breadcrumb[breadcrumb.length - 2].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- drag & drop ---------- */

  const handlers = {
    onPress: (item: DriveItem, e: React.MouseEvent) => {
      if (coarse) {
        if (selected.size) toggle(item.id);
        else open(item);
        return;
      }
      if (e.shiftKey) selectRange(item.id);
      else if (e.ctrlKey || e.metaKey) toggle(item.id);
      else selectOnly(item.id);
    },
    onOpen: open,
    onNameClick: (item: DriveItem) => (coarse && selected.size ? toggle(item.id) : open(item)),
    onCheck: (item: DriveItem, e: React.MouseEvent) => (e.shiftKey && anchorId ? selectRange(item.id) : toggle(item.id)),
    onLongPress: (item: DriveItem) => toggle(item.id),
    onMenu: openItemMenu,
    onOpenLocation: (item: DriveItem) => item.parentId && navigate(item.parentId),
    canDrag: (item: DriveItem) => !coarse && can.move(item),
    onDragStart: (item: DriveItem, e: React.DragEvent) => {
      const ids = selected.has(item.id) ? [...selected] : [item.id];
      if (!selected.has(item.id)) selectOnly(item.id);
      e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
      e.dataTransfer.effectAllowed = "move";
      const ghost = document.createElement("div");
      ghost.className = "drag-ghost";
      ghost.textContent = ids.length > 1 ? `${ids.length} itens` : item.name;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 14, 14);
      setTimeout(() => ghost.remove());
      setDragging(new Set(ids));
    },
    onDragEnd: () => {
      setDragging(new Set());
      setDropTarget(null);
    },
    onDragOverItem: (item: DriveItem, e: React.DragEvent) => {
      const types = e.dataTransfer.types;
      if (types.includes(DRAG_TYPE)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      } else if (types.includes("Files") && !searching) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      } else return;
      setDropTarget(item.id);
    },
    onDragLeaveItem: (item: DriveItem) => setDropTarget((t) => (t === item.id ? null : t)),
    onDropOnItem: (item: DriveItem, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      setFileDrag(false);
      dragDepth.current = 0;
      const ids = readDraggedIds(e);
      if (ids) moveByIds(ids, item.id);
      else if (e.dataTransfer.types.includes("Files") && !searching) {
        entriesFromDataTransfer(e.dataTransfer).then((entries) => uploader.upload(entries, item.id));
      }
    },
  };

  const surfaceDnD = {
    onDragEnter: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files") || !canUploadHere) return;
      dragDepth.current++;
      setFileDrag(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setFileDrag(false);
    },
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("Files") && canUploadHere) e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setFileDrag(false);
      if (canUploadHere) entriesFromDataTransfer(e.dataTransfer).then((entries) => uploader.upload(entries, folderId));
    },
  };

  /* ---------- render ---------- */

  const detailsActions = selectedItems.length
    ? itemEntries(selectedItems[0], selectedItems).filter((e) => e === "separator" || e.label !== "Detalhes")
    : [];
  const dropFolderName = dropTarget ? items.find((i) => i.id === dropTarget)?.name : null;
  const showSkeleton = (loading && !matchesParam) || (searchLoading && !results);

  let content: React.ReactNode;
  if (showSkeleton) {
    content = <LoadingSkeleton view={view} gridSize={gridSize} />;
  } else if (error && !searching) {
    content = <ErrorState error={error} user={user} isRoot={!folderParam} onRetry={() => invalidateFolders()} onHome={() => navigate("")} />;
  } else if (!items.length) {
    content = searching ? (
      <EmptyState icon={SearchX} title={`Nada encontrado para "${query.trim()}"`} text="Tente outro termo. A pesquisa procura pelo início das palavras no nome dos arquivos e pastas." />
    ) : listing?.limited ? (
      <EmptyState icon={Lock} title="Nenhuma pasta disponível aqui" text="Você só tem acesso a algumas pastas específicas." />
    ) : (
      <EmptyState
        icon={FolderOpen}
        title="Esta pasta está vazia"
        text={canUploadHere ? "Arraste arquivos ou pastas para cá, ou use os botões abaixo." : "Ainda não há arquivos nesta pasta."}
        dashed={canUploadHere}
      >
        {canUploadHere && (
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>
              <Upload size={16} /> Enviar arquivos
            </button>
            {perms.can_create_folder && (
              <button className="btn" onClick={() => setDialog({ kind: "newFolder" })}>
                <FolderPlus size={16} /> Nova pasta
              </button>
            )}
          </div>
        )}
      </EmptyState>
    );
  } else {
    const viewProps = {
      ...handlers,
      items,
      selected,
      cursorId,
      dropTargetId: dropTarget,
      draggingIds: dragging,
      showLocation: searching,
      selectionMode: selected.size > 0,
      touch: coarse,
    };
    content =
      view === "list" ? (
        <ListView
          {...viewProps}
          sort={sort}
          onSort={(key) => setSort({ key, asc: sort.key === key ? !sort.asc : key === "name" })}
          allChecked={allChecked}
          onToggleAll={() => (allChecked === true ? clearSelection() : setSelected(new Set(items.map((i) => i.id))))}
        />
      ) : (
        <GridView {...viewProps} gridSize={gridSize} />
      );
  }

  const folderCount = items.filter((i) => i.isFolder).length;
  const selectedSize = selectedItems.reduce((s, i) => s + Number(i.size || 0), 0);

  const details = showDetails && (ready || searching) && (
    <DetailsPanel
      selection={selectedItems}
      folder={listing?.folder ?? null}
      folderItems={listing?.files ?? []}
      path={breadcrumb}
      actions={detailsActions}
      onClose={() => setShowDetails(false)}
      onOpenLocation={navigate}
    />
  );

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 flex flex-col relative" {...surfaceDnD}>
        {/* Header */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 shrink-0">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0 flex items-center min-h-10">
              {searching ? (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-lg font-semibold truncate">Resultados da pesquisa</h1>
                  {results && (
                    <span className="text-sm shrink-0" style={{ color: "var(--text-3)" }}>
                      {plural(results.length, "item", "itens")} em todo o Atlas
                    </span>
                  )}
                </div>
              ) : (
                <Breadcrumbs
                  items={breadcrumb}
                  onNavigate={navigate}
                  onDropItems={(target, e) => {
                    const ids = readDraggedIds(e);
                    if (ids) {
                      e.preventDefault();
                      moveByIds(ids, target);
                    }
                  }}
                />
              )}
            </div>
            <div className="search-box sm:w-80">
              {searchLoading ? (
                <RefreshCw size={16} className="animate-spin search-icon" />
              ) : (
                <Search size={16} className="search-icon" />
              )}
              <input
                ref={searchInput}
                className="input !h-10 pl-9 pr-16"
                placeholder="Pesquisar no Atlas"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    e.currentTarget.blur();
                  }
                }}
                aria-label="Pesquisar arquivos e pastas"
              />
              {query ? (
                <button className="search-clear" onClick={() => setQuery("")} aria-label="Limpar pesquisa">
                  <X size={14} />
                </button>
              ) : (
                <kbd className="search-kbd hidden sm:flex">Ctrl K</kbd>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 h-14">
            {!searching && newEntries.length > 0 && (
              <button
                className={`btn btn-primary pl-3 shrink-0 ${selectedItems.length ? "hidden sm:inline-flex" : ""}`}
                onClick={(e) => setMenu({ entries: newEntries, anchor: { rect: e.currentTarget.getBoundingClientRect() } })}
              >
                <Plus size={17} strokeWidth={2.2} /> Novo
              </button>
            )}
            {searching && !selectedItems.length && (
              <button className="btn shrink-0" onClick={() => setQuery("")}>
                <X size={16} /> Limpar pesquisa
              </button>
            )}
            {selectedItems.length > 0 ? (
              <div className="selection-bar animate-pop">
                <button className="btn btn-ghost btn-icon h-8 w-8" onClick={clearSelection} aria-label="Limpar seleção">
                  <X size={16} />
                </button>
                <span className="text-sm font-medium whitespace-nowrap pr-1">
                  {plural(selectedItems.length, "selecionado", "selecionados")}
                </span>
                <div className="h-5 w-px mx-1" style={{ background: "var(--border-strong)" }} />
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  {selectedItems.some((i) => !i.isFolder) && selectedItems.filter((i) => !i.isFolder).every(can.download) && (
                    <button className="btn btn-ghost h-8 px-2.5" onClick={() => download(selectedItems)} title="Baixar">
                      <Download size={16} /> <span className="hidden md:inline">Baixar</span>
                    </button>
                  )}
                  {selectedItems.length === 1 && can.rename(selectedItems[0]) && (
                    <button className="btn btn-ghost h-8 px-2.5" onClick={() => setDialog({ kind: "rename", item: selectedItems[0] })} title="Renomear">
                      <Pencil size={16} /> <span className="hidden md:inline">Renomear</span>
                    </button>
                  )}
                  {selectedItems.every(can.move) && (
                    <button className="btn btn-ghost h-8 px-2.5" onClick={() => setDialog({ kind: "move", items: selectedItems })} title="Mover">
                      <FolderInput size={16} /> <span className="hidden md:inline">Mover</span>
                    </button>
                  )}
                  {selectedItems.every(can.del) && (
                    <button className="btn btn-ghost h-8 px-2.5" style={{ color: "var(--danger)" }} onClick={() => setDialog({ kind: "delete", items: selectedItems })} title="Excluir">
                      <Trash2 size={16} /> <span className="hidden md:inline">Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1" />
            )}

            <div className={`items-center gap-1 ml-auto shrink-0 ${error && !searching ? "hidden" : selectedItems.length ? "hidden sm:flex" : "flex"}`}>
              <button className={`btn btn-ghost btn-icon ${view === "list" ? "sm:hidden" : ""}`} onClick={openSortMenu} title="Ordenar" aria-label="Ordenar">
                <ArrowDownUp size={17} />
              </button>
              <button className="btn btn-ghost btn-icon hidden sm:flex" onClick={() => invalidateFolders([folderId])} title="Atualizar" aria-label="Atualizar">
                <RefreshCw size={16} className={loading && listing ? "animate-spin" : ""} />
              </button>
              <div className="segmented" role="radiogroup" aria-label="Modo de exibição">
                {(["list", "grid"] as const).map((v) => (
                  <button key={v} role="radio" aria-checked={view === v} data-active={view === v} onClick={() => setView(v)} title={v === "list" ? "Lista" : "Grade"} aria-label={v === "list" ? "Lista" : "Grade"}>
                    {v === "list" ? <List size={16} /> : <LayoutGrid size={15} />}
                  </button>
                ))}
              </div>
              {view === "grid" && (
                <div className="segmented" role="radiogroup" aria-label="Tamanho dos ícones">
                  {(["sm", "md", "lg"] as const).map((sz) => (
                    <button key={sz} role="radio" aria-checked={gridSize === sz} data-active={gridSize === sz} onClick={() => setGridSize(sz)} title={sz === "sm" ? "Pequeno" : sz === "md" ? "Médio" : "Grande"} aria-label={sz === "sm" ? "Ícones pequenos" : sz === "md" ? "Ícones médios" : "Ícones grandes"}>
                      <LayoutGrid size={sz === "sm" ? 12 : sz === "md" ? 15 : 18} />
                    </button>
                  ))}
                </div>
              )}
              <button
                className="btn btn-ghost btn-icon hidden md:flex"
                data-pressed={showDetails}
                onClick={() => setShowDetails(!showDetails)}
                title="Detalhes (I)"
                aria-label="Mostrar detalhes"
                aria-pressed={showDetails}
              >
                <Info size={17} />
              </button>
            </div>
          </div>
          {ready && listing!.limited && !searching && (
            <div className="notice mb-3">
              <Lock size={15} className="shrink-0" />
              Você vê aqui apenas as pastas que levam aos locais liberados para você.
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-24" onContextMenu={openBackgroundMenu} onClick={(e) => e.target === e.currentTarget && clearSelection()}>
          {content}
        </div>

        {/* Status bar */}
        {(ready || (searching && !!results)) && items.length > 0 && (
          <div className="status-bar hidden sm:flex">
            <span>
              {folderCount > 0 && plural(folderCount, "pasta", "pastas")}
              {folderCount > 0 && items.length - folderCount > 0 && ", "}
              {items.length - folderCount > 0 && plural(items.length - folderCount, "arquivo", "arquivos")}
            </span>
            {selectedItems.length > 0 && (
              <span>
                {plural(selectedItems.length, "selecionado", "selecionados")}
                {selectedSize > 0 && ` · ${formatFileSize(selectedSize)}`}
              </span>
            )}
            <button className="ml-auto flex items-center gap-1.5 hover:underline" onClick={() => setDialog({ kind: "shortcuts" })}>
              <Keyboard size={13} /> Atalhos
            </button>
          </div>
        )}

        {fileDrag && (
          <div className="drop-overlay">
            <div className="drop-pill">
              <Upload size={18} />
              Solte para enviar para <strong>{dropFolderName ?? listing?.folder.name}</strong>
            </div>
          </div>
        )}
      </div>

      {details &&
        (wide ? (
          details
        ) : (
          <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setShowDetails(false)}>
            <div className="absolute inset-0 backdrop" />
            <div className="relative h-full flex" onClick={(e) => e.stopPropagation()}>{details}</div>
          </div>
        ))}

      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) uploader.upload(entriesFromFileList(e.target.files), folderId);
          e.target.value = "";
        }}
      />
      <input
        ref={folderInput}
        type="file"
        hidden
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          if (e.target.files?.length) uploader.upload(entriesFromFileList(e.target.files), folderId);
          e.target.value = "";
        }}
      />

      {menu && <Menu entries={menu.entries} anchor={menu.anchor} title={menu.title} onClose={() => setMenu(null)} />}

      <PromptModal
        open={dialog.kind === "newFolder"}
        title="Nova pasta"
        label="Nome da pasta"
        initialValue="Nova pasta"
        confirmText="Criar"
        onClose={() => setDialog({ kind: "none" })}
        onSubmit={createFolder}
      />
      <PromptModal
        open={dialog.kind === "rename"}
        title="Renomear"
        label="Novo nome"
        initialValue={dialog.kind === "rename" ? dialog.item.name : ""}
        onClose={() => setDialog({ kind: "none" })}
        onSubmit={(v) => (dialog.kind === "rename" ? rename(dialog.item, v) : undefined)}
      />
      <ConfirmModal
        open={dialog.kind === "delete"}
        title={dialog.kind === "delete" && dialog.items.length > 1 ? `Excluir ${dialog.items.length} itens?` : "Excluir item?"}
        danger
        confirmText="Mover para a lixeira"
        message={
          dialog.kind === "delete" &&
          (dialog.items.length === 1 ? (
            <>
              <strong style={{ color: "var(--text)" }}>{dialog.items[0].name}</strong>
              {dialog.items[0].isFolder ? " e todo o seu conteúdo irão" : " irá"} para a lixeira do Google Drive. Você poderá desfazer logo em seguida.
            </>
          ) : (
            <>Os itens selecionados irão para a lixeira do Google Drive. Você poderá desfazer logo em seguida.</>
          ))
        }
        onClose={() => setDialog({ kind: "none" })}
        onConfirm={() => (dialog.kind === "delete" ? remove(dialog.items) : undefined)}
      />
      <MoveDialog
        open={dialog.kind === "move"}
        items={dialog.kind === "move" ? dialog.items : []}
        startFolderId={folderId}
        onClose={() => setDialog({ kind: "none" })}
        onMove={(target) => (dialog.kind === "move" ? move(dialog.items, target) : Promise.resolve())}
      />
      <ShortcutsDialog open={dialog.kind === "shortcuts"} onClose={() => setDialog({ kind: "none" })} />

      {preview && (
        <PreviewModal
          items={preview.items}
          index={preview.index}
          onIndexChange={(index) => {
            setPreview({ ...preview, index });
            selectOnly(preview.items[index].id);
          }}
          onClose={() => setPreview(null)}
          canDownload={can.download}
          onDownload={(item) => download([item])}
          onShowDetails={(item) => {
            setPreview(null);
            selectOnly(item.id);
            setShowDetails(true);
          }}
          onOpenLocation={searching ? (item) => item.parentId && navigate(item.parentId) : undefined}
        />
      )}

      <UploadPanel jobs={uploader.jobs} onClear={uploader.clear} onCancel={uploader.cancel} onRetry={uploader.retry} />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  dashed,
  children,
}: {
  icon: typeof FolderOpen;
  title: string;
  text: string;
  dashed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`empty-state ${dashed ? "dashed" : ""}`}>
      <div className="empty-icon">
        <Icon size={28} strokeWidth={1.6} />
      </div>
      <p className="font-semibold text-[15px]">{title}</p>
      <p className="text-sm mt-1 max-w-sm" style={{ color: "var(--text-2)" }}>{text}</p>
      {children}
    </div>
  );
}

function ErrorState({
  error,
  user,
  isRoot,
  onRetry,
  onHome,
}: {
  error: { status: number; message: string };
  user: AppUser;
  isRoot: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  const toast = useToast();
  const notConnected = /não conectado/i.test(error.message);
  const noRoot = /root folder not configured/i.test(error.message);

  async function connect() {
    try {
      const { url } = await api<{ url: string }>("/api/auth/google");
      window.location.href = url;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  let title = "Não foi possível carregar";
  let text = error.message;
  let action: React.ReactNode = <button className="btn" onClick={onRetry}><RefreshCw size={15} /> Tentar novamente</button>;

  if (notConnected) {
    title = "Google Drive não conectado";
    text = user.role === "admin"
      ? "Conecte a conta Google onde está a pasta Atlas para começar a usar."
      : "Peça a um administrador para conectar o Google Drive.";
    action = user.role === "admin"
      ? <button className="btn btn-primary" onClick={connect}><HardDrive size={16} /> Conectar Google Drive</button>
      : null;
  } else if (noRoot) {
    title = "Pasta raiz não configurada";
    text = "Um administrador precisa definir a pasta Atlas em Administração > Configurações.";
    action = user.role === "admin" ? <a className="btn btn-primary" href="/admin?tab=settings">Abrir configurações</a> : null;
  } else if (error.status === 403) {
    title = isRoot ? "Nenhuma pasta liberada ainda" : "Sem acesso a esta pasta";
    text = isRoot
      ? "Seu usuário ainda não tem acesso a nenhuma pasta. Fale com o administrador do Atlas."
      : "Você não tem permissão para ver o conteúdo desta pasta.";
    action = isRoot ? null : <button className="btn" onClick={onHome}>Voltar ao início</button>;
  } else if (error.status === 404) {
    title = "Pasta não encontrada";
    text = "Ela pode ter sido movida, renomeada ou excluída.";
    action = <button className="btn" onClick={onHome}>Voltar ao início</button>;
  }

  return (
    <div className="empty-state">
      <div className="empty-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
        {error.status === 403 ? <Lock size={26} /> : <AlertTriangle size={26} />}
      </div>
      <p className="font-semibold text-[15px]">{title}</p>
      <p className="text-sm mt-1 max-w-sm" style={{ color: "var(--text-2)" }}>{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ["Ctrl K  ou  /", "Pesquisar"],
  ["↑ ↓ ← →", "Navegar pelos itens"],
  ["Shift + setas", "Selecionar vários"],
  ["Ctrl + clique", "Adicionar à seleção"],
  ["Ctrl A", "Selecionar tudo"],
  ["Enter", "Abrir"],
  ["Espaço", "Visualizar arquivo"],
  ["Backspace", "Voltar para a pasta acima"],
  ["F2", "Renomear"],
  ["Del", "Excluir"],
  ["I", "Mostrar/ocultar detalhes"],
  ["Esc", "Limpar seleção"],
];

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Atalhos de teclado" onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm pb-1">
        {SHORTCUTS.map(([keys, label]) => (
          <div key={label} className="contents">
            <dt><kbd className="kbd">{keys}</kbd></dt>
            <dd style={{ color: "var(--text-2)" }}>{label}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
