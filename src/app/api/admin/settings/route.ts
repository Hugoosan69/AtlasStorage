import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

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
    const message =
      error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const { key, value } = await request.json();

    if (!key || key === "google_refresh_token") {
      return NextResponse.json(
        { error: "key é obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
