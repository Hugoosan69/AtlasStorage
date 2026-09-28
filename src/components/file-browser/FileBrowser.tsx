"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Download,
  FolderInput,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal, PromptModal } from "@/components/ui/Modal";
import { FileIcon } from "./FileIcon";
import { MoveDialog } from "./MoveDialog";
import { UploadPanel, type UploadJob } from "./UploadPanel";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { AppUser, BreadcrumbItem, DriveItem, UserPermissions } from "@/types";

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

type SortKey = "name" | "modifiedTime" | "size";
type Dialog =
  | { kind: "none" }
  | { kind: "newFolder" }
  | { kind: "rename"; item: DriveItem }
  | { kind: "delete"; items: DriveItem[] }
  | { kind: "move"; items: DriveItem[] };

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

function readFolderFromUrl() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("f") || "";
}

export function FileBrowser({ user }: { user: AppUser }) {
  const toast = useToast();
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [perms, setPerms] = useState<UserPermissions>(NO_PERMS);
  const [folderId, setFolderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "name", asc: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ item: DriveItem; x: number; y: number } | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [uploads, setUploads] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const uploadSeq = useRef(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem("atlas:view");
      if (v === "grid" || v === "list") setView(v);
    } catch {}
  }, []);

  const load = useCallback(async (id: string, push = false) => {
    setLoading(true);
    setLoadError("");
    setSelected(new Set());
    try {
      const data = await api(`/api/drive/list${id ? `?folderId=${encodeURIComponent(id)}` : ""}`);
      setFiles(data.files);
      setBreadcrumb(data.breadcrumb);
      setPerms(data.permissions);
      const resolved = id || data.breadcrumb[0]?.id || "";
      setFolderId(resolved);
      if (push) {
        const url = id && data.breadcrumb.length > 1 ? `/?f=${encodeURIComponent(id)}` : "/";
        window.history.pushState({ f: id }, "", url);
      }
    } catch (e) {
      setFiles([]);
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(readFolderFromUrl());
    const onPop = () => load(readFolderFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [load]);

  const navigate = useCallback(
    (id: string) => {
      setQuery("");
      setSearching(false);
      load(id, true);
    },
    [load]
  );

  const refresh = useCallback(() => load(folderId), [load, folderId]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      if (searching) {
        setSearching(false);
        refresh();
      }
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setLoading(true);
      setSelected(new Set());
      try {
        const data = await api(`/api/drive/search?q=${encodeURIComponent(q)}`);
        setFiles(data.files);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro na busca", "error");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const sorted = useMemo(() => {
    const dir = sort.asc ? 1 : -1;
    return [...files].sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      if (sort.key === "size") return (Number(a.size || 0) - Number(b.size || 0)) * dir;
      if (sort.key === "modifiedTime")
        return ((a.modifiedTime || "") < (b.modifiedTime || "") ? -1 : 1) * dir;
      return a.name.localeCompare(b.name, "pt-BR", { numeric: true }) * dir;
    });
  }, [files, sort]);

  const selectedItems = sorted.filter((f) => selected.has(f.id));

  const can = {
    rename: (i: DriveItem) => !searching && (i.isFolder ? perms.can_rename_folders : perms.can_rename_files),
    move: (i: DriveItem) => !searching && (i.isFolder ? perms.can_move_folders : perms.can_move_files),
    del: (i: DriveItem) => !searching && (i.isFolder ? perms.can_delete_folders : perms.can_delete_files),
    download: (i: DriveItem) => !i.isFolder && (searching || perms.can_download),
  };

  function open(item: DriveItem) {
    if (item.isFolder) navigate(item.id);
    else if (can.download(item)) download(item);
  }

  function download(item: DriveItem) {
    const a = document.createElement("a");
    a.href = `/api/drive/download?fileId=${encodeURIComponent(item.id)}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function toggleSelect(item: DriveItem, e: React.MouseEvent) {
    setSelected((prev) => {
      const next = new Set(e.metaKey || e.ctrlKey || e.shiftKey ? prev : []);
      if (next.has(item.id) && (e.metaKey || e.ctrlKey)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function openMenu(item: DriveItem, x: number, y: number) {
    if (!selected.has(item.id)) setSelected(new Set([item.id]));
    setMenu({ item, x: Math.min(x, window.innerWidth - 220), y: Math.min(y, window.innerHeight - 240) });
  }

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || dialog.kind !== "none") return;
      if (e.key === "Delete" && selectedItems.length && selectedItems.every(can.del))
        setDialog({ kind: "delete", items: selectedItems });
      if (e.key === "F2" && selectedItems.length === 1 && can.rename(selectedItems[0]))
        setDialog({ kind: "rename", item: selectedItems[0] });
      if (e.key === "Escape") setSelected(new Set());
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelected(new Set(sorted.map((f) => f.id)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function createFolder(name: string) {
    try {
      await api("/api/drive/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: folderId, name }),
      });
      toast(`Pasta "${name}" criada`, "success");
      setDialog({ kind: "none" });
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  async function rename(item: DriveItem, newName: string) {
    if (newName === item.name) return setDialog({ kind: "none" });
    try {
      await api("/api/drive/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: item.id, newName }),
      });
      toast("Renomeado", "success");
      setDialog({ kind: "none" });
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  async function remove(items: DriveItem[]) {
    let ok = 0;
    for (const item of items) {
      try {
        await api(`/api/drive/delete?fileId=${encodeURIComponent(item.id)}`, { method: "DELETE" });
        ok++;
      } catch (e) {
        toast(`${item.name}: ${e instanceof Error ? e.message : "Erro"}`, "error");
      }
    }
    if (ok) toast(ok === 1 ? "Item movido para a lixeira" : `${ok} itens movidos para a lixeira`, "success");
    setDialog({ kind: "none" });
    refresh();
  }

  async function move(items: DriveItem[], target: string) {
    let ok = 0;
    for (const item of items) {
      try {
        await api("/api/drive/move", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: item.id, newParentId: target }),
        });
        ok++;
      } catch (e) {
        toast(`${item.name}: ${e instanceof Error ? e.message : "Erro"}`, "error");
      }
    }
    if (ok) toast(ok === 1 ? "Item movido" : `${ok} itens movidos`, "success");
    setDialog({ kind: "none" });
    refresh();
  }

  function updateJob(id: number, patch: Partial<UploadJob>) {
    setUploads((all) => all.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function upload(list: FileList | File[]) {
    const items = Array.from(list);
    if (!items.length || !folderId) return;
    const target = folderId;
    const jobs = items.map((f) => ({
      id: ++uploadSeq.current,
      name: f.name,
      mimeType: f.type || "application/octet-stream",
      progress: 0,
      status: "pending" as const,
    }));
    setUploads((all) => [...all.filter((j) => j.status !== "done"), ...jobs]);

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      const job = jobs[i];
      updateJob(job.id, { status: "uploading" });
      try {
        const { uploadUrl } = await api("/api/drive/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parentId: target, name: file.name, mimeType: job.mimeType, size: file.size }),
        });
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", job.mimeType);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) updateJob(job.id, { progress: Math.round((e.loaded / e.total) * 100) });
          };
          xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Falha no envio (${xhr.status})`)));
          xhr.onerror = () => reject(new Error("Falha de conexão"));
          xhr.send(file);
        });
        updateJob(job.id, { status: "done", progress: 100 });
      } catch (e) {
        updateJob(job.id, { status: "error", error: e instanceof Error ? e.message : "Erro" });
      }
    }
    if (target === folderId) refresh();
  }

  const dropProps = perms.can_upload && !searching
    ? {
        onDragEnter: (e: React.DragEvent) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          dragDepth.current++;
          setDragging(true);
        },
        onDragLeave: () => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        },
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
        },
      }
    : {};

  const driveNotConnected = /não conectado/i.test(loadError);
  const rootMissing = /root folder not configured/i.test(loadError);

  async function connectDrive() {
    try {
      const { url } = await api("/api/auth/google");
      window.location.href = url;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  function SortHeader({ k, label, className }: { k: SortKey; label: string; className?: string }) {
    const active = sort.key === k;
    return (
      <button
        className={`flex items-center gap-1 hover:text-[var(--text)] ${className || ""}`}
        onClick={() => setSort({ key: k, asc: active ? !sort.asc : true })}
      >
        {label}
        {active && (sort.asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    );
  }

  function ItemActions({ item }: { item: DriveItem }) {
    const entries = [
      { show: item.isFolder, icon: FolderOpen, label: "Abrir", run: () => navigate(item.id) },
      { show: can.download(item), icon: Download, label: "Baixar", run: () => download(item) },
      { show: can.rename(item), icon: Pencil, label: "Renomear", run: () => setDialog({ kind: "rename", item }) },
      {
        show: can.move(item),
        icon: FolderInput,
        label: "Mover para...",
        run: () => setDialog({ kind: "move", items: selectedItems.length > 1 ? selectedItems : [item] }),
      },
      {
        show: can.del(item),
        icon: Trash2,
        label: "Excluir",
        danger: true,
        run: () => setDialog({ kind: "delete", items: selectedItems.length > 1 ? selectedItems : [item] }),
      },
    ].filter((e) => e.show);

    if (!entries.length)
      return <div className="px-3 py-2 text-sm" style={{ color: "var(--text-3)" }}>Nenhuma ação disponível</div>;

    return (
      <>
        {entries.map(({ icon: Icon, label, run, danger }) => (
          <button
            key={label}
            className="w-full flex items-center gap-3 px-3 h-9 text-sm rounded-md hover:bg-[var(--hover)]"
            style={{ color: danger ? "var(--danger)" : undefined }}
            onClick={() => {
              setMenu(null);
              run();
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col relative" {...dropProps}>
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 space-y-3 shrink-0">
        <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
          <nav className="flex items-center min-w-0 flex-1 text-sm overflow-x-auto">
            {searching ? (
              <span className="font-semibold text-lg truncate">Resultados para &ldquo;{query.trim()}&rdquo;</span>
            ) : (
              breadcrumb.map((b, i) => {
                const last = i === breadcrumb.length - 1;
                return (
                  <span key={b.id} className="flex items-center shrink-0">
                    {i > 0 && <ChevronRight size={16} className="mx-0.5" style={{ color: "var(--text-3)" }} />}
                    <button
                      onClick={() => !last && navigate(b.id)}
                      className={`px-1.5 py-1 rounded-md truncate max-w-[14rem] ${last ? "font-semibold text-lg" : "hover:bg-[var(--hover)]"}`}
                      style={{ color: last ? "var(--text)" : "var(--text-2)" }}
                    >
                      {i === 0 && !last ? <HardDrive size={15} className="inline -mt-0.5 mr-1" /> : null}
                      {b.name}
                    </button>
                  </span>
                );
              })
            )}
          </nav>
          <div className="relative sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
            <input
              className="input pl-9 pr-8"
              placeholder="Pesquisar no Atlas"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded"
                style={{ color: "var(--text-3)" }}
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 min-h-9">
          {selectedItems.length > 0 ? (
            <div
              className="flex items-center gap-1 pl-3 pr-1 h-10 rounded-lg flex-1 min-w-0 animate-pop"
              style={{ background: "var(--accent-soft)" }}
            >
              <span className="text-sm font-medium mr-2 whitespace-nowrap" style={{ color: "var(--accent)" }}>
                {selectedItems.length} selecionado{selectedItems.length > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-0.5 overflow-x-auto">
                {selectedItems.length === 1 && can.download(selectedItems[0]) && (
                  <button className="btn btn-ghost h-8" onClick={() => download(selectedItems[0])}>
                    <Download size={16} /> <span className="hidden sm:inline">Baixar</span>
                  </button>
                )}
                {selectedItems.length === 1 && can.rename(selectedItems[0]) && (
                  <button className="btn btn-ghost h-8" onClick={() => setDialog({ kind: "rename", item: selectedItems[0] })}>
                    <Pencil size={16} /> <span className="hidden sm:inline">Renomear</span>
                  </button>
                )}
                {selectedItems.every(can.move) && (
                  <button className="btn btn-ghost h-8" onClick={() => setDialog({ kind: "move", items: selectedItems })}>
                    <FolderInput size={16} /> <span className="hidden sm:inline">Mover</span>
                  </button>
                )}
                {selectedItems.every(can.del) && (
                  <button
                    className="btn btn-ghost h-8"
                    style={{ color: "var(--danger)" }}
                    onClick={() => setDialog({ kind: "delete", items: selectedItems })}
                  >
                    <Trash2 size={16} /> <span className="hidden sm:inline">Excluir</span>
                  </button>
                )}
              </div>
              <button className="btn btn-ghost btn-icon h-8 ml-auto" onClick={() => setSelected(new Set())} aria-label="Limpar seleção">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              {perms.can_upload && !searching && (
                <button className="btn btn-primary" onClick={() => fileInput.current?.click()}>
                  <Upload size={16} /> Enviar
                </button>
              )}
              {perms.can_create_folder && !searching && (
                <button className="btn" onClick={() => setDialog({ kind: "newFolder" })}>
                  <FolderPlus size={16} /> Nova pasta
                </button>
              )}
              <div className="flex-1" />
            </>
          )}
          <div className="flex p-0.5 rounded-lg shrink-0" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {(["list", "grid"] as const).map((v) => (
              <button
                key={v}
                className="w-8 h-8 flex items-center justify-center rounded-md"
                style={{
                  background: view === v ? "var(--surface)" : "transparent",
                  color: view === v ? "var(--text)" : "var(--text-3)",
                  boxShadow: view === v ? "0 1px 2px rgb(0 0 0 / 0.08)" : undefined,
                }}
                onClick={() => {
                  setView(v);
                  try {
                    localStorage.setItem("atlas:view", v);
                  } catch {}
                }}
                aria-label={v === "list" ? "Lista" : "Grade"}
              >
                {v === "list" ? <List size={16} /> : <LayoutGrid size={16} />}
              </button>
            ))}
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) upload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-24" onClick={(e) => e.target === e.currentTarget && setSelected(new Set())}>
        {loading ? (
          <div className="flex items-center justify-center py-24" style={{ color: "var(--text-3)" }}>
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : loadError ? (
          <div className="card max-w-lg mx-auto mt-10 p-6 text-center">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
            >
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-semibold mb-1">
              {driveNotConnected ? "Google Drive não conectado" : rootMissing ? "Pasta raiz não configurada" : "Não foi possível carregar"}
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-2)" }}>
              {driveNotConnected
                ? user.role === "admin"
                  ? "Conecte a conta Google onde está a pasta Atlas para começar."
                  : "Peça a um administrador para conectar o Google Drive."
                : rootMissing
                  ? "Defina o ID da pasta Atlas em Administração > Configurações."
                  : loadError}
            </p>
            {driveNotConnected && user.role === "admin" ? (
              <button className="btn btn-primary" onClick={connectDrive}>
                <HardDrive size={16} /> Conectar Google Drive
              </button>
            ) : (
              <button className="btn" onClick={refresh}>Tentar novamente</button>
            )}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: "var(--surface-2)", color: "var(--text-3)" }}
            >
              {searching ? <Search size={28} /> : <FolderOpen size={28} />}
            </div>
            <p className="font-medium">{searching ? "Nada encontrado" : "Pasta vazia"}</p>
            {!searching && perms.can_upload && (
              <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
                Arraste arquivos para cá ou use o botão Enviar
              </p>
            )}
          </div>
        ) : view === "list" ? (
          <div className="card overflow-hidden">
            <div
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_9rem_6rem_2.5rem] items-center gap-4 px-4 h-10 text-xs font-medium"
              style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
            >
              <SortHeader k="name" label="Nome" />
              <SortHeader k="modifiedTime" label="Modificado" className="hidden sm:flex" />
              <SortHeader k="size" label="Tamanho" className="hidden sm:flex justify-end" />
              <span />
            </div>
            {sorted.map((item) => {
              const isSel = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  className="group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_9rem_6rem_2.5rem] items-center gap-4 px-4 h-12 text-sm cursor-default select-none"
                  style={{
                    background: isSel ? "var(--selected)" : undefined,
                    borderBottom: "1px solid var(--border)",
                  }}
                  onClick={(e) => toggleSelect(item, e)}
                  onDoubleClick={() => open(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(item, e.clientX, e.clientY);
                  }}
                  onMouseEnter={(e) => !isSel && (e.currentTarget.style.background = "var(--hover)")}
                  onMouseLeave={(e) => !isSel && (e.currentTarget.style.background = "")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileIcon mimeType={item.mimeType} />
                    <button
                      className="truncate text-left hover:underline decoration-[var(--text-3)] underline-offset-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        open(item);
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </button>
                  </div>
                  <span className="hidden sm:block text-xs" style={{ color: "var(--text-2)" }}>
                    {formatDate(item.modifiedTime)}
                  </span>
                  <span className="hidden sm:block text-xs text-right tabular-nums" style={{ color: "var(--text-2)" }}>
                    {item.isFolder ? "—" : formatFileSize(item.size)}
                  </span>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-md sm:opacity-0 group-hover:opacity-100 hover:bg-[var(--hover)]"
                    style={{ color: "var(--text-2)", opacity: isSel ? 1 : undefined }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      openMenu(item, r.right - 200, r.bottom + 4);
                    }}
                    aria-label="Ações"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {sorted.map((item) => {
              const isSel = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  className="group relative card p-3 cursor-default select-none transition-colors hover:bg-[var(--hover)]"
                  style={{
                    background: isSel ? "var(--selected)" : undefined,
                    borderColor: isSel ? "var(--accent)" : undefined,
                  }}
                  onClick={(e) => toggleSelect(item, e)}
                  onDoubleClick={() => open(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu(item, e.clientX, e.clientY);
                  }}
                >
                  <div
                    className="aspect-[4/3] rounded-lg mb-2.5 flex items-center justify-center overflow-hidden"
                    style={{ background: "var(--surface-2)" }}
                  >
                    {item.thumbnailLink && !item.isFolder ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailLink} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <FileIcon mimeType={item.mimeType} size={40} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileIcon mimeType={item.mimeType} size={16} />
                    <button
                      className="text-sm truncate flex-1 text-left"
                      title={item.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        open(item);
                      }}
                    >
                      {item.name}
                    </button>
                  </div>
                  <button
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-md sm:opacity-0 group-hover:opacity-100"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      openMenu(item, r.right - 200, r.bottom + 4);
                    }}
                    aria-label="Ações"
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dragging && (
        <div
          className="absolute inset-3 z-30 rounded-2xl flex flex-col items-center justify-center gap-3 pointer-events-none"
          style={{ background: "color-mix(in srgb, var(--accent-soft) 88%, transparent)", border: "2px dashed var(--accent)", color: "var(--accent)" }}
        >
          <Upload size={36} />
          <p className="font-semibold">Solte para enviar para {breadcrumb[breadcrumb.length - 1]?.name}</p>
        </div>
      )}

      {menu && (
        <div
          className="fixed z-50 w-52 p-1 rounded-xl animate-pop"
          style={{ left: Math.max(8, menu.x), top: menu.y, background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <ItemActions item={menu.item} />
        </div>
      )}

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
        title="Excluir"
        danger
        confirmText="Excluir"
        message={
          dialog.kind === "delete" &&
          (dialog.items.length === 1 ? (
            <>
              <strong style={{ color: "var(--text)" }}>{dialog.items[0].name}</strong> será movido para a lixeira do Google Drive.
            </>
          ) : (
            <>{dialog.items.length} itens serão movidos para a lixeira do Google Drive.</>
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
      <UploadPanel jobs={uploads} onClear={() => setUploads([])} />
    </div>
  );
}
