import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { createFolder } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const { parentId, name } = await request.json();

    if (!parentId || !name) {
      return NextResponse.json(
        { error: "parentId e name são obrigatórios" },
        { status: 400 }
      );
    }

    const canCreate = await checkPermission(
      user.id,
      parentId,
      "can_create_folder",
      rootFolderId
    );

    if (!canCreate) {
      return NextResponse.json(
        { error: "Sem permissão para criar pastas" },
        { status: 403 }
      );
    }

    const result = await createFolder(parentId, name);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: "folder.create",
      targetDriveId: result.id!,
      targetName: name,
      targetParentId: parentId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
