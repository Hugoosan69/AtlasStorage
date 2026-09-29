import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorResponse, HttpError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { current, next } = await request.json();
    if (typeof current !== "string" || !current) throw new HttpError(400, "Informe a senha atual");
    if (typeof next !== "string" || next.length < 6) {
      throw new HttpError(400, "A nova senha precisa ter pelo menos 6 caracteres");
    }
    if (next === current) throw new HttpError(400, "A nova senha deve ser diferente da atual");

    // Verify the current password with a throwaway client so the browser session is untouched.
    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { error: wrong } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
    if (wrong) throw new HttpError(400, "Senha atual incorreta");

    const service = await createServiceClient();
    const { error } = await service.auth.admin.updateUserById(user.auth_id!, { password: next });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
