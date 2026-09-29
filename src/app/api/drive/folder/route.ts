import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createFolder, isFolder } from "@/lib/google-drive";
import { folderAccess } from "@/lib/access";
import { logAction } from "@/lib/audit";
import { errorResponse, HttpError, validName } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { parentId, name } = await request.json();
    const folderName = validName(name);

    const ctx = await folderAccess(user, parentId);
    if (!(await isFolder(parentId))) throw new HttpError(404, "Pasta não encontrada");
    if (!ctx.permissions.can_create_folder) throw new HttpError(403, "Sem permissão para criar pastas aqui");

    const folder = await createFolder(parentId, folderName);

    await logAction({
      userId: user.id,
      userEmail: user.username,
      action: "folder.create",
      targetDriveId: folder.id,
      targetName: folderName,
      targetParentId: parentId,
    });

    return NextResponse.json(folder);
  } catch (error) {
    return errorResponse(error);
  }
}
