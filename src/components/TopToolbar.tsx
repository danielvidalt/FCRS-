"use client";

import { useState } from "react";

interface TopToolbarProps {
  projectName?: string;
  canUndo: boolean;
  canRedo: boolean;
  onExportAll: (format: "png" | "jpeg") => void;
  onExportTab: (format: "png" | "jpeg") => void;
  onCopy: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function TopToolbar({
  projectName,
  canUndo,
  canRedo,
  onExportAll,
  onExportTab,
  onCopy,
  onUndo,
  onRedo,
  onReset,
  onClose,
}: TopToolbarProps) {
  const [dialog, setDialog] = useState<"all" | "tab" | null>(null);

  const handleFormat = (format: "png" | "jpeg") => {
    if (dialog === "all") onExportAll(format);
    else if (dialog === "tab") onExportTab(format);
    setDialog(null);
  };

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-950 px-4 py-3">
        <div className="mr-4 flex items-center gap-2">
          <span className="text-lg font-semibold text-cyan-400">FCRS</span>
          {projectName ? (
            <span className="hidden max-w-[300px] truncate text-base font-semibold text-slate-200 sm:inline">
              {projectName}
            </span>
          ) : (
            <span className="hidden text-xs text-slate-500 sm:inline">Grid Tool</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ToolbarButton onClick={() => setDialog("all")}>Export All</ToolbarButton>
          <ToolbarButton onClick={() => setDialog("tab")}>Export Tab</ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-700" />
          <ToolbarButton onClick={onCopy}>Copy</ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-700" />
          <ToolbarButton onClick={onUndo} disabled={!canUndo}>Undo</ToolbarButton>
          <ToolbarButton onClick={onRedo} disabled={!canRedo}>Redo</ToolbarButton>
          <ToolbarButton onClick={onReset} variant="muted">Reset View</ToolbarButton>
          <span className="mx-1 w-px self-stretch bg-slate-700" />
          <ToolbarButton onClick={onClose} variant="danger">Close</ToolbarButton>
        </div>
      </header>

      {/* Format dialog */}
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDialog(null)}
        >
          <div
            className="rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
              {dialog === "all" ? "Export all images" : "Export current tab"}
            </p>
            <p className="mb-5 text-sm text-slate-400">Choose export format</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleFormat("png")}
                className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => handleFormat("jpeg")}
                className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
              >
                JPG
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="mt-4 w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "muted" | "danger";
}) {
  const base =
    "rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "muted"
      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
      : variant === "danger"
      ? "bg-slate-800 text-red-400 hover:bg-red-950 hover:text-red-300"
      : "bg-cyan-600 text-white hover:bg-cyan-500";
  return (
    <button type="button" className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
