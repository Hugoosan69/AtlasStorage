"use client";

import type { FolderListing } from "@/types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || `Erro ${res.status}`);
  return data as T;
}

/* Folder listings are cached briefly so the tree, back/forward and the move dialog feel instant. */

const TTL = 60_000;
const cache = new Map<string, { at: number; data: FolderListing }>();
const inflight = new Map<string, Promise<FolderListing>>();
const listeners = new Set<(ids: string[] | null) => void>();
let rootId = "";

const keyOf = (id: string) => id || rootId || "__root__";

export function peekFolder(id: string): FolderListing | undefined {
  const hit = cache.get(keyOf(id));
  return hit && Date.now() - hit.at < TTL ? hit.data : undefined;
}

export function getFolder(id: string, { fresh = false } = {}): Promise<FolderListing> {
  const key = keyOf(id);
  if (!fresh) {
    const hit = peekFolder(id);
    if (hit) return Promise.resolve(hit);
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = api<FolderListing>(`/api/drive/list${id ? `?folderId=${encodeURIComponent(id)}` : ""}`)
    .then((data) => {
      if (!id) rootId = data.folder.id;
      const entry = { at: Date.now(), data };
      cache.set(data.folder.id, entry);
      if (!id) cache.set("__root__", entry);
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

export function getRootId() {
  return rootId;
}

/** Drops cached listings and tells subscribers (tree, browser) to reload. */
export function invalidateFolders(ids?: string[]) {
  if (!ids) cache.clear();
  else for (const id of ids) {
    cache.delete(id);
    if (id === rootId) cache.delete("__root__");
  }
  listeners.forEach((fn) => fn(ids ?? null));
}

export function onFoldersChanged(fn: (ids: string[] | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function folderHref(id: string) {
  return !id || id === rootId ? "/" : `/?f=${encodeURIComponent(id)}`;
}

export function navigateToFolder(id: string) {
  window.history.pushState(null, "", folderHref(id));
}

export const DRAG_TYPE = "application/x-atlas-items";

export function readDraggedIds(e: React.DragEvent): string[] | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

/** Fired by drop targets outside the browser (e.g. the folder tree). */
export const MOVE_EVENT = "atlas:move-items";
export type MoveEventDetail = { ids: string[]; targetId: string };
