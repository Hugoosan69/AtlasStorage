import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { getFolderPath, isFolder, listFolder } from "@/lib/google-drive";
import { canSeeFolder, loadAccess, resolve } from "@/lib/permissions";
import { errorResponse, HttpError } from "@/lib/api";
import { thumbnailUrl } from "@/lib/sign";
import type { DriveItem, FolderListing } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootId = await getRootFolderId();
    const folderId = request.nextUrl.searchParams.get("folderId") || rootId;

    const [path, access] = await Promise.all([
      getFolderPath(folderId, rootId),
      loadAccess(user, rootId),
    ]);
    if (!path || !(await isFolder(folderId))) throw new HttpError(404, "Pasta não encontrada");

    const chain = path.map((p) => p.id);
    const permissions = resolve(access, chain);
    if (!(await canSeeFolder(access, chain))) {
      throw new HttpError(403, "Você não tem acesso a esta pasta");
    }

    const items = await listFolder(folderId);
    const files: DriveItem[] = [];
    for (const item of items) {
      const visible = item.isFolder
        ? await canSeeFolder(access, [...chain, item.id])
        : permissions.can_view;
      if (!visible) continue;
      files.push(item.hasThumbnail ? { ...item, thumb: thumbnailUrl(item.id) } : item);
    }

    const body: FolderListing = {
      folder: path[path.length - 1],
      breadcrumb: path,
      permissions,
      limited: !permissions.can_view,
      files,
    };
    return NextResponse.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
