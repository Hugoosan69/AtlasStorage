import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { createUploadSession } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const { parentId, name, mimeType, size } = await request.json();

    if (!parentId || !name || typeof size !== "number") {
      return NextResponse.json(
        { error: "parentId, name e size são obrigatórios" },
        { status: 400 }
      );
    }

    const canUpload = await checkPermission(user.id, parentId, "can_upload", rootFolderId);
    if (!canUpload) {
      return NextResponse.json({ error: "Sem permissão para upload" }, { status: 403 });
    }

    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const uploadUrl = await createUploadSession(parentId, name, mimeType, size, origin);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: "file.upload",
      targetName: name,
      targetParentId: parentId,
      details: { size, mimeType },
    });

    return NextResponse.json({ uploadUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
