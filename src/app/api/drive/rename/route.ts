import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { renameItem, getFileMetadata } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const { fileId, newName } = await request.json();

    if (!fileId || !newName) {
      return NextResponse.json(
        { error: "fileId e newName são obrigatórios" },
        { status: 400 }
      );
    }

    const metadata = await getFileMetadata(fileId);
    const parentId = metadata.parents?.[0] || rootFolderId;
    const isFolder =
      metadata.mimeType === "application/vnd.google-apps.folder";
    const permission = isFolder ? "can_rename_folders" : "can_rename_files";

    const canRename = await checkPermission(
      user.id,
      parentId,
      permission,
      rootFolderId
    );

    if (!canRename) {
      return NextResponse.json(
        { error: "Sem permissão para renomear" },
        { status: 403 }
      );
    }

    const oldName = metadata.name;
    const result = await renameItem(fileId, newName);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: isFolder ? "folder.rename" : "file.rename",
      targetDriveId: fileId,
      targetName: newName,
      targetParentId: parentId,
      details: { oldName },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
