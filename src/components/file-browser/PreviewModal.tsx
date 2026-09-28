"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FolderOpen, Info, Loader2, X, AlertTriangle } from "lucide-react";
import { FileIcon } from "./FileIcon";
import { describeType, formatDateTime, formatFileSize, previewKind } from "@/lib/file-types";
import type { DriveItem } from "@/types";

const TEXT_LIMIT = 512 * 1024;

function TextPreview({ src }: { src: string }) {
  const [state, setState] = useState<{ text?: string; error?: boolean; truncated?: boolean }>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch(src, { headers: { Range: `bytes=0-${TEXT_LIMIT - 1}` }, signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const text = await res.text();
        const total = Number(res.headers.get("content-range")?.split("/")[1] || 0);
        setState({ text, truncated: total > TEXT_LIMIT });
      })
      .catch((e) => e.name !== "AbortError" && setState({ error: true }));
    return () => controller.abort();
  }, [src]);

  if (state.error) return <Unavailable reason="Não foi possível carregar o conteúdo." />;
  if (state.text === undefined) return <Spinner />;
  return (
    <div className="w-full h-full overflow-auto p-4 sm:p-8">
      <pre className="preview-text mx-auto max-w-4xl rounded-xl p-5 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
        {state.text}
        {state.truncated && "\n\n… (arquivo grande: mostrando apenas o início)"}
      </pre>
    </div>
  );
}

function Spinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-white/70">
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}

function Unavailable({ reason, item, onDownload }: { reason: string; item?: DriveItem; onDownload?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 px-6 text-white/85">
      {item ? <FileIcon mimeType={item.mimeType} name={item.name} size={88} /> : <AlertTriangle size={40} />}
      <div>
        <p className="font-medium">{reason}</p>
        {onDownload && <p className="text-sm text-white/60 mt-1">Baixe o arquivo para abrir no seu computador.</p>}
      </div>
      {onDownload && (
        <button className="btn btn-primary" onClick={onDownload}>
          <Download size={16} /> Baixar
        </button>
      )}
    </div>
  );
}

export function PreviewModal({
  items,
  index,
  onIndexChange,
  onClose,
  canDownload,
  onDownload,
  onShowDetails,
  onOpenLocation,
}: {
  items: DriveItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  canDownload: (item: DriveItem) => boolean;
  onDownload: (item: DriveItem) => void;
  onShowDetails?: (item: DriveItem) => void;
  onOpenLocation?: (item: DriveItem) => void;
}) {
  const item = items[index];
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [item?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, items.length, onClose, onIndexChange]);

  // Warm the cache for neighbouring images.
  useEffect(() => {
    for (const neighbour of [items[index + 1], items[index - 1]]) {
      if (neighbour && previewKind(neighbour.mimeType, neighbour.name) === "image") {
        new Image().src = `/api/drive/download?fileId=${encodeURIComponent(neighbour.id)}&inline=1`;
      }
    }
  }, [index, items]);

  if (!item) return null;

  const kind = previewKind(item.mimeType, item.name);
  const src = `/api/drive/download?fileId=${encodeURIComponent(item.id)}&inline=1`;
  const download = canDownload(item) ? () => onDownload(item) : undefined;

  let body: React.ReactNode;
  if (failed) {
    body = <Unavailable reason="Não foi possível carregar a pré-visualização." item={item} onDownload={download} />;
  } else if (kind === "image") {
    body = (
      <>
        {!loaded && <Spinner />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.id}
          src={src}
          alt={item.name}
          className="max-w-full max-h-full object-contain select-none transition-opacity duration-200"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          draggable={false}
        />
      </>
    );
  } else if (kind === "pdf") {
    body = (
      <>
        {!loaded && <Spinner />}
        <iframe
          key={item.id}
          src={src}
          title={item.name}
          className="w-full h-full max-w-5xl rounded-lg bg-white"
          onLoad={() => setLoaded(true)}
        />
      </>
    );
  } else if (kind === "video") {
    body = (
      <video key={item.id} src={src} controls autoPlay playsInline className="max-w-full max-h-full rounded-lg" onError={() => setFailed(true)} />
    );
  } else if (kind === "audio") {
    body = (
      <div className="flex flex-col items-center gap-6">
        <FileIcon mimeType={item.mimeType} name={item.name} size={96} />
        <audio key={item.id} src={src} controls autoPlay className="w-80 max-w-full" onError={() => setFailed(true)} />
      </div>
    );
  } else if (kind === "text") {
    body = <TextPreview key={item.id} src={src} />;
  } else if (item.thumb) {
    body = (
      <>
        {!loaded && <Spinner />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.id}
          src={`${item.thumb}&s=1600`}
          alt={item.name}
          className="max-w-full max-h-full object-contain rounded-md shadow-2xl bg-white"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      </>
    );
  } else {
    body = <Unavailable reason="Pré-visualização não disponível para este tipo de arquivo." item={item} onDownload={download} />;
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col preview-backdrop animate-fade" role="dialog" aria-modal="true" aria-label={item.name}>
      <header className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 h-14 shrink-0 text-white">
        <button className="btn-overlay" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>
        <FileIcon mimeType={item.mimeType} name={item.name} size={20} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{item.name}</div>
          <div className="text-xs text-white/55 truncate">
            {describeType(item.mimeType, item.name)}
            {item.size ? ` · ${formatFileSize(item.size)}` : ""}
            {item.modifiedTime ? ` · ${formatDateTime(item.modifiedTime)}` : ""}
          </div>
        </div>
        {items.length > 1 && (
          <span className="hidden sm:block text-xs text-white/55 tabular-nums mr-1">
            {index + 1} de {items.length}
          </span>
        )}
        {onOpenLocation && item.parentId && (
          <button className="btn-overlay" onClick={() => onOpenLocation(item)} title="Abrir local" aria-label="Abrir local">
            <FolderOpen size={18} />
          </button>
        )}
        {onShowDetails && (
          <button className="btn-overlay hidden sm:flex" onClick={() => onShowDetails(item)} title="Detalhes" aria-label="Detalhes">
            <Info size={18} />
          </button>
        )}
        {download && (
          <button className="btn-overlay-primary" onClick={download}>
            <Download size={16} />
            <span className="hidden sm:inline">Baixar</span>
          </button>
        )}
      </header>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 pb-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {body}

        {index > 0 && (
          <button className="preview-nav left-2 sm:left-4" onClick={() => onIndexChange(index - 1)} aria-label="Anterior">
            <ChevronLeft size={24} />
          </button>
        )}
        {index < items.length - 1 && (
          <button className="preview-nav right-2 sm:right-4" onClick={() => onIndexChange(index + 1)} aria-label="Próximo">
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
