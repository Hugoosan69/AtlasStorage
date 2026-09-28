"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users,
  KeyRound,
  Activity,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  HardDrive,
  CheckCircle2,
  FolderPlus,
} from "lucide-react";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MoveDialog } from "@/components/file-browser/MoveDialog";
import { FileIcon } from "@/components/file-browser/FileIcon";
import type { AppUser, AuditLog, Permission } from "@/types";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

const TABS = [
  { id: "users", label: "Usuários", icon: Users },
  { id: "permissions", label: "Permissões", icon: KeyRound },
  { id: "activity", label: "Atividade", icon: Activity },
  { id: "settings", label: "Configurações", icon: Settings },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminPanel({ currentUser }: { currentUser: AppUser }) {
  const [tab, setTab] = useState<TabId>("users");
  const toast = useToast();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("google") === "connected") {
      toast("Google Drive conectado com sucesso", "success");
      setTab("settings");
    } else if (p.get("error")) {
      const msgs: Record<string, string> = {
        no_refresh_token: "O Google não retornou o token. Remova o acesso do app na sua conta Google e tente de novo.",
        oauth_failed: "Falha ao conectar com o Google.",
        no_code: "Conexão cancelada.",
      };
      toast(msgs[p.get("error")!] || "Erro ao conectar", "error");
      setTab("settings");
    }
    if (p.toString()) window.history.replaceState(null, "", "/admin");
  }, [toast]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <h1 className="text-xl font-semibold mb-1">Administração</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>
          Gerencie usuários, permissões por pasta e a conexão com o Google Drive.
        </p>

        <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-3 h-10 text-sm font-medium -mb-px whitespace-nowrap"
              style={{
                color: tab === id ? "var(--accent)" : "var(--text-2)",
                borderBottom: `2px solid ${tab === id ? "var(--accent)" : "transparent"}`,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && <UsersTab currentUser={currentUser} />}
        {tab === "permissions" && <PermissionsTab />}
        {tab === "activity" && <ActivityTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16" style={{ color: "var(--text-3)" }}>
      <Loader2 className="animate-spin" size={22} />
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "danger" | "success" }) {
  const styles = {
    neutral: { background: "var(--surface-2)", color: "var(--text-2)" },
    accent: { background: "var(--accent-soft)", color: "var(--accent)" },
    danger: { background: "var(--danger-soft)", color: "var(--danger)" },
    success: { background: "color-mix(in srgb, var(--success) 14%, transparent)", color: "var(--success)" },
  };
  return (
    <span className="inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium" style={styles[tone]}>
      {children}
    </span>
  );
}

/* ---------------- Users ---------------- */

function UsersTab({ currentUser }: { currentUser: AppUser }) {
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);

  const load = useCallback(() => {
    api("/api/admin/users").then(setUsers).catch((e) => toast(e.message, "error"));
  }, [toast]);
  useEffect(load, [load]);

  if (!users) return <Spinner />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm" style={{ color: "var(--text-2)" }}>{users.length} usuários</p>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> Novo usuário
        </button>
      </div>
      <div className="card overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {u.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{u.name}</span>
                {u.role === "admin" && <Badge tone="accent">Admin</Badge>}
                {!u.is_active && <Badge tone="danger">Inativo</Badge>}
                {u.id === currentUser.id && <Badge>Você</Badge>}
              </div>
              <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>{u.email}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setEditing(u)} aria-label="Editar">
              <Pencil size={16} />
            </button>
          </div>
        ))}
      </div>
      <UserModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function UserModal({
  target,
  onClose,
  onSaved,
}: {
  target: AppUser | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = target === "new";
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", is_active: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(
      target === "new"
        ? { name: "", email: "", password: "", role: "user", is_active: true }
        : { name: target.name, email: target.email, password: "", role: target.role, is_active: target.is_active }
    );
  }, [target]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) {
        await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
        toast("Usuário criado", "success");
      } else if (target) {
        await api("/api/admin/users", {
          method: "PATCH",
          body: JSON.stringify({
            id: target.id,
            name: form.name,
            role: form.role,
            is_active: form.is_active,
            password: form.password || undefined,
          }),
        });
        toast("Usuário atualizado", "success");
      }
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!target} title={isNew ? "Novo usuário" : "Editar usuário"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            required
            disabled={!isNew}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">{isNew ? "Senha" : "Nova senha (deixe vazio para manter)"}</label>
          <input
            className="input"
            type="password"
            required={isNew}
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Perfil</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {!isNew && (
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.is_active ? "1" : "0"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "1" })}
              >
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Permissions ---------------- */

