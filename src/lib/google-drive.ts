import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import { createServiceClient } from "./supabase/server";
import type { BreadcrumbItem, DriveItem } from "@/types";

export const FOLDER_MIME = "application/vnd.google-apps.folder";
export const NOT_CONNECTED =
  "Google Drive não conectado. Faça a conexão em Administração > Configurações.";

const ITEM_FIELDS =
  "id, name, mimeType, size, modifiedTime, createdTime, parents, hasThumbnail, thumbnailLink";

let driveClient: drive_v3.Drive | null = null;
let accessToken = "";
let tokenExpiresAt = 0;
let pendingClient: Promise<drive_v3.Drive> | null = null;

async function getRefreshToken(): Promise<string> {
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "google_refresh_token")
    .single();

  if (!data?.value) throw new Error(NOT_CONNECTED);
  return data.value;
}

async function getDriveClient(): Promise<drive_v3.Drive> {
  if (driveClient && Date.now() < tokenExpiresAt - 60_000) return driveClient;

  pendingClient ??= (async () => {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: await getRefreshToken() });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      tokenExpiresAt = credentials.expiry_date || Date.now() + 3_500_000;
      accessToken = credentials.access_token || "";
    } catch (error) {
      if (String(error).includes("invalid_grant")) throw new Error(NOT_CONNECTED);
      throw error;
    }

    driveClient = google.drive({ version: "v3", auth: oauth2Client });
    return driveClient;
  })().finally(() => {
    pendingClient = null;
  });

  return pendingClient;
}

function toItem(file: drive_v3.Schema$File): DriveItem {
  return {
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    size: file.size || undefined,
    modifiedTime: file.modifiedTime || undefined,
    createdTime: file.createdTime || undefined,
    parents: file.parents || undefined,
    hasThumbnail: !!file.hasThumbnail && !!file.thumbnailLink,
    isFolder: file.mimeType === FOLDER_MIME,
  };
}

/* Short-lived metadata cache: folder paths are resolved on almost every request. */

interface NodeMeta {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
}

const META_TTL = 30_000;
const metaCache = new Map<string, NodeMeta & { at: number }>();

/** Drive ids are URL-safe base64; anything else never reaches a Drive query. */
function assertId(id: string) {
  if (!/^[\w-]+$/.test(id)) throw Object.assign(new Error("Item não encontrado"), { status: 404 });
}

async function getNodeMeta(id: string): Promise<NodeMeta> {
  assertId(id);
  const cached = metaCache.get(id);
  if (cached && Date.now() - cached.at < META_TTL) return cached;

  const drive = await getDriveClient();
  const { data } = await drive.files.get({ fileId: id, fields: "id, name, mimeType, parents" });
  const meta = {
    id: data.id!,
    name: data.name!,
    mimeType: data.mimeType!,
    parents: data.parents || [],
  };
  if (metaCache.size > 5000) metaCache.clear();
  metaCache.set(id, { ...meta, at: Date.now() });
  return meta;
}

function forget(...ids: string[]) {
  for (const id of ids) metaCache.delete(id);
  folderIndex = null;
}

/** Path from the Atlas root down to `folderId`, or null when it is not inside the root. */
export async function getFolderPath(
  folderId: string,
  rootFolderId: string
): Promise<BreadcrumbItem[] | null> {
  const path: BreadcrumbItem[] = [];
  let currentId = folderId;

  for (let depth = 0; currentId !== rootFolderId; depth++) {
    if (!currentId || depth > 64) return null;
    const meta = await getNodeMeta(currentId);
    path.unshift({ id: meta.id, name: meta.name });
    currentId = meta.parents[0];
  }

  path.unshift({ id: rootFolderId, name: "Atlas" });
  return path;
}

export async function isFolder(id: string) {
  return (await getNodeMeta(id)).mimeType === FOLDER_MIME;
}

