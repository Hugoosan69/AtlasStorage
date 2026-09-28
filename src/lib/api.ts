import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function googleStatus(error: unknown): number | undefined {
  const e = error as { status?: number; code?: number | string; response?: { status?: number } };
  const status = e?.response?.status ?? e?.status ?? (typeof e?.code === "number" ? e.code : undefined);
  return typeof status === "number" ? status : undefined;
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error
      ? error.message
      : (error as { message?: string })?.message || "Erro interno do servidor";
  if (message === "Unauthorized") return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
  if (message === "Forbidden") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const status = googleStatus(error);
  if (status === 404) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  if (status === 403 && /rate|quota/i.test(message)) {
    return NextResponse.json({ error: "Limite do Google Drive atingido, tente em instantes" }, { status: 429 });
  }

  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function validName(value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) throw new HttpError(400, "Informe um nome");
  if (name.length > 255) throw new HttpError(400, "Nome muito longo");
  return name;
}
