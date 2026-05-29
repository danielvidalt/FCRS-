"use client";

import ImageUploadDropzone from "@/components/ImageUploadDropzone";

interface LeftSidebarProps {
  zoom: number;
  panMode: boolean;
  hasImage: boolean;
  onUpload: (file: File) => void;
  onInvalidUpload?: () => void;
  onZoomChange: (zoom: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onPanModeChange: (enabled: boolean) => void;
  onResetView: () => void;
}

export default function LeftSidebar({
  zoom,
  panMode,
  hasImage,
  onUpload,
  onInvalidUpload,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onPanModeChange,
  onResetView,
}: LeftSidebarProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-4 border-r border-slate-700 bg-slate-950 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Image Controls
      </h2>

      <ImageUploadDropzone
        onFile={onUpload}
        onInvalidFile={onInvalidUpload}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>Zoom</span>
          <span className="tabular-nums text-cyan-400">{Math.round(zoom * 100)}%</span>
        </div>
        <input
          type="range"
          min={20}
          max={500}
          value={Math.round(zoom * 100)}
          disabled={!hasImage}
          onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
          className="w-full accent-cyan-500"
        />
        <div className="flex gap-2">
          <SideButton onClick={onZoomOut} disabled={!hasImage}>
            −
          </SideButton>
          <SideButton onClick={onZoomIn} disabled={!hasImage}>
            +
          </SideButton>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={panMode}
          disabled={!hasImage}
          onChange={(e) => onPanModeChange(e.target.checked)}
          className="accent-cyan-500"
        />
        Pan mode
      </label>

      <SideButton onClick={onResetView} disabled={!hasImage}>
        Reset view
      </SideButton>

      {!hasImage && (
        <p className="text-xs leading-relaxed text-slate-500">
          Drag a facade or rooftop photo here or onto the workspace, then click
          Generate Grid.
        </p>
      )}
    </aside>
  );
}

function SideButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
