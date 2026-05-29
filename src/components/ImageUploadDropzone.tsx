"use client";

import { useCallback, useRef, useState } from "react";
import {
  IMAGE_ACCEPT,
  firstValidImageFile,
  isValidImageFile,
} from "@/lib/image-upload";

interface ImageUploadDropzoneProps {
  onFile: (file: File) => void;
  onFiles?: (files: File[]) => void;
  onInvalidFile?: () => void;
  compact?: boolean;
  multiple?: boolean;
}

export default function ImageUploadDropzone({
  onFile,
  onFiles,
  onInvalidFile,
  compact = true,
  multiple = false,
}: ImageUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = useCallback(
    (files: FileList | null | undefined) => {
      if (multiple) {
        const validFiles = Array.from(files ?? []).filter(isValidImageFile);
        if (validFiles.length) {
          onFiles?.(validFiles);
          if (!onFiles) validFiles.forEach(onFile);
          return;
        }
        if (files?.length) onInvalidFile?.();
        return;
      }

      const file = firstValidImageFile(files);
      if (file) {
        onFile(file);
        return;
      }
      if (files?.length) onInvalidFile?.();
    },
    [multiple, onFile, onFiles, onInvalidFile]
  );

  const dragActive =
    "border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-500/50";
  const dragIdle =
    "border-cyan-600/50 bg-slate-900 hover:border-cyan-500 hover:bg-slate-800";

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        acceptFile(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 text-center text-sm text-slate-300 transition ${
        compact ? "py-4" : "py-10"
      } ${dragging ? dragActive : dragIdle}`}
    >
      <span className="font-medium text-cyan-400">Upload image</span>
      <span className="text-xs text-slate-500">
        {dragging ? "Drop to upload" : "Click or drag JPG / PNG"}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          acceptFile(e.target.files);
          e.target.value = "";
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
