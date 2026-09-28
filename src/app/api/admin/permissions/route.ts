import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

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

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("permissions")
      .insert(body)
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

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
    }

    const { error } = await supabase.from("permissions").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
