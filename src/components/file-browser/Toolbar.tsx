"use client";

import { useState, useRef } from "react";
import { FolderPlus, Upload, Search, X } from "lucide-react";
import type { UserPermissions } from "@/types";

export function Toolbar({
  permissions,
  onCreateFolder,
  onUpload,
  onSearch,
  searchQuery,
}: {
  permissions: UserPermissions;
  onCreateFolder: (name: string) => void;
  onUpload: (files: FileList) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (folderName.trim()) {
      onCreateFolder(folderName.trim());
      setFolderName("");
      setShowNewFolder(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3">
      <div className="flex items-center gap-2">
        {permissions.can_create_folder && (
          <>
            {showNewFolder ? (
              <form
                onSubmit={handleCreateFolder}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Nome da pasta"
                  autoFocus
                  className="px-3 py-1.5 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolder(false)}
                  className="p-1.5 rounded-lg"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X size={16} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <FolderPlus size={16} />
                Nova pasta
              </button>
            )}
          </>
        )}

        {permissions.can_upload && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Upload size={16} />
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onUpload(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </>
        )}
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Pesquisar arquivos..."
          className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-lg text-sm outline-none transition-colors"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
