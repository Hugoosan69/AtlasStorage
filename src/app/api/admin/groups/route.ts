import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorResponse, HttpError } from "@/lib/api";

function validName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 60) throw new HttpError(400, "Informe um nome de até 60 caracteres");
  return name;
}

async function setMembers(groupId: string, members: unknown) {
  if (!Array.isArray(members)) return;
  const ids = [...new Set(members.filter((m): m is string => typeof m === "string"))];
  const supabase = await createServiceClient();
  const { error: delError } = await supabase.from("user_groups").delete().eq("group_id", groupId);
  if (delError) throw delError;
  if (ids.length) {
    const { error } = await supabase.from("user_groups").insert(ids.map((user_id) => ({ user_id, group_id: groupId })));
    if (error) throw error;
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const [{ data: groups, error }, { data: links }] = await Promise.all([
      supabase.from("groups").select("id, name, description").order("name"),
      supabase.from("user_groups").select("user_id, group_id"),
    ]);
    if (error) throw error;
    return NextResponse.json(
      (groups || []).map((g) => ({
        ...g,
        members: (links || []).filter((l) => l.group_id === g.id).map((l) => l.user_id),
      }))
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: validName(body.name), description: typeof body.description === "string" ? body.description.trim() : null })
      .select()
      .single();
    if (error) throw error;
    await setMembers(data.id, body.members);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (!body.id) throw new HttpError(400, "id é obrigatório");
    const supabase = await createServiceClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = validName(body.name);
    if (body.description !== undefined) updates.description = typeof body.description === "string" ? body.description.trim() : null;
    const { error } = await supabase.from("groups").update(updates).eq("id", body.id);
    if (error) throw error;
    await setMembers(body.id, body.members);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new HttpError(400, "id é obrigatório");
    const supabase = await createServiceClient();
    await supabase.from("permissions").delete().eq("group_id", id);
    await supabase.from("user_groups").delete().eq("group_id", id);
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
