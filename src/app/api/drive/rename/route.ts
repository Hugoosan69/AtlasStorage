import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { renameItem } from "@/lib/google-drive";
import { itemAccess } from "@/lib/access";
import { logAction } from "@/lib/audit";
import { errorResponse, HttpError, validName } from "@/lib/api";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const { fileId, newName } = await request.json();
    const name = validName(newName);

    const ctx = await itemAccess(user, fileId);
    const allowed = ctx.isFolder ? ctx.permissions.can_rename_folders : ctx.permissions.can_rename_files;
    if (!allowed) throw new HttpError(403, "Sem permissão para renomear");

    const result = await renameItem(fileId, name);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: ctx.isFolder ? "folder.rename" : "file.rename",
      targetDriveId: fileId,
      targetName: name,
      targetParentId: ctx.parentId,
      details: { oldName: ctx.meta.name },
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
