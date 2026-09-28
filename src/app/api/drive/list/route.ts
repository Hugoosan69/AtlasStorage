import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { listFolder, getFolderPath } from "@/lib/google-drive";
import { getUserPermissions } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || rootFolderId;
    const pageToken = searchParams.get("pageToken") || undefined;

    const permissions = await getUserPermissions(
      user.id,
      folderId,
      rootFolderId
    );

    if (!permissions.can_view) {
      return NextResponse.json(
        { error: "Sem permissão para acessar esta pasta" },
        { status: 403 }
      );
    }

    const [result, breadcrumb] = await Promise.all([
      listFolder(folderId, pageToken),
      getFolderPath(folderId, rootFolderId),
    ]);

    const visibleFiles = [];
    for (const file of result.files) {
      if (file.isFolder) {
        const folderPerms = await getUserPermissions(
          user.id,
          file.id,
          rootFolderId
        );
        if (folderPerms.can_view) {
          visibleFiles.push(file);
        }
      } else {
        visibleFiles.push(file);
      }
    }

    return NextResponse.json({
      files: visibleFiles,
      nextPageToken: result.nextPageToken,
      breadcrumb,
      permissions,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
