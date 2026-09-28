import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { moveItem, getFileMetadata } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const { fileId, newParentId } = await request.json();

    if (!fileId || !newParentId) {
      return NextResponse.json(
        { error: "fileId e newParentId são obrigatórios" },
        { status: 400 }
      );
    }

    const metadata = await getFileMetadata(fileId);
    const currentParentId = metadata.parents?.[0] || rootFolderId;
    const isFolder =
      metadata.mimeType === "application/vnd.google-apps.folder";
    const permission = isFolder ? "can_move_folders" : "can_move_files";

    const [canMoveFrom, canMoveTo] = await Promise.all([
      checkPermission(user.id, currentParentId, permission, rootFolderId),
      checkPermission(user.id, newParentId, "can_upload", rootFolderId),
    ]);

    if (!canMoveFrom || !canMoveTo) {
      return NextResponse.json(
        { error: "Sem permissão para mover" },
        { status: 403 }
      );
    }

    const result = await moveItem(fileId, newParentId, currentParentId);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: isFolder ? "folder.move" : "file.move",
      targetDriveId: fileId,
      targetName: metadata.name!,
      targetParentId: newParentId,
      details: { fromParent: currentParentId },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
