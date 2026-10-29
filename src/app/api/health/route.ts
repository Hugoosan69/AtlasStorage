import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("settings").select("key").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", ts: Date.now() });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
