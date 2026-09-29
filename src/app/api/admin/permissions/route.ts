import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const FLAGS = [
  "can_view",
  "can_download",
  "can_upload",
  "can_create_folder",
  "can_rename_files",
  "can_rename_folders",
  "can_move_files",
  "can_move_folders",
  "can_delete_files",
  "can_delete_folders",
  "inherit",
] as const;

function pickFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of FLAGS) if (typeof body[f] === "boolean") out[f] = body[f];
  if (typeof body.folder_name === "string") out.folder_name = body.folder_name;
  return out;
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message || "Erro interno";
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const groupId = searchParams.get("groupId");

    let query = supabase.from("permissions").select("*");
    if (userId) query = query.eq("user_id", userId);
    if (groupId) query = query.eq("group_id", groupId);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();

    if (!body.folder_drive_id || (!body.user_id && !body.group_id)) {
      return NextResponse.json(
        { error: "Pasta e usuário são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("permissions")
      .insert({
        ...pickFields(body),
        folder_drive_id: body.folder_drive_id,
        user_id: body.user_id || null,
        group_id: body.group_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const { data, error } = await supabase
      .from("permissions")
      .update({ ...pickFields(body), updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const { error } = await supabase.from("permissions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}