const PERM_FIELDS: Array<{ key: keyof Permission; label: string }> = [
  { key: "can_view", label: "Visualizar" },
  { key: "can_download", label: "Baixar" },
  { key: "can_upload", label: "Enviar" },
  { key: "can_create_folder", label: "Criar pastas" },
  { key: "can_rename_files", label: "Renomear arquivos" },
  { key: "can_rename_folders", label: "Renomear pastas" },
  { key: "can_move_files", label: "Mover arquivos" },
  { key: "can_move_folders", label: "Mover pastas" },
  { key: "can_delete_files", label: "Excluir arquivos" },
  { key: "can_delete_folders", label: "Excluir pastas" },
  { key: "inherit", label: "Aplicar às subpastas" },
];

function PermissionsTab() {
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [userId, setUserId] = useState("");
  const [perms, setPerms] = useState<Permission[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<Permission | null>(null);

  useEffect(() => {
    api("/api/admin/users")
      .then((all: AppUser[]) => {
        const regular = all.filter((u) => u.role !== "admin");
        setUsers(regular);
        if (regular[0]) setUserId(regular[0].id);
      })
      .catch((e) => toast(e.message, "error"));
  }, [toast]);

  const load = useCallback(() => {
    if (!userId) return;
    setPerms(null);
    api(`/api/admin/permissions?userId=${userId}`).then(setPerms).catch((e) => toast(e.message, "error"));
  }, [userId, toast]);
  useEffect(load, [load]);

  async function toggle(p: Permission, key: keyof Permission) {
    const value = !p[key];
    setPerms((all) => all?.map((x) => (x.id === p.id ? { ...x, [key]: value } : x)) ?? null);
    try {
      await api("/api/admin/permissions", { method: "PATCH", body: JSON.stringify({ id: p.id, [key]: value }) });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
      load();
    }
  }

  async function addFolder(folderId: string, folderName: string) {
    try {
      await api("/api/admin/permissions", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          folder_drive_id: folderId,
          folder_name: folderName,
          can_view: true,
          can_download: true,
          inherit: true,
        }),
      });
      toast(`Acesso a "${folderName}" adicionado`, "success");
      setPicking(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  if (!users) return <Spinner />;
  if (users.length === 0)
    return (
      <div className="card p-8 text-center text-sm" style={{ color: "var(--text-2)" }}>
        Nenhum usuário comum cadastrado. Administradores já têm acesso total.
      </div>
    );

  return (
    <div className="grid md:grid-cols-[14rem_1fr] gap-5">
      <div className="card p-1.5 h-fit">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setUserId(u.id)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm"
            style={{
              background: userId === u.id ? "var(--accent-soft)" : "transparent",
              color: userId === u.id ? "var(--accent)" : "var(--text)",
            }}
          >
            <div className="font-medium">{u.name}</div>
            <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>{u.email}</div>
          </button>
        ))}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4 gap-3">
          <p className="text-sm" style={{ color: "var(--text-2)" }}>
            Pastas que <strong style={{ color: "var(--text)" }}>{users.find((u) => u.id === userId)?.name}</strong> pode acessar
          </p>
          <button className="btn btn-primary" onClick={() => setPicking(true)}>
            <FolderPlus size={16} /> Adicionar pasta
          </button>
        </div>

        {!perms ? (
          <Spinner />
        ) : perms.length === 0 ? (
          <div className="card p-8 text-center text-sm" style={{ color: "var(--text-2)" }}>
            Nenhuma pasta liberada. Sem permissões, o usuário não vê nenhum conteúdo.
          </div>
        ) : (
          <div className="space-y-3">
            {perms.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileIcon mimeType="application/vnd.google-apps.folder" />
                  <span className="font-medium text-sm flex-1 truncate">{p.folder_name || p.folder_drive_id}</span>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: "var(--danger)" }}
                    onClick={() => setRemoving(p)}
                    aria-label="Remover acesso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {PERM_FIELDS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[var(--accent)]"
                        checked={!!p[key]}
                        onChange={() => toggle(p, key)}
                      />
                      <span style={{ color: key === "inherit" ? "var(--text-2)" : undefined }}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MoveDialog
        open={picking}
        items={[]}
        startFolderId=""
        pickMode
        title="Escolha a pasta"
        confirmText="Liberar esta pasta"
        onClose={() => setPicking(false)}
        onMove={addFolder}
      />
      <ConfirmModal
        open={!!removing}
        title="Remover acesso"
        danger
        confirmText="Remover"
        message={<>O usuário perderá o acesso a <strong>{removing?.folder_name}</strong>.</>}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          try {
            await api(`/api/admin/permissions?id=${removing!.id}`, { method: "DELETE" });
            setRemoving(null);
            load();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Erro", "error");
          }
        }}
      />
    </div>
  );
}

