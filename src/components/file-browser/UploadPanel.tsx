"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, X, RotateCw, Ban } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { formatFileSize } from "@/lib/file-types";
import type { UploadJob } from "./useUploader";

export function UploadPanel({
  jobs,
  onClear,
  onCancel,
  onRetry,
}: {
  jobs: UploadJob[];
  onClear: () => void;
  onCancel: (id?: number) => void;
  onRetry: (id: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (jobs.length === 0) return null;

  const files = jobs.filter((j) => j.kind === "file");
  const active = jobs.filter((j) => j.status === "queued" || j.status === "uploading").length;
  const failed = jobs.filter((j) => j.status === "error").length;
  const total = files.reduce((s, j) => s + j.size, 0);
  const loaded = files.reduce((s, j) => s + (j.status === "done" ? j.size : j.loaded), 0);
  const percent = total ? Math.round((loaded / total) * 100) : active ? 0 : 100;

  const title = active
    ? `Enviando ${active} ${active === 1 ? "item" : "itens"}`
    : failed
      ? `${failed} ${failed === 1 ? "falha" : "falhas"} no envio`
      : "Envio concluído";

  return (
    <div className="upload-panel fixed z-40 bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] rounded-2xl overflow-hidden animate-pop">
      <div className="flex items-center gap-3 pl-4 pr-1.5 h-14">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          {active > 0 && (
            <div className="text-xs tabular-nums" style={{ color: "var(--text-3)" }}>
              {formatFileSize(loaded)} de {formatFileSize(total)} · {percent}%
            </div>
          )}
        </div>
        {active > 0 && (
          <button className="btn btn-ghost h-8 text-xs" onClick={() => onCancel()}>
            Cancelar
          </button>
        )}
        <button className="btn btn-ghost btn-icon" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expandir" : "Recolher"}>
          {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {active === 0 && (
          <button className="btn btn-ghost btn-icon" onClick={onClear} aria-label="Fechar">
            <X size={18} />
          </button>
        )}
      </div>
      {active > 0 && (
        <div className="h-0.5" style={{ background: "var(--hover)" }}>
          <div className="h-full transition-[width] duration-300" style={{ width: `${percent}%`, background: "var(--accent)" }} />
        </div>
      )}
      {!collapsed && (
        <ul className="max-h-72 overflow-y-auto py-1">
          {jobs.map((j) => {
            const pct = j.size ? Math.round((j.loaded / j.size) * 100) : 0;
            return (
              <li key={j.id} className="group flex items-center gap-3 px-4 py-2">
                <FileIcon mimeType={j.mimeType} name={j.name} size={20} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" title={j.path}>{j.path}</div>
                  <div className="text-xs truncate" style={{ color: j.status === "error" ? "var(--danger)" : "var(--text-3)" }}>
                    {j.status === "error"
                      ? j.error
                      : j.status === "canceled"
                        ? "Cancelado"
                        : j.status === "queued"
                          ? "Na fila"
                          : j.kind === "folder"
                            ? j.status === "done" ? "Pasta criada" : "Criando pasta..."
                            : j.status === "done"
                              ? formatFileSize(j.size)
                              : `${formatFileSize(j.loaded)} de ${formatFileSize(j.size)}`}
                  </div>
                </div>
                {j.status === "uploading" && j.kind === "file" && (
                  <>
                    <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0 -rotate-90" aria-label={`${pct}%`}>
                      <circle cx="11" cy="11" r="9" fill="none" stroke="var(--hover)" strokeWidth="2.5" />
                      <circle
                        cx="11" cy="11" r="9" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round"
                        strokeDasharray={`${(pct / 100) * 56.5} 56.5`}
                      />
                    </svg>
                    <button className="btn btn-ghost btn-icon h-8 w-8 hidden group-hover:flex" onClick={() => onCancel(j.id)} aria-label="Cancelar envio">
                      <Ban size={15} />
                    </button>
                  </>
                )}
                {j.status === "done" && <CheckCircle2 size={18} className="shrink-0" style={{ color: "var(--success)" }} />}
                {j.status === "error" && j.kind === "file" && (
                  <button className="btn btn-ghost h-8 text-xs" onClick={() => onRetry(j.id)}>
                    <RotateCw size={14} /> Tentar de novo
                  </button>
                )}
                {j.status === "error" && j.kind === "folder" && (
                  <AlertCircle size={18} className="shrink-0" style={{ color: "var(--danger)" }} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
