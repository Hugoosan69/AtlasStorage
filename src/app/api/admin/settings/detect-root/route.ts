import { NextResponse } from "next/server";
import { requireAdmin, clearRootFolderCache } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { autoDetectRootFolder } from "@/lib/google-drive";

export async function POST() {
  try {
    await requireAdmin();

    const id = await autoDetectRootFolder();
    if (!id) {
      return NextResponse.json(
        { error: "Nenhuma pasta chamada 'atlas' foi encontrada no Google Drive." },
        { status: 404 }
      );
    }

    const supabase = await createServiceClient();
    await supabase
      .from("settings")
      .upsert(
        {
          key: "root_folder_id",
          value: id,
          description: "Pasta raiz do Google Drive (auto-detectada)",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    clearRootFolderCache();

    return NextResponse.json({ id, name: "atlas" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
