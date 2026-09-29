import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorResponse, HttpError } from "@/lib/api";

function validRole(role: unknown) {
  if (role === undefined) return undefined;
  if (role !== "admin" && role !== "user") throw new HttpError(400, "Perfil inválido");
  return role;
}

function validUsername(value: unknown) {
  const username = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new HttpError(400, "Usuário deve ter 3 a 30 caracteres: letras, números, ponto, hífen ou _");
  }
  return username;
}

function friendlyDbError(error: { code?: string; message?: string }) {
  if (error.code === "23505") return new HttpError(400, "Este nome de usuário já está em uso");
  return error;
}

function validPassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpError(400, "A senha precisa ter pelo menos 6 caracteres");
  }
  return password;
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const [{ data, error }, { data: authData }] = await Promise.all([
      supabase.from("users").select("*").order("name"),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (error) throw error;

    const lastSeen = new Map((authData?.users || []).map((u) => [u.id, u.last_sign_in_at ?? null]));
    return NextResponse.json(
      (data || []).map((u) => ({ ...u, last_sign_in_at: lastSeen.get(u.auth_id) ?? null }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();

    const username = validUsername(body.username);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) throw new HttpError(400, "Nome é obrigatório");
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim().toLowerCase()
        : `${username}@usuarios.atlas-storage.local`;

    const { data: taken } = await supabase.from("users").select("id").eq("username", username).maybeSingle();
    if (taken) throw new HttpError(400, "Este nome de usuário já está em uso");
    const password = validPassword(body.password);
    const role = validRole(body.role) || "user";

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) {
      throw new HttpError(
        400,
        /already|registered|exists/i.test(authError.message)
          ? "Este email já está em uso"
          : authError.message
      );
    }

    const { data, error } = await supabase
      .from("users")
      .insert({ auth_id: authData.user.id, username, email, name, role })
      .select()
      .single();

    if (error) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw friendlyDbError(error);
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const supabase = await createServiceClient();
    const { id, name, role, is_active, password, username } = await request.json();

    if (!id) throw new HttpError(400, "id é obrigatório");
    const newRole = validRole(role);
    if (id === admin.id && (newRole === "user" || is_active === false)) {
      throw new HttpError(400, "Você não pode remover seu próprio acesso de administrador");
    }

    const { data: target, error: findError } = await supabase
      .from("users")
      .select("auth_id")
      .eq("id", id)
      .single();
    if (findError || !target) throw new HttpError(404, "Usuário não encontrado");

    if (password) {
      const { error: pwError } = await supabase.auth.admin.updateUserById(target.auth_id, {
        password: validPassword(password),
      });
      if (pwError) throw pwError;
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (newRole) updates.role = newRole;
    if (username !== undefined) updates.username = validUsername(username);
    if (typeof is_active === "boolean") updates.is_active = is_active;

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw friendlyDbError(error);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
