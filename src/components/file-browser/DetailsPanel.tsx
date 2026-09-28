"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { FileIcon, FolderGlyph } from "./FileIcon";
import { describeType, formatDateTime, formatFileSize } from "@/lib/file-types";
import type { MenuEntry } from "@/components/ui/Menu";
import type { BreadcrumbItem, DriveItem } from "@/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 flex flex-col gap-0.5" style={{ borderBottom: "1px solid var(--border)" }}>
      <dt className="text-xs" style={{ color: "var(--text-3)" }}>{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function Thumb({ item }: { item: DriveItem }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="details-thumb aspect-[4/3] rounded-xl flex items-center justify-center overflow-hidden">
      {item.thumb && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${item.thumb}&s=480`}
          alt=""
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <FileIcon mimeType={item.mimeType} name={item.name} size={72} />
      )}
    </div>
  );
}

export function DetailsPanel({
  selection,
  folder,
  folderItems,
  path,
  actions,
  onClose,
  onOpenLocation,
}: {
  selection: DriveItem[];
  folder: BreadcrumbItem | null;
  folderItems: DriveItem[];
  path: BreadcrumbItem[];
  actions: MenuEntry[];
  onClose: () => void;
  onOpenLocation: (id: string) => void;
}) {
  const single = selection.length === 1 ? selection[0] : null;
  const buttons = actions.filter((a): a is Exclude<MenuEntry, "separator"> => a !== "separator");

  let content: React.ReactNode;
  if (single) {
    const location = single.parentName ?? path.map((p) => p.name).join(" / ");
    content = (
      <>
        <Thumb key={single.id} item={single} />
        <h3 className="mt-4 font-semibold text-[15px] leading-snug break-words">{single.name}</h3>
        <dl className="mt-3">
          <Row label="Tipo">{describeType(single.mimeType, single.name)}</Row>
          {!single.isFolder && <Row label="Tamanho">{formatFileSize(single.size)}</Row>}
          <Row label="Modificado">{formatDateTime(single.modifiedTime)}</Row>
          {single.createdTime && <Row label="Criado">{formatDateTime(single.createdTime)}</Row>}
          <Row label="Local">
            {single.parentId ? (
              <button className="link" onClick={() => onOpenLocation(single.parentId!)}>
                {location || "Atlas"}
              </button>
            ) : (
              location
            )}
          </Row>
        </dl>
      </>
    );
  } else if (selection.length > 1) {
    const files = selection.filter((i) => !i.isFolder);
    const total = files.reduce((s, i) => s + Number(i.size || 0), 0);
    content = (
      <>
        <div className="details-thumb aspect-[4/3] rounded-xl flex items-center justify-center">
          <div className="relative">
            {selection.slice(0, 3).map((item, i) => (
              <div key={item.id} className="absolute" style={{ left: i * 14 - 14, top: i * -8 + 8, transform: `rotate(${(i - 1) * 7}deg)` }}>
                <FileIcon mimeType={item.mimeType} name={item.name} size={60} />
              </div>
            ))}
            <div className="w-12 h-16" />
          </div>
        </div>
        <h3 className="mt-4 font-semibold text-[15px]">{selection.length} itens selecionados</h3>
        <dl className="mt-3">
          <Row label="Conteúdo">
            {selection.length - files.length > 0 && `${selection.length - files.length} pasta(s)`}
            {selection.length - files.length > 0 && files.length > 0 && " · "}
            {files.length > 0 && `${files.length} arquivo(s)`}
          </Row>
          {files.length > 0 && <Row label="Tamanho total">{formatFileSize(total)}</Row>}
        </dl>
      </>
    );
  } else {
    const folders = folderItems.filter((i) => i.isFolder).length;
    const files = folderItems.length - folders;
    const total = folderItems.reduce((s, i) => s + Number(i.size || 0), 0);
    content = (
      <>
        <div className="details-thumb aspect-[4/3] rounded-xl flex items-center justify-center">
          <FolderGlyph size={84} />
        </div>
        <h3 className="mt-4 font-semibold text-[15px] break-words">{folder?.name ?? "Atlas"}</h3>
        <dl className="mt-3">
          <Row label="Conteúdo">
            {folders} {folders === 1 ? "pasta" : "pastas"} · {files} {files === 1 ? "arquivo" : "arquivos"}
          </Row>
          <Row label="Tamanho dos arquivos">{formatFileSize(total)}</Row>
          <Row label="Caminho">{path.map((p) => p.name).join(" / ")}</Row>
        </dl>
        <p className="text-xs mt-4" style={{ color: "var(--text-3)" }}>
          Selecione um item para ver os detalhes.
        </p>
      </>
    );
  }

  return (
    <aside className="details-panel w-80 shrink-0 flex flex-col animate-slide-in" aria-label="Detalhes">
      <div className="flex items-center justify-between pl-5 pr-2 h-12 shrink-0">
        <span className="text-sm font-semibold">Detalhes</span>
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar detalhes">
          <X size={17} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {content}
        {buttons.length > 0 && selection.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-5">
            {buttons.map(({ label, icon: Icon, onSelect, danger }) => (
              <button
                key={label}
                className="btn justify-start h-9 text-[13px]"
                style={danger ? { color: "var(--danger)" } : undefined}
                onClick={onSelect}
              >
                {Icon && <Icon size={15} />}
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
