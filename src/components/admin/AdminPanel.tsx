"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Download,
  Eye,
  FolderInput,
  FolderPlus,
  HardDrive,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MoveDialog } from "@/components/file-browser/MoveDialog";
import { FolderGlyph } from "@/components/file-browser/FileIcon";
import { avatarColor, initials } from "@/components/AppShell";
import { api } from "@/lib/drive-client";
import { formatDateTime, formatRelative } from "@/lib/file-types";
import type { AppUser, AuditLog, Permission, UserPermissions } from "@/types";

const TABS = [
  { id: "users", label: "Usuários", icon: Users },
  { id: "groups", label: "Grupos", icon: UsersRound },
  { id: "permissions", label: "Permissões", icon: KeyRound },
  { id: "activity", label: "Atividade", icon: Activity },
  { id: "settings", label: "Configurações", icon: Settings },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function AdminPanel({ currentUser }: { currentUser: AppUser }) {
  const [tab, setTab] = useState<TabId>("users");
  const [focusUser, setFocusUser] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const fromUrl = p.get("tab");
    if (TABS.some((t) => t.id === fromUrl)) setTab(fromUrl as TabId);

    if (p.get("google") === "connected") {
      toast("Google Drive conectado com sucesso", "success");
      setTab("settings");
    } else if (p.get("error")) {
      const messages: Record<string, string> = {
        no_refresh_token: "O Google não enviou a autorização. Remova o acesso do app na sua conta Google e conecte de novo.",
        oauth_failed: "Não foi possível concluir a conexão com o Google.",
        no_code: "Conexão cancelada.",
      };
      toast(messages[p.get("error")!] || "Erro ao conectar", "error");
      setTab("settings");
    }
    if (p.has("google") || p.has("error")) window.history.replaceState(null, "", "/admin?tab=settings");
  }, [toast]);

  function select(id: TabId) {
    setTab(id);
    window.history.replaceState(null, "", `/admin?tab=${id}`);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
        <p className="text-sm mt-1 mb-6" style={{ color: "var(--text-2)" }}>
          Gerencie quem acessa o Atlas, o que cada pessoa pode fazer e a conexão com o Google Drive.
        </p>

        <div className="flex gap-1 mb-6 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }} role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => select(id)}
              className="flex items-center gap-2 px-3 h-10 text-sm font-medium -mb-px whitespace-nowrap transition-colors"
              style={{
                color: tab === id ? "var(--text)" : "var(--text-3)",
                borderBottom: `2px solid ${tab === id ? "var(--accent)" : "transparent"}`,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <UsersTab
            currentUser={currentUser}
            onManagePermissions={(id) => {
              setFocusUser(id);
              select("permissions");
            }}
          />
        )}
        {tab === "groups" && <GroupsTab />}
        {tab === "permissions" && <PermissionsTab initialUser={focusUser} />}
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

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "danger" }) {
  const styles = {
    neutral: { background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" },
    accent: { background: "var(--accent-soft)", color: "var(--accent)" },
    danger: { background: "var(--danger-soft)", color: "var(--danger)" },
  };
  return (
    <span className="inline-flex items-center px-2 h-5 rounded-full text-[11px] font-medium" style={styles[tone]}>
      {children}
    </span>
  );
}

function Avatar({ user, size = 36 }: { user: AppUser; size?: number }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, background: avatarColor(user.email), opacity: user.is_active ? 1 : 0.45 }}
    >
      {initials(user.name)}
    </div>
  );
}

/* ---------------- Users ---------------- */

