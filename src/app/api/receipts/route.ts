import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorResponse, HttpError } from "@/lib/api";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const optional = (v: unknown) => str(v) || null;

function receiptFields(body: Record<string, unknown>) {
  const value = Number(body.value);
  if (!Number.isFinite(value) || value <= 0) throw new HttpError(400, "O valor do recibo deve ser positivo");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(body.date))) throw new HttpError(400, "Data inválida");
  const payer_name = str(body.payer_name);
  if (!payer_name) throw new HttpError(400, "Informe o nome do pagador");
  const payer_type = body.payer_type === "fisica" ? "fisica" : "juridica";

  return {
    date: str(body.date),
    value: Math.round(value * 100) / 100,
    description: str(body.description),
    payer_type,
    payer_name,
    payer_cnpj: payer_type === "juridica" ? optional(body.payer_cnpj) : null,
    payer_cpf: payer_type === "fisica" ? optional(body.payer_cpf) : null,
    payer_address: optional(body.payer_address),
  };
}

export async function GET() {
  try {
    await requireUser();
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .order("receipt_number", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();
    const fields = receiptFields(body);
    const recipient_name = str(body.recipient_name);
    if (!recipient_name) throw new HttpError(400, "Informe o nome do emitente");

    // The number is assigned here, not by the client, so two concurrent emissions can't collide.
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: last } = await supabase
        .from("receipts")
        .select("receipt_number")
        .order("receipt_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase
        .from("receipts")
        .insert({
          ...fields,
          receipt_number: (last?.receipt_number ?? 0) + 1,
          recipient_name,
          recipient_cnpj: optional(body.recipient_cnpj),
          created_by: user.id,
        })
        .select()
        .single();

      if (!error) return NextResponse.json(data, { status: 201 });
      if (error.code !== "23505") throw error;
    }
    throw new HttpError(409, "Não foi possível reservar um número de recibo, tente novamente");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();
    if (!body.id) throw new HttpError(400, "id é obrigatório");

    // Issuer and number stay as originally emitted.
    const { data, error } = await supabase
      .from("receipts")
      .update({ ...receiptFields(body), updated_at: new Date().toISOString() })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
