import { NextRequest, NextResponse } from "next/server";
import { clearRootFolderCache, requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorResponse, HttpError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from("settings").select("*").order("key");
    if (error) throw error;
    return NextResponse.json(
      (data || []).map((s) =>
        s.key === "google_refresh_token" ? { ...s, value: s.value ? "••••••••" : "" } : s
      )
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const { key, value } = await request.json();

    if (typeof key !== "string" || !key || key === "google_refresh_token") {
      throw new HttpError(400, "Configuração inválida");
    }

    const { error } = await supabase
      .from("settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;

    if (key === "root_folder_id") clearRootFolderCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
