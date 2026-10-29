import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse, HttpError } from "@/lib/api";

interface Company {
  name: string;
  address: string;
}

function joinAddress(p: {
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  uf?: string;
}) {
  let address = `${p.street || ""}, ${p.number || ""}`;
  if (p.complement) address += ` - ${p.complement}`;
  address += ` - ${p.district || ""}, ${p.city || ""} - ${p.uf || ""}`;
  return address;
}

async function fromBrasilApi(cnpj: string): Promise<Company | null> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const d = await res.json();
  return {
    name: d.razao_social || "",
    address: joinAddress({
      street: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" "),
      number: d.numero,
      complement: d.complemento,
      district: d.bairro,
      city: d.municipio,
      uf: d.uf,
    }),
  };
}

// The original recibo2pdf used ReceitaWS; kept as a fallback.
async function fromReceitaWs(cnpj: string): Promise<Company | null> {
  const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const d = await res.json();
  if (d.status === "ERROR") return null;
  return {
    name: d.nome || "",
    address: joinAddress({
      street: d.logradouro,
      number: d.numero,
      complement: d.complemento,
      district: d.bairro,
      city: d.municipio,
      uf: d.uf,
    }),
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();
    const cnpj = (request.nextUrl.searchParams.get("cnpj") || "").replace(/\D/g, "");
    if (cnpj.length !== 14) throw new HttpError(400, "CNPJ inválido");

    for (const lookup of [fromBrasilApi, fromReceitaWs]) {
      const company = await lookup(cnpj).catch(() => null);
      if (company?.name) return NextResponse.json(company);
    }
    throw new HttpError(404, "CNPJ não encontrado ou serviço indisponível");
  } catch (error) {
    return errorResponse(error);
  }
}
