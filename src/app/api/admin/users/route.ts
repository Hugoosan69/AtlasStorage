import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

    if (authError) throw authError;

    const { data, error } = await supabase
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email: body.email,
        name: body.name,
        role: body.role || "user",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const supabase = await createServiceClient();
    const { id, name, role, is_active, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }
    if (id === admin.id && (role === "user" || is_active === false)) {
      return NextResponse.json(
        { error: "Você não pode remover seu próprio acesso de admin" },
        { status: 400 }
      );
    }

    const { data: target, error: findError } = await supabase
      .from("users")
      .select("auth_id")
      .eq("id", id)
      .single();
    if (findError || !target) throw findError || new Error("Usuário não encontrado");

    if (password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(target.auth_id, {
        password,
      });
      if (pwError) throw pwError;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
