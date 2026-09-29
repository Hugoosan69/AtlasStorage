import { NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { listTrashed } from "@/lib/google-drive";
import { loadAccess, resolve } from "@/lib/permissions";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const rootId = await getRootFolderId();
    const [trashed, access] = await Promise.all([listTrashed(rootId), loadAccess(user, rootId)]);

    const files = trashed
      .filter(({ item, parentChain }) => {
        const perms = resolve(access, parentChain);
        return item.isFolder ? perms.can_delete_folders : perms.can_delete_files;
      })
      .map(({ item, parentChain, parentName, trashedTime }) => ({
        ...item,
        parentId: parentChain[parentChain.length - 1],
        parentName,
        trashedTime,
      }));

    return NextResponse.json({ files });
  } catch (error) {
    return errorResponse(error);
  }
}
