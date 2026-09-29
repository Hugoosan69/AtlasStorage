"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("denied")) {
      setError("Sua conta não tem acesso ao Atlas ou está inativa.");
      createClient().auth.signOut();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    if (!res.ok) {
      setError("Usuário ou senha inválidos");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div
        className="hidden lg:flex flex-col items-center justify-center p-12 text-white relative overflow-hidden"
        style={{ background: "#080e1b" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-full.jpg" alt="Atlas Storage" className="w-[26rem] max-w-full h-auto" />
        <p className="mt-2 max-w-sm text-center text-white/60">
          Seus arquivos do Google Drive, organizados e com permissões sob controle.
        </p>
        <p className="absolute bottom-8 text-sm text-white/35">© {new Date().getFullYear()} Atlas Storage</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="w-11 h-11" />
            <div className="leading-tight">
              <div className="font-bold text-lg tracking-wide">ATLAS</div>
              <div className="text-[11px] font-semibold tracking-[0.3em]" style={{ color: "var(--accent)" }}>STORAGE</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm mt-1 mb-8" style={{ color: "var(--text-2)" }}>
            Use o usuário e a senha fornecidos pelo administrador.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="username">Usuário</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus
                className="input h-11"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu.usuario"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="input h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded"
                  style={{ color: "var(--text-3)" }}
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full h-11">
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
