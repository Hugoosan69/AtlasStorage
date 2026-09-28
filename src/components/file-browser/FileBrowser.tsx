"use client";

import { useState, useEffect, useCallback } from "react";
import { Breadcrumb } from "./Breadcrumb";
import { Toolbar } from "./Toolbar";
import { FileList } from "./FileList";
import { DropZone } from "./DropZone";
import { Header } from "./Header";
import type { DriveItem, BreadcrumbItem, UserPermissions, AppUser } from "@/types";

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_view: false,
  can_download: false,
  can_upload: false,
  can_create_folder: false,
  can_rename_files: false,
  can_rename_folders: false,
  can_move_files: false,
  can_move_folders: false,
  can_delete_files: false,
  can_delete_folders: false,
};

export function FileBrowser({ user }: { user: AppUser }) {
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [currentFolderId, setCurrentFolderId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const loadFolder = useCallback(async (folderId?: string) => {
    setLoading(true);
    setSearchQuery("");
    try {
      const params = folderId ? `?folderId=${folderId}` : "";
      const res = await fetch(`/api/drive/list${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const data = await res.json();
      setFiles(data.files);
      setBreadcrumb(data.breadcrumb);
      setPermissions(data.permissions);
      setCurrentFolderId(folderId || data.breadcrumb[0]?.id || "");
    } catch (error) {
      console.error("Error loading folder:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolder();
  }, [loadFolder]);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query || query.length < 2) {
      if (!query) loadFolder(currentFolderId);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/drive/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setFiles(data.files);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFolder(name: string) {
    try {
      const res = await fetch("/api/drive/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: currentFolderId, name }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      loadFolder(currentFolderId);
    } catch (error) {
      console.error("Create folder error:", error);
    }
  }

  async function handleUpload(fileList: FileList) {
    setUploading(true);
    const total = fileList.length;

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      setUploadProgress(`Enviando ${i + 1}/${total}: ${file.name}`);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("parentId", currentFolderId);

      try {
        const res = await fetch("/api/drive/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          alert(`Erro ao enviar ${file.name}: ${err.error}`);
        }
      } catch (error) {
        console.error(`Upload error for ${file.name}:`, error);
      }
    }

    setUploading(false);
    setUploadProgress("");
    loadFolder(currentFolderId);
  }

  async function handleDownload(fileId: string, fileName: string) {
    try {
      const res = await fetch(`/api/drive/download?fileId=${fileId}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  }

  async function handleRename(
    fileId: string,
    currentName: string,
    _isFolder: boolean
  ) {
    const newName = prompt("Novo nome:", currentName);
    if (!newName || newName === currentName) return;

    try {
      const res = await fetch("/api/drive/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, newName }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      loadFolder(currentFolderId);
    } catch (error) {
      console.error("Rename error:", error);
    }
  }

  async function handleDelete(
    fileId: string,
    name: string,
    isFolder: boolean
  ) {
    const confirmed = confirm(
      `Tem certeza que deseja excluir ${isFolder ? "a pasta" : "o arquivo"} "${name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/drive/delete?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }
      loadFolder(currentFolderId);
    } catch (error) {
      console.error("Delete error:", error);
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Header user={user} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-4">
        <Breadcrumb items={breadcrumb} onNavigate={loadFolder} />

        <Toolbar
          permissions={permissions}
          onCreateFolder={handleCreateFolder}
          onUpload={handleUpload}
          onSearch={handleSearch}
          searchQuery={searchQuery}
        />

        {uploading && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-3 text-sm"
            style={{
              backgroundColor: "var(--accent-light)",
              color: "var(--accent)",
            }}
          >
            <div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            />
            {uploadProgress}
          </div>
        )}

        <DropZone enabled={permissions.can_upload} onDrop={handleUpload}>
          <FileList
            files={files}
            permissions={permissions}
            loading={loading}
            onOpenFolder={loadFolder}
            onDownload={handleDownload}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </DropZone>
      </main>
    </div>
  );
}
