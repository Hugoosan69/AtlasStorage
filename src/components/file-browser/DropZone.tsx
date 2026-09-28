"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

export function DropZone({
  enabled,
  onDrop,
  children,
}: {
  enabled: boolean;
  onDrop: (files: FileList) => void;
  children: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (enabled) setIsDragging(true);
    },
    [enabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (enabled && e.dataTransfer.files.length > 0) {
        onDrop(e.dataTransfer.files);
      }
    },
    [enabled, onDrop]
  );

  return (
    <div
      className="relative flex-1"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg"
          style={{
            backgroundColor: "var(--accent-light)",
            border: "2px dashed var(--accent)",
          }}
        >
          <Upload size={48} style={{ color: "var(--accent)" }} />
          <p
            className="mt-3 text-lg font-medium"
            style={{ color: "var(--accent)" }}
          >
            Solte os arquivos aqui
          </p>
        </div>
      )}
    </div>
  );
}
