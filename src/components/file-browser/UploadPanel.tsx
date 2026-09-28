"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { FileIcon } from "./FileIcon";

export interface UploadJob {
  id: number;
  name: string;
  mimeType: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function UploadPanel({ jobs, onClear }: { jobs: UploadJob[]; onClear: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  if (jobs.length === 0) return null;

  const active = jobs.filter((j) => j.status === "pending" || j.status === "uploading").length;
  const title = active > 0 ? `Enviando ${active} ${active === 1 ? "arquivo" : "arquivos"}...` : "Envio concluído";

  return (
    <div
      className="fixed z-40 bottom-4 right-4 left-4 sm:left-auto sm:w-96 rounded-xl overflow-hidden animate-pop"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}
    >
      <div className="flex items-center justify-between pl-4 pr-2 h-12" style={{ background: "var(--surface-2)" }}>
        <span className="text-sm font-medium">{title}</span>
        <div className="flex">
          <button className="btn btn-ghost btn-icon" onClick={() => setCollapsed(!collapsed)} aria-label="Recolher">
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {active === 0 && (
            <button className="btn btn-ghost btn-icon" onClick={onClear} aria-label="Fechar">
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="max-h-64 overflow-y-auto">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
              <FileIcon mimeType={j.mimeType} size={18} />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{j.name}</div>
                {j.status === "uploading" || j.status === "pending" ? (
                  <div className="h-1 rounded-full mt-1.5 overflow-hidden" style={{ background: "var(--hover)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${j.progress}%`, background: "var(--accent)" }}
                    />
                  </div>
                ) : j.status === "error" ? (
                  <div className="text-xs truncate" style={{ color: "var(--danger)" }}>{j.error}</div>
                ) : null}
              </div>
              {j.status === "done" && <CheckCircle2 size={18} style={{ color: "var(--success)" }} />}
              {j.status === "error" && <AlertCircle size={18} style={{ color: "var(--danger)" }} />}
              {j.status === "uploading" && (
                <span className="text-xs tabular-nums" style={{ color: "var(--text-3)" }}>{j.progress}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
