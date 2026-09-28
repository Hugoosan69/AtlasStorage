import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { searchFiles } from "@/lib/google-drive";
import { canSeeFolder, loadAccess, resolve } from "@/lib/permissions";
import { errorResponse, HttpError } from "@/lib/api";
import { thumbnailUrl } from "@/lib/sign";
import type { DriveItem } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootId = await getRootFolderId();

    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query || query.length < 2) {
      throw new HttpError(400, "Pesquisa deve ter pelo menos 2 caracteres");
    }

    const [results, access] = await Promise.all([
      searchFiles(query, rootId),
      loadAccess(user, rootId),
    ]);

    const files: DriveItem[] = [];
    for (const { item, parentChain, parentName } of results) {
      const visible = item.isFolder
        ? await canSeeFolder(access, [...parentChain, item.id])
        : resolve(access, parentChain).can_view;
      if (!visible) continue;
      files.push({
        ...item,
        thumb: item.hasThumbnail ? thumbnailUrl(item.id) : undefined,
        parentId: parentChain[parentChain.length - 1],
        parentName,
      });
    }

    return NextResponse.json({ files });
  } catch (error) {
    return errorResponse(error);
  }
}
