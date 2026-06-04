"use client";

import { useState } from "react";
import { numberingHint } from "@/lib/grid";
import type { AnchorData, AnchorMarkerType, FreeLabelData, GridSettings } from "@/types/grid";

const MARKER_ICONS: Record<AnchorMarkerType, string> = {
  label: "Aa",
  x: "✕",
  circle: "●",
  square: "■",
};

interface RightSidebarProps {
  settings: GridSettings;
  selectedLineId: string | null;
  selectedFreeLabelStyle: FreeLabelData | null;
  hasImage: boolean;
  moveGridMode: boolean;
  anchorMode: boolean;
  anchors: AnchorData[];
  selectedAnchorId: string | null;
  activeAnchorType: AnchorMarkerType;
  activeAnchorSize: number;
  activeAnchorColor: string;
  onChange: (settings: GridSettings) => void;
  onGenerate: () => void;
  onResetGrid: () => void;
  onRefreshStyles: () => void;
  onRefreshLabels: (settings: GridSettings) => void;
  onRefreshLabelAppearance: (settings: GridSettings) => void;
  onAddLabel: () => void;
  onUpdateFreeLabelStyle: (id: string, style: Partial<Pick<FreeLabelData, "fontSize" | "color" | "backgroundColor" | "backgroundEnabled">>) => void;
  onMoveGridModeChange: (enabled: boolean) => void;
  onBeginGridScale: () => void;
  onScaleGridLive: (scaleX: number, scaleY: number) => void;
  onCommitGridScale: () => void;
  onScaleGrid: (scaleX: number, scaleY: number) => void;
  onAddControlPoint: () => void;
  onRemoveControlPoint: () => void;
  onToggleLock: () => void;
  onDeleteLine: () => void;
  onToggleAnchorMode: () => void;
  onSelectAnchor: (id: string) => void;
  onUpdateAnchorNotes: (id: string, notes: string) => void;
  onUpdateAnchorMarker: (id: string, partial: Partial<Pick<AnchorData, "markerType" | "markerSize" | "markerColor" | "notesSize" | "notesColor">>) => void;
  onChangeActiveAnchorType: (t: AnchorMarkerType) => void;
  onChangeActiveAnchorSize: (s: number) => void;
  onChangeActiveAnchorColor: (c: string) => void;
  onDeleteAnchor: (id: string) => void;
}

