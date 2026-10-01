"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Package,
  User,
  DollarSign,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/drive-client";
import { useToast } from "@/components/ui/Toast";
import type { FinancialTransaction } from "@/types";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TYPE_LABELS: Record<string, string> = {
  entrada: "Entrada",
  saida_mercadoria: "Saída Mercadoria",
  saida_pessoal: "Saída Pessoal",
};
const TYPE_COLORS: Record<string, string> = {
  entrada: "var(--success)",
  saida_mercadoria: "var(--warning)",
  saida_pessoal: "var(--danger)",
};

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface FormData {
  id?: string;
  date: string;
  type: string;
  amount: string;
  description: string;
}

const EMPTY_FORM: FormData = { date: "", type: "entrada", amount: "", description: "" };

export function FinanceView({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const now = useMemo(() => new Date(), []);
  const ref = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [now, weekOffset]);
  const { start, end } = useMemo(() => getWeekRange(ref), [ref]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [start]);

  const load = useCallback(() => {
    setLoading(true);
    api<FinancialTransaction[]>(
      `/api/admin/finance?from=${fmtDate(start)}&to=${fmtDate(end)}`
    )
      .then(setTransactions)
      .catch((e) => toast(e.message, "error"))
      .finally(() => setLoading(false));
  }, [start, end, toast]);

  useEffect(load, [load]);

  const byDay = useMemo(() => {
    const map: Record<string, FinancialTransaction[]> = {};
    for (const t of transactions) {
      (map[t.date] ??= []).push(t);
    }
    return map;
  }, [transactions]);

  const weekTotals = useMemo(() => {
    let entrada = 0, saida_mercadoria = 0, saida_pessoal = 0;
    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === "entrada") entrada += amt;
      else if (t.type === "saida_mercadoria") saida_mercadoria += amt;
      else saida_pessoal += amt;
    }
    return { entrada, saida_mercadoria, saida_pessoal, lucro: entrada - saida_mercadoria - saida_pessoal };
  }, [transactions]);

  function dayTotals(dateStr: string) {
    const items = byDay[dateStr] || [];
    let entrada = 0, saida_mercadoria = 0, saida_pessoal = 0;
    for (const t of items) {
      const amt = Number(t.amount);
      if (t.type === "entrada") entrada += amt;
      else if (t.type === "saida_mercadoria") saida_mercadoria += amt;
      else saida_pessoal += amt;
    }
    return { entrada, saida_mercadoria, saida_pessoal };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (form.id) {
        await api("/api/admin/finance", {
          method: "PATCH",
          json: { id: form.id, date: form.date, type: form.type, amount: form.amount, description: form.description },
        });
        toast("Lançamento atualizado", "success");
      } else {
        await api("/api/admin/finance", {
          method: "POST",
          json: { date: form.date, type: form.type, amount: form.amount, description: form.description },
        });
        toast("Lançamento adicionado", "success");
      }
      setForm(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await api(`/api/admin/finance?id=${id}`, { method: "DELETE" });
      toast("Lançamento excluído", "success");
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    }
  }

  const monthName = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <DollarSign size={22} />
              Controle Financeiro
            </h1>
            <p className="text-sm mt-0.5 capitalize" style={{ color: "var(--text-2)" }}>{monthName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-icon" onClick={() => setWeekOffset((w) => w - 1)} title="Semana anterior">
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn btn-ghost text-sm"
              onClick={() => setWeekOffset(0)}
            >
              Hoje
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => setWeekOffset((w) => w + 1)} title="Próxima semana">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Entradas" value={weekTotals.entrada} icon={<TrendingUp size={18} />} color="var(--success)" />
          <SummaryCard label="Mercadoria" value={weekTotals.saida_mercadoria} icon={<Package size={18} />} color="var(--warning)" />
          <SummaryCard label="Pessoal" value={weekTotals.saida_pessoal} icon={<User size={18} />} color="var(--danger)" />
          <SummaryCard
            label="Lucro"
            value={weekTotals.lucro}
            icon={<DollarSign size={18} />}
            color={weekTotals.lucro >= 0 ? "var(--success)" : "var(--danger)"}
          />
        </div>

        {/* Week strip */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weekDays.map((d, i) => {
            const dateStr = fmtDate(d);
            const dt = dayTotals(dateStr);
            const isToday = fmtDate(now) === dateStr;
            const active = selectedDay === i;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(active ? null : i)}
                className="card flex-1 min-w-[110px] p-3 text-center transition-all"
                style={{
                  borderColor: isToday ? "var(--accent)" : active ? "var(--border-active)" : undefined,
                  background: active ? "var(--surface-active)" : undefined,
                }}
              >
                <div className="text-xs font-semibold" style={{ color: isToday ? "var(--accent)" : "var(--text-2)" }}>
                  {DAYS[i]}
                </div>
                <div className="text-lg font-bold mt-0.5">{d.getDate()}</div>
                {dt.entrada > 0 && (
                  <div className="text-xs mt-1" style={{ color: "var(--success)" }}>
                    +{fmtMoney(dt.entrada)}
                  </div>
                )}
                {(dt.saida_mercadoria + dt.saida_pessoal) > 0 && (
                  <div className="text-xs" style={{ color: "var(--danger)" }}>
                    -{fmtMoney(dt.saida_mercadoria + dt.saida_pessoal)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail or full week */}
        {loading ? (
          <div className="text-center py-12" style={{ color: "var(--text-3)" }}>Carregando...</div>
        ) : selectedDay !== null ? (
          <DayView
            date={weekDays[selectedDay]}
            items={byDay[fmtDate(weekDays[selectedDay])] || []}
            isAdmin={isAdmin}
            onAdd={() => setForm({ ...EMPTY_FORM, date: fmtDate(weekDays[selectedDay]) })}
            onEdit={(t) =>
              setForm({ id: t.id, date: t.date, type: t.type, amount: String(t.amount), description: t.description })
            }
            onDelete={handleDelete}
          />
        ) : (
          <WeekTable weekDays={weekDays} byDay={byDay} isAdmin={isAdmin}
            onAdd={(date) => setForm({ ...EMPTY_FORM, date })}
            onEdit={(t) =>
              setForm({ id: t.id, date: t.date, type: t.type, amount: String(t.amount), description: t.description })
            }
            onDelete={handleDelete}
          />
        )}

        {/* Form modal */}
        {form && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setForm(null)}>
            <div className="absolute inset-0 backdrop" />
            <form
              onSubmit={handleSave}
              className="card p-5 w-full max-w-md relative z-10 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold">{form.id ? "Editar Lançamento" : "Novo Lançamento"}</h3>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Data</span>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Tipo</span>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida_mercadoria">Saída Mercadoria</option>
                    <option value="saida_pessoal">Saída Pessoal</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Valor (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Descrição</span>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Kit Etiqueta, Caneca..."
                />
              </label>

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ color }}>{fmtMoney(value)}</div>
    </div>
  );
}

function DayView({
  date,
  items,
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
}: {
  date: Date;
  items: FinancialTransaction[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (t: FinancialTransaction) => void;
  onDelete: (id: string) => void;
}) {
  const dayName = DAYS_FULL[date.getDay()];
  const dateStr = `${dayName}, ${date.toLocaleDateString("pt-BR")}`;

  const groups: Record<string, FinancialTransaction[]> = { entrada: [], saida_mercadoria: [], saida_pessoal: [] };
  for (const t of items) (groups[t.type] ??= []).push(t);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Calendar size={16} />
          {dateStr}
        </h2>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={14} /> Lançar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--text-3)" }}>
          Nenhum lançamento neste dia
        </div>
      ) : (
        Object.entries(groups).map(([type, list]) =>
          list.length > 0 ? (
            <div key={type} className="card overflow-hidden">
              <div className="px-4 py-2 text-xs font-semibold flex items-center gap-2" style={{ color: TYPE_COLORS[type], borderBottom: "1px solid var(--border)" }}>
                {type === "entrada" ? <TrendingUp size={14} /> : type === "saida_mercadoria" ? <Package size={14} /> : <User size={14} />}
                {TYPE_LABELS[type]}
                <span className="ml-auto font-bold">
                  {fmtMoney(list.reduce((s, t) => s + Number(t.amount), 0))}
                </span>
              </div>
              {list.map((t) => (
                <div key={t.id} className="file-row px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.description || "—"}</div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums" style={{ color: TYPE_COLORS[t.type] }}>
                    {t.type === "entrada" ? "+" : "-"}{fmtMoney(Number(t.amount))}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-icon" onClick={() => onEdit(t)} title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" onClick={() => onDelete(t.id)} title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null
        )
      )}
    </div>
  );
}

function WeekTable({
  weekDays,
  byDay,
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
}: {
  weekDays: Date[];
  byDay: Record<string, FinancialTransaction[]>;
  isAdmin: boolean;
  onAdd: (date: string) => void;
  onEdit: (t: FinancialTransaction) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {weekDays.map((d, i) => {
        const dateStr = fmtDate(d);
        const items = byDay[dateStr] || [];
        if (items.length === 0) return null;
        return (
          <div key={i} className="card overflow-hidden">
            <div
              className="px-4 py-2 text-xs font-semibold flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)", color: "var(--text-2)" }}
            >
              <span>{DAYS_FULL[d.getDay()]} {fmtShortDate(d)}</span>
              {isAdmin && (
                <button className="btn btn-ghost btn-sm text-xs" onClick={() => onAdd(dateStr)}>
                  <Plus size={12} /> Lançar
                </button>
              )}
            </div>
            {items.map((t) => (
              <div key={t.id} className="file-row px-4 py-2 flex items-center gap-3 text-sm">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: TYPE_COLORS[t.type] }}
                />
                <span className="text-xs shrink-0 w-24" style={{ color: TYPE_COLORS[t.type] }}>
                  {TYPE_LABELS[t.type]}
                </span>
                <span className="flex-1 min-w-0 truncate">{t.description || "—"}</span>
                <span className="font-semibold tabular-nums" style={{ color: TYPE_COLORS[t.type] }}>
                  {t.type === "entrada" ? "+" : "-"}{fmtMoney(Number(t.amount))}
                </span>
                {isAdmin && (
                  <div className="flex gap-0.5 shrink-0">
                    <button className="btn btn-ghost btn-icon" onClick={() => onEdit(t)}><Pencil size={13} /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => onDelete(t.id)}><Trash2 size={13} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {Object.keys(byDay).length === 0 && (
        <div className="card p-12 text-center" style={{ color: "var(--text-3)" }}>
          <DollarSign size={32} className="mx-auto mb-2 opacity-40" />
          <p>Nenhum lançamento nesta semana</p>
          {isAdmin && (
            <p className="text-xs mt-1">Clique em um dia acima para começar</p>
          )}
        </div>
      )}
    </div>
  );
}
