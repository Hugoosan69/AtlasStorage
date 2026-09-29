import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { openFileStream } from "@/lib/google-drive";
import { itemAccess } from "@/lib/access";
import { logAction } from "@/lib/audit";
import { errorResponse, HttpError } from "@/lib/api";

const INLINE_SAFE = /^(image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)|video\/|audio\/|application\/pdf$)/;

function disposition(type: "inline" | "attachment", name: string) {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * GET ?fileId=…            download (needs can_download)
 * GET ?fileId=…&inline=1   in-browser preview (needs can_view)
 * GET ?fileId=…&check=1    permission check only, so the UI can report errors before navigating
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const params = request.nextUrl.searchParams;
    const inline = params.get("inline") === "1";

    const ctx = await itemAccess(user, params.get("fileId"));
    if (ctx.isFolder || ctx.meta.trashed) throw new HttpError(404, "Arquivo não encontrado");

    const allowed = inline ? ctx.permissions.can_view : ctx.permissions.can_download;
    if (!allowed) {
      throw new HttpError(403, inline ? "Sem permissão para visualizar" : "Sem permissão para baixar");
    }
    if (params.get("check") === "1") return NextResponse.json({ ok: true });

    const range = inline ? request.headers.get("range") : null;
    const file = await openFileStream(ctx.meta.id!, { preview: inline, range });

    if (!range || /^bytes=0-/.test(range)) {
      await logAction({
        userId: user.id,
        userEmail: user.username,
        action: inline ? "file.view" : "file.download",
        targetDriveId: ctx.meta.id!,
        targetName: ctx.meta.name!,
        targetParentId: ctx.parentId,
      });
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });

    if (inline) {
      // User content is served from our origin: never let it run as a document.
      const type = INLINE_SAFE.test(file.mimeType) ? file.mimeType : "text/plain; charset=utf-8";
      headers.set("Content-Type", type);
      headers.set("Content-Disposition", disposition("inline", file.name));
      if (type !== "application/pdf") {
        headers.set("Content-Security-Policy", "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'");
      }
    } else {
      headers.set("Content-Type", file.mimeType);
      headers.set("Content-Disposition", disposition("attachment", file.name));
    }

    if (file.rangeable) headers.set("Accept-Ranges", "bytes");
    if (file.contentLength) headers.set("Content-Length", file.contentLength);
    if (file.contentRange) headers.set("Content-Range", file.contentRange);

    return new Response(file.body, { status: file.status, headers });
  } catch (error) {
    return errorResponse(error);
  }
}
