import { getRootFolderId } from "./auth";
import { FOLDER_MIME, getFileMetadata } from "./google-drive";
import { getChain, loadAccess, resolve } from "./permissions";
import { HttpError } from "./api";
import type { AppUser } from "@/types";

/** Loads an item and the caller's permissions on the folder that contains it. */
export async function itemAccess(user: AppUser, fileId: unknown) {
  if (typeof fileId !== "string" || !fileId) throw new HttpError(400, "fileId é obrigatório");

  const rootId = await getRootFolderId();
  const [access, meta] = await Promise.all([loadAccess(user, rootId), getFileMetadata(fileId)]);
  const parentId = meta.parents?.[0];
  if (!parentId || meta.id === rootId) throw new HttpError(404, "Item não encontrado");

  const chain = await getChain(parentId, rootId);
  if (!chain) throw new HttpError(404, "Item não encontrado");

  return {
    rootId,
    access,
    meta,
    parentId,
    chain,
    permissions: resolve(access, chain),
    isFolder: meta.mimeType === FOLDER_MIME,
  };
}

/** Loads the caller's permissions on a folder inside the Atlas root. */
export async function folderAccess(user: AppUser, folderId: unknown) {
  if (typeof folderId !== "string" || !folderId) throw new HttpError(400, "Pasta não informada");

  const rootId = await getRootFolderId();
  const [access, chain] = await Promise.all([loadAccess(user, rootId), getChain(folderId, rootId)]);
  if (!chain) throw new HttpError(404, "Pasta não encontrada");

  return { rootId, access, chain, permissions: resolve(access, chain) };
}

export { FOLDER_MIME };
