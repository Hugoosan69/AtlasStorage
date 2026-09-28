import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createUploadSession, isFolder } from "@/lib/google-drive";
import { folderAccess } from "@/lib/access";
import { logAction } from "@/lib/audit";
import { errorResponse, HttpError, validName } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { parentId, name, mimeType, size } = await request.json();
    if (typeof size !== "number" || size < 0) throw new HttpError(400, "Tamanho inválido");
    const fileName = validName(name);

    const ctx = await folderAccess(user, parentId);
    if (!(await isFolder(parentId))) throw new HttpError(404, "Pasta não encontrada");
    if (!ctx.permissions.can_upload) throw new HttpError(403, "Sem permissão para enviar arquivos aqui");

    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const type = typeof mimeType === "string" && mimeType ? mimeType : "application/octet-stream";
    const uploadUrl = await createUploadSession(parentId, fileName, type, size, origin);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: "file.upload",
      targetName: fileName,
      targetParentId: parentId,
      details: { size, mimeType: type },
    });

    return NextResponse.json({ uploadUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
