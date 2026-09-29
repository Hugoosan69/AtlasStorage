import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const invalid = () => NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({}));
  if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
    return invalid();
  }

  const service = await createServiceClient();
  const { data: user } = await service
    .from("users")
    .select("email, is_active")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (!user?.email || !user.is_active) return invalid();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) return invalid();

  return NextResponse.json({ ok: true });
}
