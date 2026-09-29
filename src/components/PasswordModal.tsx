"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/drive-client";

export function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ current: "", next: "", confirm: "" });
      setError("");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) return setError("As senhas novas não coincidem");
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/password", { method: "POST", json: { current: form.current, next: form.next } });
      toast("Senha alterada com sucesso", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof typeof form, label: string, autoComplete: string) => (
    <div>
      <label className="label" htmlFor={`pw-${key}`}>{label}</label>
      <input
        id={`pw-${key}`}
        type="password"
        className="input"
        required
        minLength={key === "current" ? 1 : 6}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <Modal open={open} title="Alterar senha" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
            {error}
          </div>
        )}
        {field("current", "Senha atual", "current-password")}
        {field("next", "Nova senha (mínimo 6 caracteres)", "new-password")}
        {field("confirm", "Confirmar nova senha", "new-password")}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Salvando..." : "Alterar senha"}</button>
        </div>
      </form>
    </Modal>
  );
}
