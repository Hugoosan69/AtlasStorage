"use client";

import { jsPDF } from "jspdf";
import type { Receipt } from "@/types";

type ReceiptPdfData = Pick<
  Receipt,
  | "receipt_number"
  | "date"
  | "value"
  | "description"
  | "payer_type"
  | "payer_name"
  | "payer_cnpj"
  | "payer_cpf"
  | "recipient_name"
  | "recipient_cnpj"
>;

const PRIMARY = "#5D6D7E";
const SECONDARY = "#E8DAEF";

function brl(value: number) {
  return Number(value).toFixed(2).replace(".", ",");
}

/** Layout ported from recibo2pdf's gera_pdf.js. */
export function buildReceiptPdf(r: ReceiptPdfData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(PRIMARY);
  doc.rect(0, 0, pageWidth, 25, "F");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor("#FFFFFF");
  doc.text("RECIBO", pageWidth / 2, 17, { align: "center" });

  // Number and value
  doc.setFontSize(14);
  doc.setTextColor(PRIMARY);
  doc.text(`Nº ${String(r.receipt_number).padStart(6, "0")}`, pageWidth - 20, 38, { align: "right" });
  doc.setFontSize(26);
  doc.text(`R$ ${brl(r.value)}`, 20, 45);
  doc.setDrawColor(SECONDARY);
  doc.setLineWidth(0.5);
  doc.line(20, 48, pageWidth - 20, 48);

  // Body
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor("#000000");
  const payerDocument =
    r.payer_type === "fisica"
      ? `CPF ${r.payer_cpf || "não informado"}`
      : `CNPJ ${r.payer_cnpj || "não informado"}`;
  const body =
    `Recebi(emos) de ${r.payer_name || "(Nome do pagador não informado)"}, inscrito sob o ${payerDocument}, ` +
    `o valor de R$ ${brl(r.value)} (${valorPorExtenso(r.value)}), ` +
    `referente a ${r.description.replace(/\s+/g, " ").trim() || "(descrição não informada)"}.`;
  doc.text(body, 20, 65, { align: "justify", maxWidth: pageWidth - 40 });
  // Long descriptions push the closing lines down instead of overlapping them.
  const bodyLines = doc.splitTextToSize(body, pageWidth - 40).length;
  const closingY = Math.max(100, 65 + bodyLines * 5 + 15);
  doc.text("Para clareza, firmamos o presente.", 20, closingY);
  doc.text(`Data: Emitido em ${new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR")}`, 20, closingY + 10);

  // Signature
  const signatureY = Math.max(150, closingY + 50);
  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.2);
  doc.line(40, signatureY, pageWidth - 40, signatureY);
  doc.setFontSize(10);
  doc.setTextColor(PRIMARY);
  doc.text(r.recipient_name || "_________________________", pageWidth / 2, signatureY + 5, { align: "center" });
  doc.text("(Emitente)", pageWidth / 2, signatureY + 10, { align: "center" });
  if (r.recipient_cnpj) {
    doc.text(`CNPJ: ${r.recipient_cnpj}`, pageWidth / 2, signatureY + 15, { align: "center" });
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFillColor(PRIMARY);
  doc.rect(0, footerY - 5, pageWidth, 25, "F");
  doc.setTextColor("#FFFFFF");
  doc.text(
    `Recibo gerado por ${r.recipient_name || "ReciboGS"} - ${new Date().toLocaleDateString("pt-BR")}`,
    pageWidth / 2,
    footerY + 2,
    { align: "center" }
  );

  return doc;
}

/** Opens the PDF in a new tab; falls back to a download when the popup is blocked. */
export function openReceiptPdf(r: ReceiptPdfData, target?: Window | null) {
  const doc = buildReceiptPdf(r);
  const url = URL.createObjectURL(doc.output("blob"));
  const win = target ?? window.open("", "_blank");
  if (win) {
    win.location.href = url;
  } else {
    doc.save(`recibo_${r.receipt_number}.pdf`);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_ESPECIAL = ["dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
const ESCALAS: [string, string][] = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];

function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (c) parts.push(CENTENAS[c]);
  if (d === 1) parts.push(DEZ_ESPECIAL[u]);
  else {
    if (d) parts.push(DEZENAS[d]);
    if (u) parts.push(UNIDADES[u]);
  }
  return parts.join(" e ");
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "";
  const grupos: number[] = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) grupos.push(x % 1000);
  let out = "";
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    let part: string;
    if (i === 0) part = ate999(g);
    else if (i === 1) part = g === 1 ? "mil" : `${ate999(g)} mil`;
    else part = `${ate999(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`;
    // "dois mil e cem", "dois mil e cinquenta", but "dois mil cento e cinquenta"
    if (out) out += g < 100 || g % 100 === 0 ? " e " : " ";
    out += part;
  }
  return out;
}

/** Ex: 125.50 -> "cento e vinte e cinco reais e cinquenta centavos" */
export function valorPorExtenso(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const cents = Math.round(n * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;

  const unit = reais === 1 ? "real" : reais % 1_000_000 === 0 ? "de reais" : "reais";
  const r = reais ? `${inteiroPorExtenso(reais)} ${unit}` : "";
  const c = centavos ? `${ate999(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  if (r && c) return `${r} e ${c}`;
  return r || c || "zero reais";
}
