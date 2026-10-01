import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro interno";
  const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const supabase = await createServiceClient();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("financial_transactions")
      .select("*")
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();

    if (!body.date || !body.type || !body.amount) {
      return NextResponse.json({ error: "Data, tipo e valor são obrigatórios" }, { status: 400 });
    }
    if (!["entrada", "saida_mercadoria", "saida_pessoal"].includes(body.type)) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    if (Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Valor deve ser maior que zero" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        date: body.date,
        type: body.type,
        amount: Number(body.amount),
        description: body.description || "",
        created_by: user.id,
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

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.date) updates.date = body.date;
    if (body.type) updates.type = body.type;
    if (body.amount !== undefined) updates.amount = Number(body.amount);
    if (body.description !== undefined) updates.description = body.description;

    const { data, error } = await supabase
      .from("financial_transactions")
      .update(updates)
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

    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(error);
  }
}
