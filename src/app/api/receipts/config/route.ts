import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { errorResponse, HttpError } from "@/lib/api";

const KEYS = {
  recipient_name: "receipt_recipient_name",
  recipient_cnpj: "receipt_recipient_cnpj",
} as const;

export async function GET() {
  try {
    await requireUser();
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", Object.values(KEYS));
    if (error) throw error;
    const get = (key: string) => data?.find((s) => s.key === key)?.value || "";
    return NextResponse.json({
      recipient_name: get(KEYS.recipient_name),
      recipient_cnpj: get(KEYS.recipient_cnpj),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();
    const body = await request.json();
    const name = typeof body.recipient_name === "string" ? body.recipient_name.trim() : "";
    const cnpj = typeof body.recipient_cnpj === "string" ? body.recipient_cnpj.trim() : "";
    if (!name) throw new HttpError(400, "Informe o nome do emitente");

    const now = new Date().toISOString();
    const { error } = await supabase.from("settings").upsert(
      [
        { key: KEYS.recipient_name, value: name, description: "Recibos: nome do emitente", updated_at: now },
        { key: KEYS.recipient_cnpj, value: cnpj, description: "Recibos: CNPJ/CPF do emitente", updated_at: now },
      ],
      { onConflict: "key" }
    );
    if (error) throw error;
    return NextResponse.json({ recipient_name: name, recipient_cnpj: cnpj });
  } catch (error) {
    return errorResponse(error);
  }
}
