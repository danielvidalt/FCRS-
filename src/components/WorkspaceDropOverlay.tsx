"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { firstValidImageFile } from "@/lib/image-upload";

interface WorkspaceDropOverlayProps {
  children: ReactNode;
  onFile: (file: File) => void;
  onInvalidFile?: () => void;
}

export default function WorkspaceDropOverlay({
  children,
  onFile,
  onInvalidFile,
}: WorkspaceDropOverlayProps) {
  const [dragging, setDragging] = useState(false);
  const depthRef = useRef(0);

  const acceptFile = useCallback(
    (files: FileList | null | undefined) => {
      const file = firstValidImageFile(files);
      if (file) {
        onFile(file);
        return;
      }
      if (files?.length) onInvalidFile?.();
    },
    [onFile, onInvalidFile]
  );

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-col"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        depthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        depthRef.current -= 1;
        if (depthRef.current <= 0) {
          depthRef.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depthRef.current = 0;
        setDragging(false);
        acceptFile(e.dataTransfer.files);
      }}
    >
      {children}
      {dragging && (
        <div
          className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-cyan-400 bg-cyan-950/75 backdrop-blur-sm"
          aria-hidden
        >
          <div className="text-center">
            <p className="text-lg font-semibold text-cyan-300">
              Drop image here
            </p>
            <p className="mt-1 text-sm text-slate-400">JPG or PNG</p>
          </div>
        </div>
      )}
    </div>
  );
}
