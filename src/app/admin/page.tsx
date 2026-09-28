"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Shield,
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import type { AppUser, Permission } from "@/types";

type Tab = "users" | "permissions" | "settings";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((user) => {
        if (user.role !== "admin") {
          router.push("/");
          return;
        }
        setCurrentUser(user);
        setLoading(false);
      })
      .catch(() => router.push("/"));
  }, [router]);

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const tabs = [
    { id: "users" as Tab, label: "Usuários", icon: Users },
    { id: "permissions" as Tab, label: "Permissões", icon: Shield },
    { id: "settings" as Tab, label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <header
        className="flex items-center gap-4 px-6 py-3"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Administração
        </h1>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t.id ? "var(--accent)" : "transparent",
                color: tab === t.id ? "white" : "var(--text-secondary)",
              }}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users" && <UsersTab />}
        {tab === "permissions" && <PermissionsTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", email: "", password: "", role: "user" });
      setShowAdd(false);
      loadUsers();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Usuários ({users.length})
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plus size={16} />
          Novo usuário
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAddUser}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 rounded-lg"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <input
            type="text"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            <option value="user">Usuário</option>
            <option value="admin">Admin</option>
          </select>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: "var(--accent)" }}
            >
              Criar
            </button>
          </div>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Nome</th>
            <th className="text-left py-2 px-3 font-medium hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>Email</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Perfil</th>
            <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="py-2.5 px-3" style={{ color: "var(--text-primary)" }}>{u.name}</td>
              <td className="py-2.5 px-3 hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{u.email}</td>
              <td className="py-2.5 px-3">
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: u.role === "admin" ? "var(--accent-light)" : "var(--bg-secondary)",
                    color: u.role === "admin" ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {u.role === "admin" ? "Admin" : "Usuário"}
                </span>
              </td>
              <td className="py-2.5 px-3">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: u.is_active ? "var(--success)" : "var(--text-muted)" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    folder_drive_id: "",
    folder_name: "",
    can_view: true,
    can_download: true,
    can_upload: false,
    can_create_folder: false,
    can_rename_files: false,
    can_rename_folders: false,
    can_move_files: false,
    can_move_folders: false,
    can_delete_files: false,
    can_delete_folders: false,
    inherit: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/permissions").then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ]).then(([perms, usrs]) => {
      setPermissions(Array.isArray(perms) ? perms : []);
      setUsers(Array.isArray(usrs) ? usrs : []);
      setLoading(false);
    });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowAdd(false);
      const data = await fetch("/api/admin/permissions").then((r) => r.json());
      setPermissions(Array.isArray(data) ? data : []);
    } else {
      const err = await res.json();
      alert(err.error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta permissão?")) return;
    await fetch(`/api/admin/permissions?id=${id}`, { method: "DELETE" });
    setPermissions(permissions.filter((p) => p.id !== id));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const permFields = [
    { key: "can_view", label: "Visualizar" },
    { key: "can_download", label: "Download" },
    { key: "can_upload", label: "Upload" },
    { key: "can_create_folder", label: "Criar pasta" },
    { key: "can_rename_files", label: "Renomear arq." },
    { key: "can_rename_folders", label: "Renomear pastas" },
    { key: "can_move_files", label: "Mover arq." },
    { key: "can_move_folders", label: "Mover pastas" },
    { key: "can_delete_files", label: "Excluir arq." },
    { key: "can_delete_folders", label: "Excluir pastas" },
  ] as const;

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Permissões ({permissions.length})
        </h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "var(--accent)" }}
        >
          <Plus size={16} />
          Nova permissão
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="space-y-3 mb-6 p-4 rounded-lg"
          style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              required
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="">Selecione o usuário</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Folder ID do Google Drive"
              value={form.folder_drive_id}
              onChange={(e) => setForm({ ...form, folder_drive_id: e.target.value })}
              required
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <input
              type="text"
              placeholder="Nome da pasta (opcional)"
              value={form.folder_name}
              onChange={(e) => setForm({ ...form, folder_name: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {permFields.map((field) => (
              <label key={field.key} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.checked })}
                />
                {field.label}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={form.inherit}
                onChange={(e) => setForm({ ...form, inherit: e.target.checked })}
              />
              Herdar subpastas
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: "var(--accent)" }}>
              Salvar
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Usuário</th>
              <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Pasta</th>
              <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Permissões</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => {
              const userName = users.find((u) => u.id === p.user_id)?.name || p.user_id || "Grupo";
              const activePerms = permFields
                .filter((f) => p[f.key])
                .map((f) => f.label);

              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2.5 px-3" style={{ color: "var(--text-primary)" }}>{userName}</td>
                  <td className="py-2.5 px-3" style={{ color: "var(--text-secondary)" }}>
                    {p.folder_name || p.folder_drive_id}
                    {p.inherit && <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>(+sub)</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {activePerms.map((perm) => (
                        <span
                          key={perm}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1 rounded-md transition-colors"
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<{ key: string; value: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  async function handleSave(key: string, value: string) {
    setSaving(key);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Configurações
      </h2>

      <div className="space-y-4">
        {settings.map((setting) => (
          <div
            key={setting.key}
            className="flex flex-col sm:flex-row sm:items-center gap-2 p-4 rounded-lg"
            style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {setting.key}
              </p>
              {setting.description && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {setting.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={setting.value}
                onChange={(e) => {
                  setSettings(
                    settings.map((s) =>
                      s.key === setting.key ? { ...s, value: e.target.value } : s
                    )
                  );
                }}
                className="px-3 py-1.5 rounded-lg text-sm outline-none w-full sm:w-64"
                style={{ backgroundColor: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button
                onClick={() => handleSave(setting.key, setting.value)}
                disabled={saving === setting.key}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white shrink-0"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {saving === setting.key ? "..." : "Salvar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
