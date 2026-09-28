import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { searchFiles } from "@/lib/google-drive";
import { getUserPermissions } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const rootFolderId = await getRootFolderId();

    const query = new URL(request.url).searchParams.get("q");
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Pesquisa deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    const files = await searchFiles(query, rootFolderId);
    if (user.role === "admin") return NextResponse.json({ files });

    const viewCache = new Map<string, boolean>();
    const canView = async (folderId: string) => {
      if (!viewCache.has(folderId)) {
        const perms = await getUserPermissions(user.id, folderId, rootFolderId);
        viewCache.set(folderId, perms.can_view);
      }
      return viewCache.get(folderId)!;
    };

    const visible = [];
    for (const file of files) {
      const target = file.isFolder ? file.id : file.parents?.[0] || rootFolderId;
      if (await canView(target)) visible.push(file);
    }
    return NextResponse.json({ files: visible });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
