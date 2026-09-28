"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface MenuAction {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
  checked?: boolean;
}
export type MenuEntry = MenuAction | "separator";

export type MenuAnchor = { x: number; y: number } | { rect: DOMRect; align?: "start" | "end" };

function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setPhone(mq.matches);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return phone;
}

export function Menu({
  entries,
  anchor,
  onClose,
  title,
  width = 224,
}: {
  entries: MenuEntry[];
  anchor: MenuAnchor;
  onClose: () => void;
  title?: React.ReactNode;
  width?: number;
}) {
  const phone = useIsPhone();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (phone || !ref.current) return;
    const h = ref.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left: number;
    let top: number;
    if ("rect" in anchor) {
      left = anchor.align === "end" ? anchor.rect.right - width : anchor.rect.left;
      top = anchor.rect.bottom + 6;
      if (top + h > vh - 8) top = Math.max(8, anchor.rect.top - h - 6);
    } else {
      left = anchor.x;
      top = anchor.y;
      if (top + h > vh - 8) top = Math.max(8, anchor.y - h);
    }
    left = Math.min(Math.max(8, left), vw - width - 8);
    setPos({ left, top });
  }, [anchor, phone, width]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("button[data-menu-item]:not(:disabled)") || []);
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.key === "ArrowDown" ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;
      buttons[next].focus();
    };
    const onViewportChange = () => onClose();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [onClose]);

  useEffect(() => {
    if (!phone && pos) ref.current?.querySelector<HTMLButtonElement>("button[data-menu-item]:not(:disabled)")?.focus({ preventScroll: true });
  }, [phone, pos]);

  const list = entries.map((entry, i) =>
    entry === "separator" ? (
      <div key={`sep-${i}`} className="my-1 h-px" style={{ background: "var(--border)" }} />
    ) : (
      <button
        key={`${i}-${entry.label}`}
        data-menu-item
        disabled={entry.disabled}
        className={`menu-item ${phone ? "h-12 text-[15px]" : "h-9 text-sm"}`}
        style={{ color: entry.danger ? "var(--danger)" : undefined }}
        onClick={() => {
          onClose();
          entry.onSelect();
        }}
      >
        {entry.icon ? <entry.icon size={phone ? 19 : 16} strokeWidth={1.9} className="shrink-0 opacity-90" /> : <span className="w-4" />}
        <span className="flex-1 text-left truncate">{entry.label}</span>
        {entry.checked && <span className="text-xs" style={{ color: "var(--accent)" }}>●</span>}
        {entry.hint && !phone && <span className="text-xs kbd-hint">{entry.hint}</span>}
      </button>
    )
  );

  return (
    <div
      className="fixed inset-0 z-[60]"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={phone ? { background: "rgb(0 0 0 / 0.4)" } : undefined}
    >
      {phone ? (
        <div ref={ref} className="sheet animate-sheet absolute inset-x-0 bottom-0 rounded-t-2xl px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]" role="menu">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full" style={{ background: "var(--border-strong)" }} />
          {title && <div className="px-3 pb-2 pt-1 text-sm font-semibold truncate">{title}</div>}
          {list}
        </div>
      ) : (
        <div
          ref={ref}
          role="menu"
          className="popover animate-pop absolute p-1.5 rounded-xl"
          style={{ width, left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
        >
          {list}
        </div>
      )}
    </div>
  );
}
