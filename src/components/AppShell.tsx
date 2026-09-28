"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FolderOpen, Shield, LogOut, Menu as MenuIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { FolderTree } from "@/components/file-browser/FolderTree";
import type { AppUser } from "@/types";

export function avatarColor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 62% 52%)`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const nav = [
    { href: "/", label: "Arquivos", icon: FolderOpen, show: true },
    { href: "/admin", label: "Administração", icon: Shield, show: user.role === "admin" },
  ].filter((n) => n.show);

  const onFiles = pathname === "/";

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0">
        <div className="brand-mark">A</div>
        <span className="font-semibold text-[15px] tracking-tight">Atlas</span>
      </div>

      <nav className="px-2.5 space-y-0.5 shrink-0">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? onFiles : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawer(false)}
              className="nav-link"
              data-active={active}
            >
              <Icon size={17} strokeWidth={1.9} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pt-4 pb-3">
        {onFiles && (
          <Suspense>
            <FolderTree onNavigate={() => setDrawer(false)} />
          </Suspense>
        )}
      </div>

      <div className="p-2.5 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 px-1.5 py-1.5">
          <div className="avatar" style={{ background: avatarColor(user.email) }}>
            {initials(user.name)}
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
        <div className="flex items-center justify-between px-1.5 pt-1.5">
          <span className="text-xs" style={{ color: "var(--text-3)" }}>Aparência</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden">
        <aside className="sidebar hidden md:block w-64 shrink-0">{sidebar}</aside>

        {drawer && (
          <div className="md:hidden fixed inset-0 z-50" onClick={() => setDrawer(false)}>
            <div className="absolute inset-0 backdrop" />
            <aside
              className="sidebar absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="btn btn-ghost btn-icon absolute right-2 top-2.5 z-10"
                onClick={() => setDrawer(false)}
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="md:hidden flex items-center gap-2 px-2 h-14 shrink-0 topbar">
            <button className="btn btn-ghost btn-icon" onClick={() => setDrawer(true)} aria-label="Abrir menu">
              <MenuIcon size={20} />
            </button>
            <div className="brand-mark !w-7 !h-7 !text-xs">A</div>
            <span className="font-semibold">Atlas</span>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