function UsersTab({ currentUser, onManagePermissions }: { currentUser: AppUser; onManagePermissions: (id: string) => void }) {
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);

  const load = useCallback(() => {
    api<AppUser[]>("/api/admin/users").then(setUsers).catch((e) => toast(e.message, "error"));
  }, [toast]);
  useEffect(load, [load]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (users || []).filter((u) => !q || u.name.toLowerCase().includes(q) || u.username.includes(q));
  }, [users, filter]);

  if (!users) return <Spinner />;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
        <div className="relative sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
          <input className="input pl-9" placeholder="Buscar por nome ou usuário" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="card overflow-hidden">
        <div
          className="hidden sm:grid grid-cols-[minmax(0,1fr)_10rem_9rem_5.5rem] gap-4 px-4 h-10 items-center text-xs font-medium"
          style={{ color: "var(--text-3)", borderBottom: "1px solid var(--border)" }}
        >
          <span>Usuário</span>
          <span>Perfil</span>
          <span>Último acesso</span>
          <span />
        </div>
        {visible.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_10rem_9rem_5.5rem] gap-x-4 gap-y-1 px-4 py-3 items-center"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar user={u} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{u.name}</span>
                  {u.id === currentUser.id && <Badge>Você</Badge>}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>@{u.username}</div>
              </div>
            </div>
            <div className="hidden sm:flex gap-1.5">
              {u.role === "admin" ? <Badge tone="accent">Administrador</Badge> : <Badge>Usuário</Badge>}
              {!u.is_active && <Badge tone="danger">Inativo</Badge>}
            </div>
            <span className="hidden sm:block text-[13px]" style={{ color: "var(--text-2)" }} title={u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : undefined}>
              {u.last_sign_in_at ? formatRelative(u.last_sign_in_at) : "Nunca entrou"}
            </span>
            <div className="flex justify-end gap-0.5">
              {u.role !== "admin" && (
                <button className="btn btn-ghost btn-icon" onClick={() => onManagePermissions(u.id)} title="Permissões" aria-label={`Permissões de ${u.name}`}>
                  <KeyRound size={16} />
                </button>
              )}
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(u)} title="Editar" aria-label={`Editar ${u.name}`}>
                <Pencil size={16} />
              </button>
            </div>
          </div>
        ))}
        {!visible.length && (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-3)" }}>Nenhum usuário encontrado.</div>
        )}
      </div>

      <UserModal
        target={editing}
        currentUser={currentUser}
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
  currentUser,
  onClose,
  onSaved,
}: {
  target: AppUser | "new" | null;
  currentUser: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = target === "new";
  const isSelf = target !== "new" && target?.id === currentUser.id;
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "user", is_active: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(
      target === "new"
        ? { name: "", username: "", password: "", role: "user", is_active: true }
        : { name: target.name, username: target.username, password: "", role: target.role, is_active: target.is_active }
    );
  }, [target]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) {
        await api("/api/admin/users", { method: "POST", json: form });
        toast(`${form.name} foi adicionado(a)`, "success");
      } else if (target) {
        await api("/api/admin/users", {
          method: "PATCH",
          json: {
            id: target.id,
            name: form.name,
            username: form.username,
            role: form.role,
            is_active: form.is_active,
            password: form.password || undefined,
          },
        });
        toast("Alterações salvas", "success");
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
          <label className="label" htmlFor="u-name">Nome</label>
          <input id="u-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="u-username">Usuário (usado para entrar)</label>
          <input
            id="u-username"
            className="input"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            pattern="[a-zA-Z0-9._\-]{3,30}"
            title="3 a 30 caracteres: letras, números, ponto, hífen ou _"
            placeholder="ex.: maria.silva"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, "") })}
          />
        </div>
        <div>
          <label className="label" htmlFor="u-pass">{isNew ? "Senha" : "Nova senha"}</label>
          <input
            id="u-pass"
            className="input"
            type="password"
            autoComplete="new-password"
            required={isNew}
            minLength={6}
            placeholder={isNew ? "Mínimo de 6 caracteres" : "Deixe em branco para manter a atual"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="u-role">Perfil</label>
            <select id="u-role" className="input" value={form.role} disabled={isSelf} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {!isNew && (
            <div>
              <label className="label" htmlFor="u-status">Status</label>
              <select
                id="u-status"
                className="input"
                disabled={isSelf}
                value={form.is_active ? "1" : "0"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "1" })}
              >
                <option value="1">Ativo</option>
                <option value="0">Inativo (sem acesso)</option>
              </select>
            </div>
          )}
        </div>
        {form.role === "admin" && (
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Administradores têm acesso total a todas as pastas e a esta área de administração.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Salvando..." : isNew ? "Criar usuário" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Groups ---------------- */

interface GroupRow {
  id: string;
  name: string;
  description?: string | null;
  members: string[];
}

function GroupsTab() {
  const toast = useToast();
  const [groups, setGroups] = useState<GroupRow[] | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editing, setEditing] = useState<GroupRow | "new" | null>(null);
  const [removing, setRemoving] = useState<GroupRow | null>(null);

  const load = useCallback(() => {
    Promise.all([api<GroupRow[]>("/api/admin/groups"), api<AppUser[]>("/api/admin/users")])
      .then(([g, u]) => {
        setGroups(g);
        setUsers(u.filter((x) => x.role !== "admin"));
      })
      .catch((e) => toast(e.message, "error"));
  }, [toast]);
  useEffect(load, [load]);

  if (!groups) return <Spinner />;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--text-2)" }}>
          Agrupe pessoas do mesmo setor e libere pastas para o grupo inteiro na aba Permissões.
        </p>
        <button className="btn btn-primary shrink-0" onClick={() => setEditing("new")}>
          <Plus size={16} /> Novo grupo
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="empty-icon mx-auto"><UsersRound size={26} strokeWidth={1.6} /></div>
          <p className="font-medium">Nenhum grupo criado</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Exemplo: Financeiro, Marketing, RH.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {groups.map((g) => {
            const members = users.filter((u) => g.members.includes(u.id));
            return (
              <div key={g.id} className="card p-4 sm:p-5 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                    <UsersRound size={19} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{g.name}</div>
                    <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                      {g.description || `${members.length} membro(s)`}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={() => setEditing(g)} aria-label={`Editar ${g.name}`}>
                    <Pencil size={16} />
                  </button>
                  <button className="btn btn-ghost btn-icon" style={{ color: "var(--danger)" }} onClick={() => setRemoving(g)} aria-label={`Excluir ${g.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {members.length === 0 ? (
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>Sem membros</span>
                  ) : (
                    members.map((u) => (
                      <span key={u.id} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2.5 rounded-full text-xs" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                        <Avatar user={u} size={20} />
                        {u.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GroupModal
        target={editing}
        users={users}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
      <ConfirmModal
        open={!!removing}
        title="Excluir grupo?"
        danger
        confirmText="Excluir grupo"
        message={<>O grupo <strong style={{ color: "var(--text)" }}>{removing?.name}</strong> e as pastas liberadas para ele serão removidos. Os usuários continuam existindo.</>}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          try {
            await api(`/api/admin/groups?id=${removing!.id}`, { method: "DELETE" });
            toast("Grupo excluído", "success");
            setRemoving(null);
            load();
          } catch (e) {
            toast(e instanceof Error ? e.message : "Erro", "error");
          }
        }}
      />
    </>
  );
}

function GroupModal({
  target,
  users,
  onClose,
  onSaved,
}: {
  target: GroupRow | "new" | null;
  users: AppUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "", members: [] as string[] });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!target) return;
    setForm(
      target === "new"
        ? { name: "", description: "", members: [] }
        : { name: target.name, description: target.description || "", members: target.members }
    );
  }, [target]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (target === "new") await api("/api/admin/groups", { method: "POST", json: form });
      else if (target) await api("/api/admin/groups", { method: "PATCH", json: { id: target.id, ...form } });
      toast("Grupo salvo", "success");
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro", "error");
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    setForm((f) => ({ ...f, members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id] }));

  return (
    <Modal open={!!target} title={target === "new" ? "Novo grupo" : "Editar grupo"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="label" htmlFor="g-name">Nome</label>
          <input id="g-name" className="input" required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex.: Financeiro" />
        </div>
        <div>
          <label className="label" htmlFor="g-desc">Descrição (opcional)</label>
          <input id="g-desc" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <div className="label">Membros</div>
          {users.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Nenhum usuário comum cadastrado.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-3 px-3 h-11 text-sm cursor-pointer select-none" style={{ borderBottom: "1px solid var(--border)" }}>
                  <input type="checkbox" className="w-4 h-4" style={{ accentColor: "var(--accent)" }} checked={form.members.includes(u.id)} onChange={() => toggle(u.id)} />
                  <Avatar user={u} size={24} />
                  <span className="flex-1 truncate">{u.name}</span>
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>@{u.username}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Permissions ---------------- */

const PERM_FIELDS: Array<{ key: keyof UserPermissions; label: string }> = [
  { key: "can_view", label: "Ver e pré-visualizar" },
  { key: "can_download", label: "Baixar" },
  { key: "can_upload", label: "Enviar arquivos" },
  { key: "can_create_folder", label: "Criar pastas" },
  { key: "can_rename_files", label: "Renomear arquivos" },
  { key: "can_rename_folders", label: "Renomear pastas" },
  { key: "can_move_files", label: "Mover arquivos" },
  { key: "can_move_folders", label: "Mover pastas" },
  { key: "can_delete_files", label: "Excluir arquivos" },
  { key: "can_delete_folders", label: "Excluir pastas" },
];

const allOff = Object.fromEntries(PERM_FIELDS.map((f) => [f.key, false])) as unknown as UserPermissions;

const PRESETS: Array<{ id: string; label: string; description: string; perms: UserPermissions }> = [
  { id: "read", label: "Leitura", description: "Ver e pré-visualizar", perms: { ...allOff, can_view: true } },
  { id: "download", label: "Leitura + download", description: "Ver e baixar", perms: { ...allOff, can_view: true, can_download: true } },
  {
    id: "contributor",
    label: "Colaborador",
    description: "Ver, baixar, enviar e criar pastas",
    perms: { ...allOff, can_view: true, can_download: true, can_upload: true, can_create_folder: true, can_rename_files: true },
  },
  {
    id: "editor",
    label: "Editor",
    description: "Tudo, menos excluir pastas",
    perms: {
      can_view: true, can_download: true, can_upload: true, can_create_folder: true, can_rename_files: true,
      can_rename_folders: true, can_move_files: true, can_move_folders: true, can_delete_files: true, can_delete_folders: false,
    },
  },
  {
    id: "full",
    label: "Controle total",
    description: "Todas as permissões",
    perms: Object.fromEntries(PERM_FIELDS.map((f) => [f.key, true])) as unknown as UserPermissions,
  },
];

function presetOf(p: Permission) {
  return PRESETS.find((preset) => PERM_FIELDS.every(({ key }) => !!p[key] === preset.perms[key]))?.id ?? "custom";
}

function PermissionsTab({ initialUser }: { initialUser: string | null }) {
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [subject, setSubject] = useState("");
  const [perms, setPerms] = useState<Permission[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState<Permission | null>(null);

  useEffect(() => {
    Promise.all([api<AppUser[]>("/api/admin/users"), api<GroupRow[]>("/api/admin/groups")])
      .then(([all, grs]) => {
        const regular = all.filter((u) => u.role !== "admin");
        setUsers(regular);
        setGroups(grs);
        const first = regular.find((u) => u.id === initialUser) ?? regular[0];
        setSubject(first ? `u:${first.id}` : grs[0] ? `g:${grs[0].id}` : "");
      })
      .catch((e) => toast(e.message, "error"));
  }, [toast, initialUser]);

  const [kind, subjectId] = subject.split(":") as ["u" | "g", string];
  const subjectName =
    kind === "g" ? `o grupo ${groups.find((g) => g.id === subjectId)?.name ?? ""}` : users?.find((u) => u.id === subjectId)?.name;

  const load = useCallback(() => {
    if (!subject) return;
    const [k, id] = subject.split(":");
    setPerms(null);
    api<Permission[]>(`/api/admin/permissions?${k === "g" ? "groupId" : "userId"}=${id}`)
      .then(setPerms)
      .catch((e) => toast(e.message, "error"));
  }, [subject, toast]);
  useEffect(load, [load]);

  async function update(p: Permission, changes: Partial<Permission>) {
    setPerms((all) => all?.map((x) => (x.id === p.id ? { ...x, ...changes } : x)) ?? null);
    try {
      await api("/api/admin/permissions", { method: "PATCH", json: { id: p.id, ...changes } });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
      load();
    }
  }

  async function addFolder(folderId: string, folderName: string) {
    if (perms?.some((p) => p.folder_drive_id === folderId)) {
      toast(`"${folderName}" já está na lista`, "info");
      setPicking(false);
      return;
    }
    try {
      await api("/api/admin/permissions", {
        method: "POST",
        json: { [kind === "g" ? "group_id" : "user_id"]: subjectId, folder_drive_id: folderId, folder_name: folderName, ...PRESETS[1].perms, inherit: true },
      });
      toast(`Acesso a "${folderName}" liberado`, "success");
      setPicking(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro", "error");
    }
  }

  if (!users) return <Spinner />;
  if (users.length === 0 && groups.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-medium">Nenhum usuário comum cadastrado</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Administradores já têm acesso total. Crie um usuário na aba Usuários.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[15rem_1fr] gap-6">
      <div className="md:hidden">
        <label className="label" htmlFor="perm-user">Usuário ou grupo</label>
        <select id="perm-user" className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {users.map((u) => (
            <option key={u.id} value={`u:${u.id}`}>{u.name}</option>
          ))}
          {groups.map((g) => (
            <option key={g.id} value={`g:${g.id}`}>Grupo: {g.name}</option>
          ))}
        </select>
      </div>
      <div className="hidden md:block card p-1.5 h-fit">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSubject(`u:${u.id}`)}
            className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ background: subject === `u:${u.id}` ? "var(--selected)" : "transparent" }}
          >
            <Avatar user={u} size={30} />
            <div className="min-w-0">
              <div className="font-medium truncate">{u.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>@{u.username}</div>
            </div>
          </button>
        ))}
        {groups.length > 0 && (
          <div className="px-2.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            Grupos
          </div>
        )}
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setSubject(`g:${g.id}`)}
            className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg text-sm transition-colors"
            style={{ background: subject === `g:${g.id}` ? "var(--selected)" : "transparent" }}
          >
            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <UsersRound size={15} />
            </div>
            <div className="min-w-0">
              <div className="font-medium truncate">{g.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-3)" }}>{g.members.length} membro(s)</div>
            </div>
          </button>
        ))}
      </div>

      <div className="min-w-0">
        <div className="flex justify-between items-start mb-4 gap-3">
          <div>
            <h2 className="font-semibold">Pastas liberadas para {subjectName}</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              As permissões valem para a pasta e, se marcado, para todas as subpastas.
            </p>
          </div>
          <button className="btn btn-primary shrink-0" onClick={() => setPicking(true)}>
            <FolderPlus size={16} /> <span className="hidden sm:inline">Liberar pasta</span>
          </button>
        </div>

        {!perms ? (
          <Spinner />
        ) : perms.length === 0 ? (
          <div className="card p-10 text-center">
            <FolderGlyph size={44} />
            <p className="font-medium mt-3">Nenhuma pasta liberada</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Sem permissões, este usuário não vê nenhum conteúdo.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {perms.map((p) => {
              const preset = presetOf(p);
              return (
                <div key={p.id} className="card p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <FolderGlyph size={24} />
                    <span className="font-medium text-sm flex-1 truncate">{p.folder_name || p.folder_drive_id}</span>
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ color: "var(--danger)" }}
                      onClick={() => setRemoving(p)}
                      aria-label="Remover acesso"
                      title="Remover acesso"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {PRESETS.map((option) => (
                      <button
                        key={option.id}
                        title={option.description}
                        onClick={() => update(p, option.perms)}
                        className="h-7 px-2.5 rounded-full text-xs font-medium transition-colors"
                        style={
                          preset === option.id
                            ? { background: "var(--accent)", color: "var(--accent-text)" }
                            : { background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }
                        }
                      >
                        {option.label}
                      </button>
                    ))}
                    {preset === "custom" && (
                      <span className="h-7 px-2.5 rounded-full text-xs font-medium inline-flex items-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                        Personalizado
                      </span>
                    )}
                  </div>

                  <details className="mt-3 group">
                    <summary className="text-xs cursor-pointer select-none" style={{ color: "var(--text-3)" }}>
                      Ajustar permissões individualmente
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                      {PERM_FIELDS.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            style={{ accentColor: "var(--accent)" }}
                            checked={!!p[key]}
                            onChange={() => update(p, { [key]: !p[key] })}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </details>

                  <label className="flex items-center gap-2.5 text-[13px] cursor-pointer select-none mt-3 pt-3" style={{ borderTop: "1px solid var(--border)", color: "var(--text-2)" }}>
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      style={{ accentColor: "var(--accent)" }}
                      checked={p.inherit}
                      onChange={() => update(p, { inherit: !p.inherit })}
                    />
                    Aplicar também a todas as subpastas
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MoveDialog
        open={picking}
        items={[]}
        startFolderId=""
        pickMode
        title="Escolha a pasta para liberar"
        confirmText="Liberar esta pasta"
        onClose={() => setPicking(false)}
        onMove={addFolder}
      />
      <ConfirmModal
        open={!!removing}
        title="Remover acesso?"
        danger
        confirmText="Remover"
        message={
          <>
            {subjectName} perderá o acesso a <strong style={{ color: "var(--text)" }}>{removing?.folder_name}</strong>.
          </>
        }
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

const ACTIONS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  "file.upload": { label: "enviou", icon: Upload, color: "#2f6feb" },
  "file.download": { label: "baixou", icon: Download, color: "#1e9e5a" },
  "file.view": { label: "visualizou", icon: Eye, color: "#64748b" },
  "file.rename": { label: "renomeou o arquivo", icon: Pencil, color: "#b7791f" },
  "folder.rename": { label: "renomeou a pasta", icon: Pencil, color: "#b7791f" },
  "file.move": { label: "moveu o arquivo", icon: FolderInput, color: "#7c3aed" },
  "folder.move": { label: "moveu a pasta", icon: FolderInput, color: "#7c3aed" },
  "file.delete": { label: "excluiu o arquivo", icon: Trash2, color: "#e5484d" },
  "folder.delete": { label: "excluiu a pasta", icon: Trash2, color: "#e5484d" },
  "file.restore": { label: "restaurou o arquivo", icon: RotateCcw, color: "#0891b2" },
  "folder.restore": { label: "restaurou a pasta", icon: RotateCcw, color: "#0891b2" },
  "folder.create": { label: "criou a pasta", icon: FolderPlus, color: "#e3a632" },
};

const ACTION_GROUPS: Array<{ id: string; label: string; match: (a: string) => boolean }> = [
  { id: "all", label: "Todas as ações", match: () => true },
  { id: "upload", label: "Envios", match: (a) => a === "file.upload" },
  { id: "download", label: "Downloads", match: (a) => a === "file.download" },
  { id: "view", label: "Visualizações", match: (a) => a === "file.view" },
  { id: "change", label: "Alterações", match: (a) => /rename|move|create|restore/.test(a) },
  { id: "delete", label: "Exclusões", match: (a) => a.endsWith(".delete") },
];

function dayLabel(date: Date) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function ActivityTab() {
  const toast = useToast();
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [who, setWho] = useState("all");
  const [kind, setKind] = useState("all");

  useEffect(() => {
    api<AuditLog[]>("/api/admin/audit").then(setLogs).catch((e) => toast(e.message, "error"));
  }, [toast]);

  const people = useMemo(() => [...new Set((logs || []).map((l) => l.user_email).filter(Boolean))] as string[], [logs]);

  const groups = useMemo(() => {
    const match = ACTION_GROUPS.find((g) => g.id === kind)!.match;
    const filtered = (logs || []).filter((l) => (who === "all" || l.user_email === who) && match(l.action));
    const byDay = new Map<string, AuditLog[]>();
    for (const log of filtered) {
      const label = dayLabel(new Date(log.created_at));
      byDay.set(label, [...(byDay.get(label) || []), log]);
    }
    return [...byDay.entries()];
  }, [logs, who, kind]);

  if (!logs) return <Spinner />;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <select className="input sm:w-64" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filtrar por usuário">
          <option value="all">Todos os usuários</option>
          {people.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="input sm:w-52" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filtrar por ação">
          {ACTION_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
      </div>

      {!groups.length ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-2)" }}>Nenhuma atividade encontrada.</div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, entries]) => (
            <section key={day}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 first-letter:uppercase" style={{ color: "var(--text-3)" }}>{day}</h3>
              <div className="card overflow-hidden">
                {entries.map((l) => {
                  const meta = ACTIONS[l.action] ?? { label: l.action, icon: Activity, color: "#64748b" };
                  const Icon = meta.icon;
                  return (
                    <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{l.user_email?.split("@")[0]}</span>{" "}
                        <span style={{ color: "var(--text-2)" }}>{meta.label}</span>{" "}
                        <span className="font-medium break-all">{l.target_name}</span>
                        {typeof l.details?.oldName === "string" && (
                          <span style={{ color: "var(--text-3)" }}> (antes: {l.details.oldName})</span>
                        )}
                      </div>
                      <span className="text-xs shrink-0 tabular-nums" style={{ color: "var(--text-3)" }} title={formatDateTime(l.created_at)}>
                        {new Date(l.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Settings ---------------- */

function SettingsTab() {
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [rootId, setRootId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<Array<{ key: string; value: string }>>("/api/admin/settings")
      .then((rows) => {
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
        setSettings(map);
        setRootId(map.root_folder_id || "");
      })
      .catch((e) => toast(e.message, "error"));
  }, [toast]);
  useEffect(load, [load]);

  async function connect() {
    try {
      const { url } = await api<{ url: string }>("/api/auth/google");
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
      await api("/api/admin/settings", { method: "PATCH", json: { key: "root_folder_id", value: id } });
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: connected ? "color-mix(in srgb, var(--success) 14%, transparent)" : "var(--warning-soft)",
              color: connected ? "var(--success)" : "var(--warning)",
            }}
          >
            {connected ? <CheckCircle2 size={22} /> : <HardDrive size={22} />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Google Drive</h3>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              {connected
                ? "Conectado. O Atlas acessa os arquivos por meio desta conta."
                : "Não conectado. Entre com a conta Google que é dona da pasta Atlas."}
            </p>
          </div>
          <button className={`btn ${connected ? "" : "btn-primary"}`} onClick={connect}>
            {connected ? "Reconectar" : "Conectar Google Drive"}
          </button>
        </div>
      </div>

      <form onSubmit={saveRoot} className="card p-5">
        <h3 className="font-semibold text-sm">Pasta raiz</h3>
        <p className="text-sm mt-0.5 mb-3" style={{ color: "var(--text-2)" }}>
          Cole o link ou o ID da pasta Atlas no Google Drive. Tudo o que o Atlas mostra fica dentro dela.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input font-mono text-xs" value={rootId} onChange={(e) => setRootId(e.target.value)} aria-label="ID da pasta raiz" />
          <button className="btn btn-primary" disabled={saving || !rootId.trim()}>Salvar</button>
        </div>
      </form>
    </div>
  );
}
