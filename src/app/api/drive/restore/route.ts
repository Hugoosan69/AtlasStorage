import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { setTrashed } from "@/lib/google-drive";
import { itemAccess } from "@/lib/access";
import { logAction } from "@/lib/audit";
import { errorResponse, HttpError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { fileId } = await request.json();

    const ctx = await itemAccess(user, fileId);
    const allowed = ctx.isFolder ? ctx.permissions.can_delete_folders : ctx.permissions.can_delete_files;
    if (!allowed) throw new HttpError(403, "Sem permissão para restaurar");

    await setTrashed(ctx.meta.id!, false);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: ctx.isFolder ? "folder.restore" : "file.restore",
      targetDriveId: ctx.meta.id!,
      targetName: ctx.meta.name!,
      targetParentId: ctx.parentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
