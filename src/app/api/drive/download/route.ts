import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { downloadFile, getFileMetadata } from "@/lib/google-drive";
import { checkPermission } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { Readable } from "stream";

export async function GET(request: NextRequest) {
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

    const canDownload = await checkPermission(
      user.id,
      parentId,
      "can_download",
      rootFolderId
    );

    if (!canDownload) {
      return NextResponse.json(
        { error: "Sem permissão para download" },
        { status: 403 }
      );
    }

    const { stream, mimeType, name } = await downloadFile(fileId);

    await logAction({
      userId: user.id,
      userEmail: user.email,
      action: "file.download",
      targetDriveId: fileId,
      targetName: name,
      targetParentId: parentId,
    });

    const nodeStream = stream as unknown as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err: Error) => controller.error(err));
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
