import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { uploadFile } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const parentId = formData.get("parentId") as string | null;

    if (!file || !parentId) {
      return NextResponse.json(
        { error: "file e parentId são obrigatórios" },
        { status: 400 }
      );
    }

    const canUpload = await checkPermission(
      user.id,
      parentId,
      "can_upload",
      rootFolderId
    );

    if (!canUpload) {
      return NextResponse.json(
        { error: "Sem permissão para upload" },
        { status: 403 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    const result = await uploadFile(parentId, file.name, file.type, stream);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: "file.upload",
      targetDriveId: result.id!,
      targetName: file.name,
      targetParentId: parentId,
      details: { size: file.size, mimeType: file.type },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
