import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { deleteItem, getFileMetadata } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId é obrigatório" },
        { status: 400 }
      );
    }

    const metadata = await getFileMetadata(fileId);
    const parentId = metadata.parents?.[0] || rootFolderId;
    const isFolder =
      metadata.mimeType === "application/vnd.google-apps.folder";
    const permission = isFolder ? "can_delete_folders" : "can_delete_files";

    const canDelete = await checkPermission(
      user.id,
      parentId,
      permission,
      rootFolderId
    );

    if (!canDelete) {
      return NextResponse.json(
        { error: "Sem permissão para excluir" },
        { status: 403 }
      );
    }

    await deleteItem(fileId);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: isFolder ? "folder.delete" : "file.delete",
      targetDriveId: fileId,
      targetName: metadata.name!,
      targetParentId: parentId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
