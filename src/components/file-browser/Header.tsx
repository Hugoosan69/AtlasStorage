"use client";

import { useState } from "react";
import { LogOut, Settings, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { AppUser } from "@/types";

export function Header({ user }: { user: AppUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 py-3"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          A
        </div>
        <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Atlas
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          <User size={16} />
          <span className="text-sm hidden sm:inline">{user.name}</span>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div
              className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg py-1 shadow-lg"
              style={{
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="px-3 py-2 text-xs"
                style={{
                  color: "var(--text-muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {user.email}
              </div>

              {user.role === "admin" && (
                <button
                  onClick={() => {
                    router.push("/admin");
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <Settings size={14} />
                  Administração
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors"
                style={{ color: "var(--danger)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <LogOut size={14} />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