/* ---------------- Activity ---------------- */

const ACTIONS: Record<string, string> = {
  "file.upload": "Enviou",
  "file.download": "Baixou",
  "file.rename": "Renomeou arquivo",
  "folder.rename": "Renomeou pasta",
  "file.move": "Moveu arquivo",
  "folder.move": "Moveu pasta",
  "file.delete": "Excluiu arquivo",
  "folder.delete": "Excluiu pasta",
  "folder.create": "Criou pasta",
};

function ActivityTab() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  useEffect(() => {
    api("/api/admin/audit").then(setLogs).catch((e) => toast(e.message, "error"));
  }, [toast]);

  if (!logs) return <Spinner />;
  if (!logs.length)
    return <div className="card p-8 text-center text-sm" style={{ color: "var(--text-2)" }}>Nenhuma atividade registrada ainda.</div>;

  return (
    <div className="card overflow-hidden">
      {logs.map((l) => (
        <div key={l.id} className="flex items-start sm:items-center gap-3 px-4 py-3 text-sm flex-col sm:flex-row" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex-1 min-w-0">
            <span className="font-medium">{l.user_email}</span>{" "}
            <span style={{ color: "var(--text-2)" }}>{(ACTIONS[l.action] || l.action).toLowerCase()}</span>{" "}
            <span className="font-medium break-all">{l.target_name}</span>
          </div>
          <span className="text-xs shrink-0" style={{ color: "var(--text-3)" }}>
            {new Date(l.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsTab() {
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [rootId, setRootId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api("/api/admin/settings")
      .then((rows: Array<{ key: string; value: string }>) => {
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
        setSettings(map);
        setRootId(map.root_folder_id || "");
      })
      .catch((e) => toast(e.message, "error"));
  }, [toast]);
  useEffect(load, [load]);

  async function connect() {
    try {
      const { url } = await api("/api/auth/google");
      window.location.href = url;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  async function saveRoot(e: React.FormEvent) {
    e.preventDefault();
    const match = rootId.match(/folders\/([\w-]+)/);
    const id = match ? match[1] : rootId.trim();
    setSaving(true);
    try {
      await api("/api/admin/settings", { method: "PATCH", body: JSON.stringify({ key: "root_folder_id", value: id }) });
      setRootId(id);
      toast("Pasta raiz salva", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <Spinner />;
  const connected = !!settings.google_refresh_token;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: connected ? "color-mix(in srgb, var(--success) 14%, transparent)" : "var(--warning-soft)", color: connected ? "var(--success)" : "var(--warning)" }}
          >
            {connected ? <CheckCircle2 size={20} /> : <HardDrive size={20} />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Google Drive</h3>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              {connected
                ? "Conectado. O Atlas acessa o Drive usando esta conta."
                : "Não conectado. Entre com a conta Google que é dona da pasta Atlas."}
            </p>
          </div>
          <button className={`btn ${connected ? "" : "btn-primary"}`} onClick={connect}>
            {connected ? "Reconectar" : "Conectar"}
          </button>
        </div>
      </div>

      <form onSubmit={saveRoot} className="card p-5">
        <h3 className="font-semibold text-sm">Pasta raiz</h3>
        <p className="text-sm mt-0.5 mb-3" style={{ color: "var(--text-2)" }}>
          Cole o link ou o ID da pasta Atlas no Google Drive.
        </p>
        <div className="flex gap-2">
          <input className="input font-mono text-xs" value={rootId} onChange={(e) => setRootId(e.target.value)} />
          <button className="btn btn-primary" disabled={saving || !rootId.trim()}>Salvar</button>
        </div>
      </form>
    </div>
  );
}
