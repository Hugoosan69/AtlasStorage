import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isFolder, moveItem } from "@/lib/google-drive";
import { itemAccess } from "@/lib/access";
import { getChain, resolve } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { errorResponse, HttpError } from "@/lib/api";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const { fileId, newParentId } = await request.json();
    if (typeof newParentId !== "string" || !newParentId) throw new HttpError(400, "Destino não informado");

    const ctx = await itemAccess(user, fileId);
    if (newParentId === ctx.parentId) throw new HttpError(400, "O item já está nesta pasta");

    const targetChain = await getChain(newParentId, ctx.rootId);
    if (!targetChain || !(await isFolder(newParentId))) throw new HttpError(404, "Pasta de destino não encontrada");
    if (targetChain.includes(fileId)) {
      throw new HttpError(400, "Não é possível mover uma pasta para dentro dela mesma");
    }

    const canTake = ctx.isFolder ? ctx.permissions.can_move_folders : ctx.permissions.can_move_files;
    if (!canTake) throw new HttpError(403, "Sem permissão para mover este item");
    if (!resolve(ctx.access, targetChain).can_upload) {
      throw new HttpError(403, "Sem permissão para adicionar itens na pasta de destino");
    }

    const result = await moveItem(fileId, newParentId, ctx.parentId);

    await logAction({
      userId: user.id,
      userEmail: user.username,
      action: ctx.isFolder ? "folder.move" : "file.move",
      targetDriveId: fileId,
      targetName: ctx.meta.name!,
      targetParentId: newParentId,
      details: { fromParent: ctx.parentId },
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