export async function listFolder(folderId: string): Promise<DriveItem[]> {
  assertId(folderId);
  const drive = await getDriveClient();
  const items: DriveItem[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken, files(${ITEM_FIELDS})`,
      orderBy: "folder, name",
      pageSize: 1000,
      pageToken,
    });
    items.push(...(data.files || []).map(toItem));
    pageToken = data.nextPageToken || undefined;
  } while (pageToken && items.length < 10_000);

  return items;
}

export async function getFileMetadata(fileId: string) {
  assertId(fileId);
  const drive = await getDriveClient();
  const { data } = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, modifiedTime, parents, trashed",
  });
  return data;
}

const EXPORTS: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: "pptx",
  },
  "application/vnd.google-apps.drawing": { mime: "application/pdf", ext: "pdf" },
};

function header(headers: unknown, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name) ?? undefined;
  const value = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(value) ? value[0] : value;
}

export function toWebStream(data: unknown): ReadableStream<Uint8Array> {
  if (data instanceof ReadableStream) return data;
  return Readable.toWeb(data as Readable) as unknown as ReadableStream<Uint8Array>;
}

/**
 * Opens a file for streaming. Google Docs are exported (to PDF when `preview`),
 * binary files honour HTTP Range so video/audio can seek.
 */
export async function openFileStream(
  fileId: string,
  options: { preview?: boolean; range?: string | null } = {}
) {
  const drive = await getDriveClient();
  const { data: meta } = await drive.files.get({ fileId, fields: "id, name, mimeType" });
  const mimeType = meta.mimeType || "application/octet-stream";
  const name = meta.name || "arquivo";

  if (mimeType.startsWith("application/vnd.google-apps.")) {
    if (mimeType === FOLDER_MIME) throw new Error("Pastas não podem ser baixadas");
    const target = options.preview
      ? { mime: "application/pdf", ext: "pdf" }
      : EXPORTS[mimeType] || { mime: "application/pdf", ext: "pdf" };
    const res = await drive.files.export(
      { fileId, mimeType: target.mime },
      { responseType: "stream" }
    );
    return {
      body: toWebStream(res.data),
      mimeType: target.mime,
      name: `${name}.${target.ext}`,
      status: 200,
      rangeable: false,
    };
  }

  const res = await drive.files.get(
    { fileId, alt: "media" },
    {
      responseType: "stream",
      headers: options.range ? { Range: options.range } : undefined,
    }
  );

  return {
    body: toWebStream(res.data),
    mimeType,
    name,
    status: res.status === 206 ? 206 : 200,
    rangeable: true,
    contentLength: header(res.headers, "content-length"),
    contentRange: header(res.headers, "content-range"),
  };
}

export async function getThumbnail(fileId: string, size: number) {
  const drive = await getDriveClient();
  const { data } = await drive.files.get({ fileId, fields: "thumbnailLink" });
  if (!data.thumbnailLink) return null;

  const url = data.thumbnailLink.replace(/=s\d+$/, `=s${size}`);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok || !res.body) return null;
  return { body: res.body, contentType: res.headers.get("content-type") || "image/jpeg" };
}

export async function createUploadSession(
  parentId: string,
  name: string,
  mimeType: string,
  size: number,
  origin: string
): Promise<string> {
  await getDriveClient();
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType || "application/octet-stream",
        "X-Upload-Content-Length": String(size),
        Origin: origin,
      },
      body: JSON.stringify({ name, parents: [parentId] }),
    }
  );
  const location = res.headers.get("location");
  if (!res.ok || !location) throw new Error(`Falha ao iniciar upload (${res.status})`);
  folderIndex = null;
  return location;
}

export async function createFolder(parentId: string, folderName: string) {
  const drive = await getDriveClient();
  const { data } = await drive.files.create({
    requestBody: { name: folderName, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: ITEM_FIELDS,
  });
  folderIndex = null;
  return toItem(data);
}

export async function renameItem(fileId: string, newName: string) {
  const drive = await getDriveClient();
  const { data } = await drive.files.update({
    fileId,
    requestBody: { name: newName },
    fields: ITEM_FIELDS,
  });
  forget(fileId);
  return toItem(data);
}

export async function moveItem(fileId: string, newParentId: string, currentParentId: string) {
  const drive = await getDriveClient();
  const { data } = await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: currentParentId,
    fields: ITEM_FIELDS,
  });
  forget(fileId);
  return toItem(data);
}

export async function setTrashed(fileId: string, trashed: boolean) {
  const drive = await getDriveClient();
  await drive.files.update({ fileId, requestBody: { trashed } });
  forget(fileId);
}

/* Search: one listing of every folder gives ancestry for all results without per-item lookups. */

let folderIndex: { at: number; map: Map<string, { name: string; parent: string }> } | null = null;

async function getFolderIndex() {
  if (folderIndex && Date.now() - folderIndex.at < 60_000) return folderIndex.map;

  const drive = await getDriveClient();
  const map = new Map<string, { name: string; parent: string }>();
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const { data } = await drive.files.list({
      q: `mimeType = '${FOLDER_MIME}' and trashed = false`,
      fields: "nextPageToken, files(id, name, parents)",
      pageSize: 1000,
      pageToken,
    });
    for (const f of data.files || []) {
      map.set(f.id!, { name: f.name!, parent: f.parents?.[0] || "" });
    }
    pageToken = data.nextPageToken || undefined;
  } while (pageToken && ++pages < 50);

  folderIndex = { at: Date.now(), map };
  return map;
}

type Located = { item: DriveItem; parentChain: string[]; parentName: string };

function locate(files: drive_v3.Schema$File[], index: Map<string, { name: string; parent: string }>, rootFolderId: string) {
  const results: Located[] = [];
  for (const file of files) {
    const item = toItem(file);
    const parentId = item.parents?.[0];
    if (!parentId || item.id === rootFolderId) continue;

    const chain: string[] = [];
    let current = parentId;
    for (let depth = 0; current !== rootFolderId; depth++) {
      if (!current || depth > 64) break;
      chain.unshift(current);
      current = index.get(current)?.parent || "";
    }
    if (current !== rootFolderId) continue;
    chain.unshift(rootFolderId);

    results.push({
      item,
      parentChain: chain,
      parentName: parentId === rootFolderId ? "Atlas" : index.get(parentId)?.name || "",
    });
  }
  return results;
}

export async function searchFiles(query: string, rootFolderId: string) {
  const drive = await getDriveClient();
  const index = await getFolderIndex();
  const escaped = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

  const { data } = await drive.files.list({
    q: `name contains '${escaped}' and trashed = false`,
    fields: `files(${ITEM_FIELDS})`,
    orderBy: "modifiedTime desc",
    pageSize: 300,
  });
  return locate(data.files || [], index, rootFolderId);
}

/** Trashed items whose original folder still exists inside the Atlas root. */
export async function listTrashed(rootFolderId: string) {
  const drive = await getDriveClient();
  const index = await getFolderIndex();
  const { data } = await drive.files.list({
    q: "trashed = true",
    fields: `files(${ITEM_FIELDS}, trashedTime)`,
    pageSize: 500,
  });
  const trashedAt = new Map((data.files || []).map((f) => [f.id!, f.trashedTime || f.modifiedTime || ""]));
  return locate(data.files || [], index, rootFolderId)
    .map((r) => ({ ...r, trashedTime: trashedAt.get(r.item.id) || "" }))
    .sort((a, b) => b.trashedTime.localeCompare(a.trashedTime));
}
