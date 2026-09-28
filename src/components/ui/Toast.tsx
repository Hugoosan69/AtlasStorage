"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "loading";
interface ToastOptions {
  action?: { label: string; onClick: () => void };
  duration?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
  kind: ToastKind;
  message: string;
}

type ShowToast = (message: string, kind?: ToastKind, options?: ToastOptions) => number;

const ToastContext = createContext<{ show: ShowToast; dismiss: (id: number) => void }>({
  show: () => 0,
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext).show;
}

export function useToastControls() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback<ShowToast>(
    (message, kind = "info", options = {}) => {
      const id = nextId.current++;
      setItems((all) => [...all.slice(-3), { id, kind, message, ...options }]);
      if (kind !== "loading") {
        const duration = options.duration ?? (options.action ? 7000 : kind === "error" ? 6000 : 3500);
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const icons = {
    success: <CheckCircle2 size={18} style={{ color: "var(--success)" }} />,
    error: <AlertCircle size={18} style={{ color: "var(--danger)" }} />,
    info: <Info size={18} style={{ color: "var(--accent)" }} />,
    loading: <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />,
  };

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="toast animate-pop pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-xl text-sm w-full sm:w-auto sm:min-w-80 sm:max-w-md"
          >
            <span className="shrink-0">{icons[t.kind]}</span>
            <span className="flex-1 break-words py-1">{t.message}</span>
            {t.action && (
              <button
                className="shrink-0 px-2.5 h-8 rounded-lg font-semibold toast-action"
                onClick={() => {
                  t.action!.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg toast-close"
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
