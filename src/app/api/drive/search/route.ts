import { NextRequest, NextResponse } from "next/server";
import { requireUser, getRootFolderId } from "@/lib/auth";
import { searchFiles } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    void user;
    const rootFolderId = await getRootFolderId();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Pesquisa deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    const files = await searchFiles(query, rootFolderId);
    return NextResponse.json({ files });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
