"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = (id: number) => setItems((all) => all.filter((t) => t.id !== id));

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId++;
    setItems((all) => [...all, { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
  }, []);

  const icons = {
    success: <CheckCircle2 size={18} style={{ color: "var(--success)" }} />,
    error: <AlertCircle size={18} style={{ color: "var(--danger)" }} />,
    info: <Info size={18} style={{ color: "var(--accent)" }} />,
  };

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[60] flex flex-col gap-2 w-[calc(100%-2rem)] sm:w-auto sm:max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-pop flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
          >
            <span className="mt-0.5 shrink-0">{icons[t.kind]}</span>
            <span className="flex-1 break-words">{t.message}</span>
            <button onClick={() => dismiss(t.id)} style={{ color: "var(--text-3)" }} aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
