"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/drive-client";
import type { DriveItem } from "@/types";

export interface UploadEntry {
  /** null marks an empty directory. */
  file: File | null;
  /** Relative path, e.g. "Fotos/2024/praia.jpg" or "Vazia/" for an empty folder. */
  path: string;
}

export interface UploadJob {
  id: number;
  kind: "file" | "folder";
  name: string;
  path: string;
  mimeType: string;
  size: number;
  loaded: number;
  status: "queued" | "uploading" | "done" | "error" | "canceled";
  error?: string;
}

const CONCURRENCY = 3;

const dirname = (path: string) => {
  const trimmed = path.replace(/\/$/, "");
  const i = trimmed.lastIndexOf("/");
  return i === -1 ? "" : trimmed.slice(0, i);
};
const basename = (path: string) => path.replace(/\/$/, "").split("/").pop() || path;

/** Must be called synchronously inside the drop handler: DataTransfer items expire after it. */
export function entriesFromDataTransfer(dt: DataTransfer): Promise<UploadEntry[]> {
  const fsEntries = Array.from(dt.items || [])
    .filter((i) => i.kind === "file")
    .map((i) => i.webkitGetAsEntry?.() ?? null);

  if (!fsEntries.some((e) => e?.isDirectory)) {
    return Promise.resolve(Array.from(dt.files).map((file) => ({ file, path: file.name })));
  }

  const out: UploadEntry[] = [];
  async function walk(entry: FileSystemEntry, prefix: string): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject)
      );
      out.push({ file, path: prefix + file.name });
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    const dir = `${prefix}${entry.name}/`;
    let found = false;
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      found = true;
      for (const child of batch) await walk(child, dir);
    }
    if (!found) out.push({ file: null, path: dir });
  }

  return (async () => {
    for (const entry of fsEntries) if (entry) await walk(entry, "");
    return out;
  })();
}

export function entriesFromFileList(files: FileList): UploadEntry[] {
  return Array.from(files).map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}

export function useUploader(onFinished: (folderIds: string[]) => void) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const seq = useRef(0);
  const requests = useRef(new Map<number, XMLHttpRequest>());
  const pending = useRef(new Map<number, { file: File; parentId: string }>());
  const finished = useRef(onFinished);
  useEffect(() => {
    finished.current = onFinished;
  }, [onFinished]);

  const active = jobs.some((j) => j.status === "queued" || j.status === "uploading");

  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  const patch = useCallback((id: number, changes: Partial<UploadJob>) => {
    setJobs((all) => all.map((j) => (j.id === id ? { ...j, ...changes } : j)));
  }, []);

  const uploadOne = useCallback(
    async (jobId: number) => {
      const task = pending.current.get(jobId);
      if (!task) return;
      const { file, parentId } = task;
      patch(jobId, { status: "uploading", loaded: 0, error: undefined });
      try {
        const { uploadUrl } = await api<{ uploadUrl: string }>("/api/drive/upload", {
          method: "POST",
          json: { parentId, name: file.name, mimeType: file.type || "application/octet-stream", size: file.size },
        });
        if (!pending.current.has(jobId)) throw new DOMException("canceled", "AbortError");
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          requests.current.set(jobId, xhr);
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (e) => e.lengthComputable && patch(jobId, { loaded: e.loaded });
          xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Falha no envio (${xhr.status})`)));
          xhr.onerror = () => reject(new Error("Falha de conexão"));
          xhr.onabort = () => reject(new DOMException("canceled", "AbortError"));
          xhr.send(file);
        });
        pending.current.delete(jobId);
        patch(jobId, { status: "done", loaded: file.size });
        return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          pending.current.delete(jobId);
          patch(jobId, { status: "canceled" });
        } else {
          patch(jobId, { status: "error", error: e instanceof Error ? e.message : "Erro" });
        }
        return false;
      } finally {
        requests.current.delete(jobId);
      }
    },
    [patch]
  );

  const runQueue = useCallback(
    async (ids: number[]) => {
      const queue = [...ids];
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          while (queue.length) await uploadOne(queue.shift()!);
        })
      );
    },
    [uploadOne]
  );

  const upload = useCallback(
    async (entries: UploadEntry[], targetId: string) => {
      if (!entries.length) return;

      const dirs = new Set<string>();
      for (const e of entries) {
        let dir = e.file ? dirname(e.path) : e.path.replace(/\/$/, "");
        while (dir) {
          dirs.add(dir);
          dir = dirname(dir);
        }
      }
      const orderedDirs = [...dirs].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
      const files = entries.filter((e): e is { file: File; path: string } => !!e.file);

      const folderJobs = orderedDirs.map((dir) => ({ dir, id: ++seq.current }));
      const fileJobs = files.map((entry) => ({ entry, id: ++seq.current }));

      setJobs((all) => [
        ...all.filter((j) => j.status !== "done" && j.status !== "canceled"),
        ...folderJobs.map(({ dir, id }) => ({
          id, kind: "folder" as const, name: basename(dir), path: dir, mimeType: "application/vnd.google-apps.folder",
          size: 0, loaded: 0, status: "queued" as const,
        })),
        ...fileJobs.map(({ entry, id }) => ({
          id, kind: "file" as const, name: entry.file.name, path: entry.path, mimeType: entry.file.type || "application/octet-stream",
          size: entry.file.size, loaded: 0, status: "queued" as const,
        })),
      ]);

      const folderIds = new Map<string, string>([["", targetId]]);
      for (const { dir, id } of folderJobs) {
        const parent = folderIds.get(dirname(dir));
        if (!parent) {
          patch(id, { status: "error", error: "A pasta de origem não foi criada" });
          continue;
        }
        patch(id, { status: "uploading" });
        try {
          const folder = await api<DriveItem>("/api/drive/folder", {
            method: "POST",
            json: { parentId: parent, name: basename(dir) },
          });
          folderIds.set(dir, folder.id);
          patch(id, { status: "done" });
        } catch (e) {
          patch(id, { status: "error", error: e instanceof Error ? e.message : "Erro" });
        }
      }

      const runnable: number[] = [];
      for (const { entry, id } of fileJobs) {
        const parentId = folderIds.get(dirname(entry.path));
        if (!parentId) {
          patch(id, { status: "error", error: "A pasta de destino não foi criada" });
          continue;
        }
        pending.current.set(id, { file: entry.file, parentId });
        runnable.push(id);
      }

      await runQueue(runnable);
      finished.current([targetId]);
    },
    [patch, runQueue]
  );

  const retry = useCallback(
    async (jobId: number) => {
      const task = pending.current.get(jobId);
      if (!task) return;
      await uploadOne(jobId);
      finished.current([task.parentId]);
    },
    [uploadOne]
  );

  const cancel = useCallback(
    (jobId?: number) => {
      const ids = jobId !== undefined ? [jobId] : [...new Set([...requests.current.keys(), ...pending.current.keys()])];
      for (const id of ids) {
        const xhr = requests.current.get(id);
        if (xhr) {
          xhr.abort();
          continue;
        }
        pending.current.delete(id);
        setJobs((all) =>
          all.map((j) =>
            j.id === id && (j.status === "queued" || j.status === "uploading") ? { ...j, status: "canceled" } : j
          )
        );
      }
    },
    []
  );

  const clear = useCallback(() => {
    setJobs((all) => all.filter((j) => j.status === "queued" || j.status === "uploading"));
  }, []);

  return { jobs, upload, retry, cancel, clear };
}
