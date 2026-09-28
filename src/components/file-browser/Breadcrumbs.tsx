"use client";

import { useState } from "react";
import { ChevronRight, HardDrive, MoreHorizontal } from "lucide-react";
import { Menu, type MenuAnchor } from "@/components/ui/Menu";
import { DRAG_TYPE } from "@/lib/drive-client";
import type { BreadcrumbItem } from "@/types";

export function Breadcrumbs({
  items,
  onNavigate,
  onDropItems,
}: {
  items: BreadcrumbItem[];
  onNavigate: (id: string) => void;
  onDropItems: (targetId: string, e: React.DragEvent) => void;
}) {
  const [hidden, setHidden] = useState<MenuAnchor | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);

  const collapse = items.length > 4;
  const head = collapse ? items.slice(0, 1) : items;
  const middle = collapse ? items.slice(1, -2) : [];
  const tail = collapse ? items.slice(-2) : [];

  function crumb(item: BreadcrumbItem, index: number, isLast: boolean) {
    return (
      <li key={item.id} className="flex items-center min-w-0 shrink">
        {index > 0 && <ChevronRight size={15} className="shrink-0 mx-0.5" style={{ color: "var(--text-3)" }} />}
        <button
          className="crumb"
          data-current={isLast}
          data-drop={dropId === item.id}
          aria-current={isLast ? "page" : undefined}
          onClick={() => !isLast && onNavigate(item.id)}
          onDragOver={(e) => {
            if (isLast || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropId(item.id);
          }}
          onDragLeave={() => setDropId(null)}
          onDrop={(e) => {
            setDropId(null);
            if (!isLast) onDropItems(item.id, e);
          }}
          title={item.name}
        >
          {index === 0 && <HardDrive size={15} className="shrink-0" />}
          <span className="truncate">{item.name}</span>
        </button>
      </li>
    );
  }

  return (
    <nav aria-label="Caminho" className="min-w-0">
      <ol className="flex items-center min-w-0">
        {head.map((item, i) => crumb(item, i, !collapse && i === items.length - 1))}
        {collapse && (
          <li className="flex items-center shrink-0">
            <ChevronRight size={15} className="mx-0.5" style={{ color: "var(--text-3)" }} />
            <button
              className="crumb"
              aria-label="Mostrar pastas ocultas"
              onClick={(e) => setHidden({ rect: e.currentTarget.getBoundingClientRect() })}
            >
              <MoreHorizontal size={16} />
            </button>
          </li>
        )}
        {tail.map((item, i) => crumb(item, i + 1, i === tail.length - 1))}
      </ol>
      {hidden && (
        <Menu
          anchor={hidden}
          onClose={() => setHidden(null)}
          entries={middle.map((m) => ({ label: m.name, onSelect: () => onNavigate(m.id) }))}
        />
      )}
    </nav>
  );
}
