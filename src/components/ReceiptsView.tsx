"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Pencil, Search, Settings, Receipt as ReceiptIcon, Loader2 } from "lucide-react";
import { api } from "@/lib/drive-client";
import { openReceiptPdf } from "@/lib/receipt-pdf";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import type { Receipt, ReceiptIssuer } from "@/types";

function fmtMoney(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function maskCnpj(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskCpf(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

interface FormData {
  id?: string;
  receipt_number?: number;
  date: string;
  value: string;
  description: string;
  payer_type: "juridica" | "fisica";
  payer_name: string;
  payer_cnpj: string;
  payer_cpf: string;
  payer_address: string;
  recipient_name: string;
  recipient_cnpj: string;
}

function emptyForm(issuer: ReceiptIssuer): FormData {
  return {
    date: today(),
    value: "",
    description: "",
    payer_type: "juridica",
    payer_name: "",
    payer_cnpj: "",
    payer_cpf: "",
    payer_address: "",
    recipient_name: issuer.recipient_name,
    recipient_cnpj: issuer.recipient_cnpj,
  };
}

function payerDocument(r: Receipt): string {
  return (r.payer_type === "fisica" ? r.payer_cpf : r.payer_cnpj) || "—";
}

export function ReceiptsView({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [issuer, setIssuer] = useState<ReceiptIssuer>({ recipient_name: "", recipient_cnpj: "" });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormData | null>(null);
  const [issuerForm, setIssuerForm] = useState<ReceiptIssuer | null>(null);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(() => {
    Promise.all([api<Receipt[]>("/api/receipts"), api<ReceiptIssuer>("/api/receipts/config")])
      .then(([list, cfg]) => {
        setReceipts(list);
        setIssuer(cfg);
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return receipts;
    return receipts.filter(
      (r) =>
        r.payer_name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        String(r.receipt_number).includes(term) ||
        payerDocument(r).includes(term)
    );
  }, [receipts, search]);

  const total = useMemo(() => filtered.reduce((s, r) => s + Number(r.value), 0), [filtered]);
  const nextNumber = (receipts[0]?.receipt_number ?? 0) + 1;

  async function lookupCnpj() {
    if (!form) return;
    const cnpj = form.payer_cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      toast("Informe um CNPJ completo", "error");
      return;
    }
    setLookingUp(true);
    try {
      const company = await api<{ name: string; address: string }>(`/api/receipts/cnpj?cnpj=${cnpj}`);
      setForm((f) => f && { ...f, payer_name: company.name, payer_address: company.address });
      toast("CNPJ encontrado", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    // Opened synchronously in the click handler so the browser doesn't block it as a popup.
    const pdfWindow = form.id ? null : window.open("", "_blank");
    setSaving(true);
    try {
      if (form.id) {
        await api<Receipt>("/api/receipts", { method: "PATCH", json: form });
        toast("Recibo atualizado", "success");
      } else {
        const created = await api<Receipt>("/api/receipts", { method: "POST", json: form });
        toast(`Recibo nº ${created.receipt_number} emitido`, "success");
        openReceiptPdf(created, pdfWindow);
      }
      setForm(null);
      load();
    } catch (err) {
      pdfWindow?.close();
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveIssuer(e: React.FormEvent) {
    e.preventDefault();
    if (!issuerForm) return;
    setSaving(true);
    try {
      const saved = await api<ReceiptIssuer>("/api/receipts/config", { method: "PATCH", json: issuerForm });
      setIssuer(saved);
      setIssuerForm(null);
      toast("Emitente salvo", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setSaving(false);
    }
  }

  function edit(r: Receipt) {
    setForm({
      id: r.id,
      receipt_number: r.receipt_number,
      date: r.date,
      value: Number(r.value).toFixed(2),
      description: r.description,
      payer_type: r.payer_type,
      payer_name: r.payer_name,
      payer_cnpj: r.payer_cnpj || "",
      payer_cpf: r.payer_cpf || "",
      payer_address: r.payer_address || "",
      recipient_name: r.recipient_name,
      recipient_cnpj: r.recipient_cnpj || "",
    });
  }

  const set = (patch: Partial<FormData>) => setForm((f) => f && { ...f, ...patch });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ReceiptIcon size={22} />
              Recibos
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              Emitente: {issuer.recipient_name || "não configurado"}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost" onClick={() => setIssuerForm(issuer)} title="Configurar emitente">
                <Settings size={16} /> Emitente
              </button>
              <button className="btn btn-primary" onClick={() => setForm(emptyForm(issuer))}>
                <Plus size={16} /> Novo recibo
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Recibos</div>
            <div className="text-lg font-bold">{filtered.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>Total</div>
            <div className="text-lg font-bold" style={{ color: "var(--success)" }}>{fmtMoney(total)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <input
            className="input pl-9"
            placeholder="Buscar por cliente, descrição, número ou documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--text-3)" }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center" style={{ color: "var(--text-3)" }}>
            <ReceiptIcon size={32} className="mx-auto mb-2 opacity-40" />
            <p>Nenhum recibo encontrado</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtered.map((r) => (
              <div key={r.id} className="file-row px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="font-mono text-xs shrink-0 w-14" style={{ color: "var(--text-2)" }}>
                  {String(r.receipt_number).padStart(6, "0")}
                </span>
                <span className="text-xs shrink-0 w-20 hidden sm:block" style={{ color: "var(--text-2)" }}>
                  {fmtDate(r.date)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{r.payer_name}</div>
                  <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                    <span className="sm:hidden">{fmtDate(r.date)} · </span>
                    {r.description || "—"}
                  </div>
                </div>
                <span className="text-xs shrink-0 hidden md:block" style={{ color: "var(--text-3)" }}>
                  {payerDocument(r)}
                </span>
                <span className="font-semibold tabular-nums shrink-0">{fmtMoney(r.value)}</span>
                <div className="flex gap-0.5 shrink-0">
                  <button className="btn btn-ghost btn-icon" onClick={() => openReceiptPdf(r)} title="Visualizar PDF">
                    <FileText size={15} />
                  </button>
                  {isAdmin && (
                    <button className="btn btn-ghost btn-icon" onClick={() => edit(r)} title="Editar recibo">
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt form */}
      <Modal
        open={!!form}
        title={form?.id ? `Editar recibo nº ${form.receipt_number}` : `Novo recibo nº ${nextNumber}`}
        onClose={() => setForm(null)}
        width="max-w-2xl"
      >
        {form && (
          <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto -mx-1 px-1">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>
                Pagador (cliente)
              </legend>
              <div className="flex gap-4 text-sm">
                {(["juridica", "fisica"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="payer_type"
                      checked={form.payer_type === t}
                      disabled={!!form.id}
                      onChange={() => set({ payer_type: t })}
                    />
                    {t === "juridica" ? "Pessoa Jurídica" : "Pessoa Física"}
                  </label>
                ))}
              </div>
              {form.payer_type === "juridica" ? (
                <div>
                  <label className="label">CNPJ do cliente</label>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      value={form.payer_cnpj}
                      onChange={(e) => set({ payer_cnpj: maskCnpj(e.target.value) })}
                      placeholder="00.000.000/0000-00"
                    />
                    <button
                      type="button"
                      className="btn shrink-0"
                      onClick={lookupCnpj}
                      disabled={lookingUp}
                      title="Buscar dados do CNPJ"
                    >
                      {lookingUp ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                      Buscar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="label">CPF do cliente</label>
                  <input
                    className="input"
                    value={form.payer_cpf}
                    onChange={(e) => set({ payer_cpf: maskCpf(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                </div>
              )}
              <div>
                <label className="label">Nome do cliente</label>
                <input
                  className="input"
                  value={form.payer_name}
                  onChange={(e) => set({ payer_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Endereço do cliente</label>
                <input
                  className="input"
                  value={form.payer_address}
                  onChange={(e) => set({ payer_address: e.target.value })}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>
                Detalhes do recibo
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="input"
                    value={form.value}
                    onChange={(e) => set({ value: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <label className="label">Data de emissão</label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(e) => set({ date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Descrição do serviço/produto</label>
                <textarea
                  className="input min-h-[72px]"
                  value={form.description}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="Ex: Impressão de 20 caixas personalizadas"
                  required
                />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-3)" }}>
                Emitente
              </legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Nome / Empresa</label>
                  <input
                    className="input"
                    value={form.recipient_name}
                    onChange={(e) => set({ recipient_name: e.target.value })}
                    disabled={!!form.id}
                    required
                  />
                </div>
                <div>
                  <label className="label">CNPJ / CPF</label>
                  <input
                    className="input"
                    value={form.recipient_cnpj}
                    onChange={(e) => set({ recipient_cnpj: e.target.value })}
                    disabled={!!form.id}
                  />
                </div>
              </div>
            </fieldset>

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando..." : form.id ? "Atualizar recibo" : "Salvar e gerar PDF"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Issuer config */}
      <Modal open={!!issuerForm} title="Emitente padrão" onClose={() => setIssuerForm(null)}>
        {issuerForm && (
          <form onSubmit={handleSaveIssuer} className="space-y-3">
            <p className="text-xs" style={{ color: "var(--text-2)" }}>
              Usado como emitente nos novos recibos.
            </p>
            <div>
              <label className="label">Nome / Empresa</label>
              <input
                className="input"
                value={issuerForm.recipient_name}
                onChange={(e) => setIssuerForm({ ...issuerForm, recipient_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">CNPJ / CPF</label>
              <input
                className="input"
                value={issuerForm.recipient_cnpj}
                onChange={(e) => setIssuerForm({ ...issuerForm, recipient_cnpj: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn" onClick={() => setIssuerForm(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
