"use client";

import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/types";

export function Breadcrumb({
  items,
  onNavigate,
}: {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string) => void;
}) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto py-2 px-1">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1 shrink-0">
          {index > 0 && (
            <ChevronRight
              size={14}
              style={{ color: "var(--text-muted)" }}
            />
          )}
          <button
            onClick={() => onNavigate(item.id)}
            className="px-2 py-1 rounded-md text-sm font-medium transition-colors hover:underline"
            style={{
              color:
                index === items.length - 1
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
            }}
          >
            {item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
