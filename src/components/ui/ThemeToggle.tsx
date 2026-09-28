"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Mode = "system" | "light" | "dark";

const MODES: Array<{ id: Mode; label: string; icon: typeof Sun }> = [
  { id: "system", label: "Tema do sistema", icon: Monitor },
  { id: "light", label: "Tema claro", icon: Sun },
  { id: "dark", label: "Tema escuro", icon: Moon },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atlas:theme");
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!touched) return;
    if (mode === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    try {
      if (mode === "system") localStorage.removeItem("atlas:theme");
      else localStorage.setItem("atlas:theme", mode);
    } catch {}
  }, [mode, touched]);

  function apply(next: Mode) {
    setTouched(true);
    setMode(next);
  }

  return (
    <div className="segmented" role="radiogroup" aria-label="Tema">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={mode === id}
          aria-label={label}
          title={label}
          data-active={mode === id}
          onClick={() => apply(id)}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}
