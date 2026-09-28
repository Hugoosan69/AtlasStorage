"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgb(0 0 0 / 0.45)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`animate-pop w-full ${width} rounded-t-2xl sm:rounded-2xl overflow-hidden`}
        style={{ background: "var(--surface)", boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn btn-ghost btn-icon -mr-2" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-4">{children}</div>
        {footer && (
          <div
            className="flex justify-end gap-2 px-5 py-3"
            style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function PromptModal({
  open,
  title,
  label,
  initialValue = "",
  confirmText = "Salvar",
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmText?: string;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    setBusy(false);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const dot = initialValue.lastIndexOf(".");
      el.setSelectionRange(0, dot > 0 ? dot : initialValue.length);
    });
  }, [open, initialValue]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    await onSubmit(v);
    setBusy(false);
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="label">{label}</label>
        <input ref={inputRef} className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !value.trim()}>
            {busy ? "Salvando..." : confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="text-sm" style={{ color: "var(--text-2)" }}>{message}</div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
          }}
        >
          {busy ? "Aguarde..." : confirmText}
        </button>
      </div>
    </Modal>
  );
}
