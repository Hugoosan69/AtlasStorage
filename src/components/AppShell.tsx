"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FolderOpen, Shield, LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/ui/Toast";
import type { AppUser } from "@/types";

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const nav = [
    { href: "/", label: "Arquivos", icon: FolderOpen, show: true },
    { href: "/admin", label: "Administração", icon: Shield, show: user.role === "admin" },
  ].filter((n) => n.show);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}
        >
          A
        </div>
        <span className="font-semibold text-[15px] tracking-tight">Atlas</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: active ? "var(--accent-soft)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-2)",
              }}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>
              {user.role === "admin" ? "Administrador" : "Usuário"}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={logout} title="Sair" aria-label="Sair">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden">
        <aside
          className="hidden md:block w-60 shrink-0"
          style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
        >
          {sidebar}
        </aside>

        {open && (
          <div className="md:hidden fixed inset-0 z-40 flex" onClick={() => setOpen(false)}>
            <div className="absolute inset-0" style={{ background: "rgb(0 0 0 / 0.4)" }} />
            <aside
              className="relative w-64 h-full animate-pop"
              style={{ background: "var(--surface)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="btn btn-ghost btn-icon absolute right-2 top-3.5" onClick={() => setOpen(false)} aria-label="Fechar menu">
                <X size={18} />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className="md:hidden flex items-center gap-2 px-3 h-14 shrink-0"
            style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
          >
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu size={20} />
            </button>
            <span className="font-semibold">Atlas</span>
          </div>
          <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