export default function RightSidebar({
  settings,
  selectedLineId,
  selectedFreeLabelStyle,
  hasImage,
  moveGridMode,
  anchorMode,
  anchors,
  selectedAnchorId,
  activeAnchorType,
  activeAnchorSize,
  activeAnchorColor,
  onChange,
  onGenerate,
  onResetGrid,
  onAddLabel,
  onUpdateFreeLabelStyle,
  onMoveGridModeChange,
  onBeginGridScale,
  onScaleGridLive,
  onCommitGridScale,
  onScaleGrid,
  onRefreshStyles,
  onRefreshLabels,
  onRefreshLabelAppearance,
  onAddControlPoint,
  onRemoveControlPoint,
  onToggleLock,
  onDeleteLine,
  onToggleAnchorMode,
  onSelectAnchor,
  onUpdateAnchorNotes,
  onUpdateAnchorMarker,
  onChangeActiveAnchorType,
  onChangeActiveAnchorSize,
  onChangeActiveAnchorColor,
  onDeleteAnchor,
}: RightSidebarProps) {
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [lockAspect, setLockAspect] = useState(true);

  const patch = (partial: Partial<GridSettings>) =>
    onChange({ ...settings, ...partial });

  const patchAndRefreshLabels = (partial: Partial<GridSettings>) => {
    const clearsVertical =
      "verticalNumbering" in partial || "verticalPrefix" in partial ||
      "verticalLabelTop" in partial || "verticalLabelBottom" in partial || "verticalLabelSide" in partial;
    const clearsHorizontal =
      "horizontalNumbering" in partial || "horizontalPrefix" in partial ||
      "horizontalLabelLeft" in partial || "horizontalLabelRight" in partial || "horizontalLabelSide" in partial;
    const next: GridSettings = {
      ...settings, ...partial,
      ...(clearsVertical ? { customVerticalLabels: {} as Record<number, string> } : {}),
      ...(clearsHorizontal ? { customHorizontalLabels: {} as Record<number, string> } : {}),
    };
    onChange(next);
    onRefreshLabels(next);
  };

  const selectedAnchor = anchors.find((a) => a.id === selectedAnchorId) ?? null;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-0 overflow-y-auto border-l border-slate-700 bg-slate-950 p-4">

      {/* ── Section 1: Grid ── */}
      <CollapsibleSection title="Grid" defaultOpen>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={!hasImage} onClick={onGenerate}
            className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40">
            Generate Grid
          </button>
          <button type="button" disabled={!hasImage} onClick={onResetGrid}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
            Reset Grid
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Transform</p>
          <button type="button" disabled={!hasImage} onClick={() => onMoveGridModeChange(!moveGridMode)}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${moveGridMode ? "bg-cyan-600 text-white hover:bg-cyan-500" : "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
            {moveGridMode ? "Moving grid — click to stop" : "Move grid"}
          </button>
          <Field label={`Width ${scaleX}%`}>
            <input type="range" min={10} max={200} value={scaleX} disabled={!hasImage}
              onPointerDown={() => onBeginGridScale()}
              onChange={(e) => { const v = Number(e.target.value); setScaleX(v); if (lockAspect) setScaleY(v); onScaleGridLive(v / 100, (lockAspect ? v : scaleY) / 100); }}
              onPointerUp={() => onCommitGridScale()}
              className="w-full accent-cyan-500" />
          </Field>
          <Field label={`Height ${scaleY}%`}>
            <input type="range" min={10} max={200} value={scaleY} disabled={!hasImage || lockAspect}
              onPointerDown={() => onBeginGridScale()}
              onChange={(e) => { const v = Number(e.target.value); setScaleY(v); onScaleGridLive(scaleX / 100, v / 100); }}
              onPointerUp={() => onCommitGridScale()}
              className="w-full accent-cyan-500 disabled:opacity-40" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={lockAspect}
              onChange={(e) => { setLockAspect(e.target.checked); if (e.target.checked) setScaleY(scaleX); }}
              className="accent-cyan-500" />
            Lock aspect ratio
          </label>
          <button type="button" disabled={!hasImage || (scaleX === 100 && scaleY === 100)}
            onClick={() => { onScaleGrid(scaleX / 100, scaleY / 100); setScaleX(100); setScaleY(100); }}
            className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40">
            Apply exact scale
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Vertical lines"><NumberInput min={1} max={50} value={settings.verticalLines} onChange={(v) => patch({ verticalLines: v })} /></Field>
          <Field label="Horizontal lines"><NumberInput min={1} max={50} value={settings.horizontalLines} onChange={(v) => patch({ horizontalLines: v })} /></Field>
          <Field label="Vertical prefix"><TextInput value={settings.verticalPrefix} onChange={(v) => patchAndRefreshLabels({ verticalPrefix: v })} /></Field>
          <Field label="Horizontal prefix"><TextInput value={settings.horizontalPrefix} onChange={(v) => patchAndRefreshLabels({ horizontalPrefix: v })} /></Field>
          <Field label={`Vertical numbering (${numberingHint(settings.verticalNumbering)})`}>
            <select value={settings.verticalNumbering}
              onChange={(e) => patchAndRefreshLabels({ verticalNumbering: e.target.value as GridSettings["verticalNumbering"] })}
              className={selectClass}>
              <option value="ltr">Left → right</option>
              <option value="rtl">Right → left</option>
            </select>
          </Field>
          <Field label={`Horizontal numbering (${numberingHint(settings.horizontalNumbering)})`}>
            <select value={settings.horizontalNumbering}
              onChange={(e) => patchAndRefreshLabels({ horizontalNumbering: e.target.value as GridSettings["horizontalNumbering"] })}
              className={selectClass}>
              <option value="btt">Bottom → top</option>
              <option value="ttb">Top → bottom</option>
            </select>
          </Field>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Label positions</p>
          <div className="space-y-1">
            <span className="text-xs text-slate-400">Vertical lines</span>
            <VerticalLabelCross
              showTop={settings.verticalLabelTop} showBottom={settings.verticalLabelBottom} side={settings.verticalLabelSide}
              onToggleTop={() => patchAndRefreshLabels({ verticalLabelTop: !settings.verticalLabelTop })}
              onToggleBottom={() => patchAndRefreshLabels({ verticalLabelBottom: !settings.verticalLabelBottom })}
              onSelectSide={(s) => patchAndRefreshLabels({ verticalLabelSide: s })} />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400">Horizontal lines</span>
            <HorizontalLabelCross
              showLeft={settings.horizontalLabelLeft} showRight={settings.horizontalLabelRight} side={settings.horizontalLabelSide}
              onToggleLeft={() => patchAndRefreshLabels({ horizontalLabelLeft: !settings.horizontalLabelLeft })}
              onToggleRight={() => patchAndRefreshLabels({ horizontalLabelRight: !settings.horizontalLabelRight })}
              onSelectSide={(s) => patchAndRefreshLabels({ horizontalLabelSide: s })} />
          </div>
          <button type="button" onClick={() => patchAndRefreshLabels({ hiddenLabelKeys: {} })} className={secondaryBtn}>Restore deleted labels</button>
          <button type="button" onClick={() => patchAndRefreshLabels({ ...settings, customVerticalLabels: {}, customHorizontalLabels: {} })} className={secondaryBtn}>Rebuild all labels</button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Line appearance</p>
          <Field label="Vertical color"><input type="color" value={settings.verticalLineColor} onChange={(e) => patch({ verticalLineColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" /></Field>
          <Field label={`Vertical thickness (${settings.verticalLineThickness}px)`}><input type="range" min={1} max={12} value={settings.verticalLineThickness} onChange={(e) => patch({ verticalLineThickness: Number(e.target.value) })} className="w-full accent-cyan-500" /></Field>
          <Field label="Horizontal color"><input type="color" value={settings.horizontalLineColor} onChange={(e) => patch({ horizontalLineColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" /></Field>
          <Field label={`Horizontal thickness (${settings.horizontalLineThickness}px)`}><input type="range" min={1} max={12} value={settings.horizontalLineThickness} onChange={(e) => patch({ horizontalLineThickness: Number(e.target.value) })} className="w-full accent-cyan-500" /></Field>
          <Field label={`Opacity (${Math.round(settings.lineOpacity * 100)}%)`}><input type="range" min={10} max={100} value={Math.round(settings.lineOpacity * 100)} onChange={(e) => patch({ lineOpacity: Number(e.target.value) / 100 })} className="w-full accent-cyan-500" /></Field>
          <Field label="Line style">
            <select value={settings.lineStyle} onChange={(e) => patch({ lineStyle: e.target.value as GridSettings["lineStyle"] })} className={selectClass}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </Field>
          <button type="button" onClick={onRefreshStyles} className={secondaryBtn}>Apply line style</button>
        </div>

        {selectedLineId && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Selected line</p>
            <p className="text-xs text-slate-400">{selectedLineId}</p>
            <button type="button" onClick={onAddControlPoint} className={secondaryBtn}>Add midpoint</button>
            <button type="button" onClick={onRemoveControlPoint} className={secondaryBtn}>Remove control point</button>
            <button type="button" onClick={onToggleLock} className={secondaryBtn}>Lock / unlock line</button>
            <button type="button" onClick={onDeleteLine} className="w-full rounded-md bg-red-900/60 px-3 py-2 text-sm text-red-300 hover:bg-red-800/70">Delete line</button>
          </div>
        )}
      </CollapsibleSection>

      {/* ── Section 2: Labels ── */}
      <CollapsibleSection title="Labels" defaultOpen>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={!hasImage} onClick={onAddLabel}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40">
            + Add label
          </button>
        </div>

        {selectedFreeLabelStyle && (
          <div className="mt-3 rounded-lg border border-cyan-800 bg-cyan-950/40 p-3">
            <h3 className="mb-3 text-xs font-semibold uppercase text-cyan-400">Selected label</h3>
            <Field label={`Font size (${selectedFreeLabelStyle.fontSize ?? settings.labelFontSize}px)`}>
              <input type="range" min={8} max={72} value={selectedFreeLabelStyle.fontSize ?? settings.labelFontSize}
                onChange={(e) => onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { fontSize: Number(e.target.value) })}
                className="w-full accent-cyan-500" />
            </Field>
            <Field label="Text color">
              <input type="color" value={selectedFreeLabelStyle.color ?? settings.labelColor}
                onChange={(e) => onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { color: e.target.value })}
                className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
            </Field>
            <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={selectedFreeLabelStyle.backgroundEnabled ?? settings.labelBackgroundEnabled}
                onChange={(e) => onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { backgroundEnabled: e.target.checked })}
                className="accent-cyan-500" />
              Background
            </label>
            {(selectedFreeLabelStyle.backgroundEnabled ?? settings.labelBackgroundEnabled) && (
              <Field label="Background color">
                <input type="color" value={hexFromRgba(selectedFreeLabelStyle.backgroundColor ?? settings.labelBackgroundColor)}
                  onChange={(e) => onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { backgroundColor: rgbaFromHex(e.target.value, 0.88) })}
                  className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
              </Field>
            )}
          </div>
        )}

        <div className="mt-3 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Label appearance</p>
          <Field label={`Font size (${settings.labelFontSize}px)`}>
            <input type="range" min={10} max={32} value={settings.labelFontSize} onChange={(e) => patch({ labelFontSize: Number(e.target.value) })} className="w-full accent-cyan-500" />
          </Field>
          <Field label="Text color">
            <input type="color" value={settings.labelColor} onChange={(e) => patch({ labelColor: e.target.value })} className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
          </Field>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={settings.labelBackgroundEnabled} onChange={(e) => patch({ labelBackgroundEnabled: e.target.checked })} className="accent-cyan-500" />
            Label background
          </label>
          {settings.labelBackgroundEnabled && (
            <Field label="Background color">
              <input type="color" value={hexFromRgba(settings.labelBackgroundColor)} onChange={(e) => patch({ labelBackgroundColor: rgbaFromHex(e.target.value, 0.88) })} className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
            </Field>
          )}
          <button type="button" onClick={() => onRefreshLabelAppearance(settings)} className={secondaryBtn}>Apply label style</button>
        </div>
      </CollapsibleSection>

      {/* ── Section 3: Anchors ── */}
      <CollapsibleSection
        title="Anchors"
        badge={anchors.length > 0
          ? <span className="rounded bg-orange-900/60 px-1.5 py-0.5 text-orange-300">{anchors.length}</span>
          : undefined}
        defaultOpen
      >
        <div className="space-y-3">
          {/* Place button */}
          <button type="button" disabled={!hasImage} onClick={onToggleAnchorMode}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${anchorMode ? "bg-orange-600 text-white hover:bg-orange-500" : "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"}`}>
            {anchorMode ? "Placing anchors — click to stop" : "Place anchor"}
          </button>

          {/* Active marker settings */}
          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">New marker</p>
            <MarkerTypeSelector value={activeAnchorType} onChange={onChangeActiveAnchorType} />
            <div className="flex items-center gap-2">
              <Field label="Color">
                <input type="color" value={activeAnchorColor} onChange={(e) => onChangeActiveAnchorColor(e.target.value)}
                  className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
              </Field>
              <Field label={`Size ${activeAnchorSize}`}>
                <input type="range" min={8} max={48} value={activeAnchorSize} onChange={(e) => onChangeActiveAnchorSize(Number(e.target.value))}
                  className="w-full accent-orange-500" />
              </Field>
            </div>
          </div>

          {/* Anchor list */}
          {anchors.length > 0 && (
            <ul className="space-y-1">
              {anchors.map((anchor) => (
                <li key={anchor.id}
                  className={`rounded-md border transition ${selectedAnchorId === anchor.id ? "border-orange-700 bg-orange-900/25" : "border-transparent bg-slate-800/40"}`}>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <button type="button" onClick={() => onSelectAnchor(anchor.id)} className="flex flex-1 items-center gap-2 text-left">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[13px] font-bold"
                        style={{ color: anchor.markerColor }}>
                        {MARKER_ICONS[anchor.markerType]}
                      </span>
                      <span className={`text-xs ${selectedAnchorId === anchor.id ? "text-orange-200" : "text-slate-300"}`}>
                        {anchor.markerType === "label" ? `A-${anchor.index}` : `#${anchor.index}`}
                        {anchor.notes && <span className="ml-1 text-slate-500">— {anchor.notes.slice(0, 20)}{anchor.notes.length > 20 ? "…" : ""}</span>}
                      </span>
                    </button>
                    <button type="button" onClick={() => onDeleteAnchor(anchor.id)} className="px-1 text-slate-600 hover:text-red-400 text-xs">✕</button>
                  </div>

                  {/* Expanded editor for selected anchor */}
                  {selectedAnchorId === anchor.id && (
                    <div className="px-2 pb-3 space-y-2 border-t border-orange-900/40 pt-2">
                      <MarkerTypeSelector value={anchor.markerType}
                        onChange={(t) => onUpdateAnchorMarker(anchor.id, { markerType: t })} />
                      <div className="flex items-center gap-2">
                        <Field label="Color">
                          <input type="color" value={anchor.markerColor}
                            onChange={(e) => onUpdateAnchorMarker(anchor.id, { markerColor: e.target.value })}
                            className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
                        </Field>
                        <Field label={`Size ${anchor.markerSize}`}>
                          <input type="range" min={8} max={48} value={anchor.markerSize}
                            onChange={(e) => onUpdateAnchorMarker(anchor.id, { markerSize: Number(e.target.value) })}
                            className="w-full accent-orange-500" />
                        </Field>
                      </div>

                      {/* Notes */}
                      <Field label="Notes">
                        <input type="text" value={anchor.notes}
                          onChange={(e) => onUpdateAnchorNotes(anchor.id, e.target.value)}
                          placeholder="Shown on canvas…"
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-orange-600 focus:outline-none" />
                      </Field>

                      {anchor.notes && (
                        <div className="flex items-center gap-2">
                          <Field label="Notes color">
                            <input type="color" value={anchor.notesColor}
                              onChange={(e) => onUpdateAnchorMarker(anchor.id, { notesColor: e.target.value })}
                              className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-900" />
                          </Field>
                          <Field label={`Notes size ${anchor.notesSize}`}>
                            <input type="range" min={8} max={32} value={anchor.notesSize}
                              onChange={(e) => onUpdateAnchorMarker(anchor.id, { notesSize: Number(e.target.value) })}
                              className="w-full accent-orange-500" />
                          </Field>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleSection>

    </aside>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function MarkerTypeSelector({ value, onChange }: { value: AnchorMarkerType; onChange: (t: AnchorMarkerType) => void }) {
  const types: AnchorMarkerType[] = ["label", "x", "circle", "square"];
  return (
    <div className="flex gap-1">
      {types.map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`flex-1 rounded px-1 py-1.5 text-sm font-bold transition ${value === t ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
          {MARKER_ICONS[t]}
        </button>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title, badge, defaultOpen = true, children,
}: {
  title: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-800 py-3">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200 transition">
        <span className="flex items-center gap-2">{title}{badge}</span>
        <span className="text-slate-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

const selectClass = "w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200";
const secondaryBtn = "w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200" />
  );
}

function hexFromRgba(rgba: string): string {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return "#0f172a";
  return `#${Number(match[1]).toString(16).padStart(2, "0")}${Number(match[2]).toString(16).padStart(2, "0")}${Number(match[3]).toString(16).padStart(2, "0")}`;
}

function rgbaFromHex(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${alpha})`;
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200" />
  );
}

function Toggle({ active, title, label, onClick }: { active: boolean; title: string; label: string; onClick: () => void }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition ${active ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
      {label}
    </button>
  );
}

function Radio({ active, title, label, onClick }: { active: boolean; title: string; label: string; onClick: () => void }) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition ${active ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
      {label}
    </button>
  );
}

function VerticalLabelCross({ showTop, showBottom, side, onToggleTop, onToggleBottom, onSelectSide }: {
  showTop: boolean; showBottom: boolean; side: "left" | "right";
  onToggleTop: () => void; onToggleBottom: () => void; onSelectSide: (s: "left" | "right") => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 items-center justify-items-center py-1">
      <div /><Toggle active={showTop}    title="Top end"    label="▲" onClick={onToggleTop} /><div />
      <Radio  active={side === "left"}  title="Left of line"  label="◀" onClick={() => onSelectSide("left")} />
      <div className="h-4 w-px bg-slate-600" />
      <Radio  active={side === "right"} title="Right of line" label="▶" onClick={() => onSelectSide("right")} />
      <div /><Toggle active={showBottom} title="Bottom end" label="▼" onClick={onToggleBottom} /><div />
    </div>
  );
}

function HorizontalLabelCross({ showLeft, showRight, side, onToggleLeft, onToggleRight, onSelectSide }: {
  showLeft: boolean; showRight: boolean; side: "top" | "bottom";
  onToggleLeft: () => void; onToggleRight: () => void; onSelectSide: (s: "top" | "bottom") => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 items-center justify-items-center py-1">
      <div /><Radio  active={side === "top"}    title="Above line"  label="▲" onClick={() => onSelectSide("top")} /><div />
      <Toggle active={showLeft}  title="Left end"  label="◀" onClick={onToggleLeft} />
      <div className="h-px w-4 bg-slate-600" />
      <Toggle active={showRight} title="Right end" label="▶" onClick={onToggleRight} />
      <div /><Radio  active={side === "bottom"} title="Below line" label="▼" onClick={() => onSelectSide("bottom")} /><div />
    </div>
  );
}
