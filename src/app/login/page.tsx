"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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

    const { error: authError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Email ou senha inválidos");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #312e81 0%, #4f46e5 55%, #7c3aed 100%)" }}
      >
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center font-bold">A</div>
          <span className="font-semibold text-lg">Atlas</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Seus arquivos, organizados e seguros.
          </h2>
          <p className="mt-4 text-white/70">
            Acesse, envie e compartilhe documentos da equipe com permissões sob controle.
          </p>
        </div>
        <p className="text-sm text-white/50 relative z-10">© {new Date().getFullYear()} Atlas</p>
        <div className="absolute -right-32 -bottom-32 w-[28rem] h-[28rem] rounded-full bg-white/10" />
        <div className="absolute right-24 top-24 w-40 h-40 rounded-full bg-white/5" />
      </div>

      <div className="flex items-center justify-center px-5 py-12" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--accent), #a855f7)" }}
            >
              A
            </div>
            <span className="font-semibold text-lg">Atlas</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm mt-1 mb-8" style={{ color: "var(--text-2)" }}>
            Use o email e a senha fornecidos pelo administrador.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm px-3 py-2.5 rounded-lg" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                className="input h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
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
