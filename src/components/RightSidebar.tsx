"use client";

import { useState } from "react";
import { numberingHint } from "@/lib/grid";
import type { AnchorData, FreeLabelData, GridSettings } from "@/types/grid";

interface RightSidebarProps {
  settings: GridSettings;
  selectedLineId: string | null;
  selectedFreeLabelStyle: FreeLabelData | null;
  hasImage: boolean;
  moveGridMode: boolean;
  anchorMode: boolean;
  anchors: AnchorData[];
  selectedAnchorId: string | null;
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
  onUpdateAnchorPhoto: (id: string, dataUrl: string | undefined) => void;
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
  onUpdateAnchorPhoto,
  onDeleteAnchor,
}: RightSidebarProps) {
  const [scaleX, setScaleX] = useState(100);
  const [scaleY, setScaleY] = useState(100);
  const [lockAspect, setLockAspect] = useState(true);

  const patch = (partial: Partial<GridSettings>) =>
    onChange({ ...settings, ...partial });

  const patchAndRefreshLabels = (partial: Partial<GridSettings>) => {
    const clearsVertical =
      "verticalNumbering" in partial ||
      "verticalPrefix" in partial ||
      "verticalLabelTop" in partial ||
      "verticalLabelBottom" in partial ||
      "verticalLabelSide" in partial;
    const clearsHorizontal =
      "horizontalNumbering" in partial ||
      "horizontalPrefix" in partial ||
      "horizontalLabelLeft" in partial ||
      "horizontalLabelRight" in partial ||
      "horizontalLabelSide" in partial;
    const next: GridSettings = {
      ...settings,
      ...partial,
      ...(clearsVertical
        ? { customVerticalLabels: {} as Record<number, string> }
        : {}),
      ...(clearsHorizontal
        ? { customHorizontalLabels: {} as Record<number, string> }
        : {}),
    };
    onChange(next);
    onRefreshLabels(next);
  };

  const addLabels = () => {
    patchAndRefreshLabels({
      hiddenLabelKeys: {},
    });
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-700 bg-slate-950 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Grid Settings
      </h2>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!hasImage}
          onClick={onGenerate}
          className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generate Grid
        </button>
        <button
          type="button"
          disabled={!hasImage}
          onClick={onResetGrid}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset Grid
        </button>
        <button
          type="button"
          disabled={!hasImage}
          onClick={onAddLabel}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add label
        </button>
      </div>

      {selectedFreeLabelStyle && (
        <div className="rounded-lg border border-cyan-800 bg-cyan-950/40 p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase text-cyan-400">
            Selected label
          </h3>
          <Field label={`Font size (${selectedFreeLabelStyle.fontSize ?? settings.labelFontSize}px)`}>
            <input
              type="range"
              min={8}
              max={72}
              value={selectedFreeLabelStyle.fontSize ?? settings.labelFontSize}
              onChange={(e) =>
                onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { fontSize: Number(e.target.value) })
              }
              className="w-full accent-cyan-500"
            />
          </Field>
          <Field label="Text color">
            <input
              type="color"
              value={selectedFreeLabelStyle.color ?? settings.labelColor}
              onChange={(e) =>
                onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { color: e.target.value })
              }
              className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
            />
          </Field>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={selectedFreeLabelStyle.backgroundEnabled ?? settings.labelBackgroundEnabled}
              onChange={(e) =>
                onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, { backgroundEnabled: e.target.checked })
              }
              className="accent-cyan-500"
            />
            Background
          </label>
          {(selectedFreeLabelStyle.backgroundEnabled ?? settings.labelBackgroundEnabled) && (
            <Field label="Background color">
              <input
                type="color"
                value={hexFromRgba(selectedFreeLabelStyle.backgroundColor ?? settings.labelBackgroundColor)}
                onChange={(e) =>
                  onUpdateFreeLabelStyle(selectedFreeLabelStyle.id, {
                    backgroundColor: rgbaFromHex(e.target.value, 0.88),
                  })
                }
                className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
              />
            </Field>
          )}
        </div>
      )}

      <div className="border-t border-slate-800 pt-3">
        <h3 className="mb-3 text-xs font-semibold uppercase text-slate-500">
          Transform grid
        </h3>
        <div className="space-y-2">
          {/* Move grid toggle */}
          <button
            type="button"
            disabled={!hasImage}
            onClick={() => onMoveGridModeChange(!moveGridMode)}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              moveGridMode
                ? "bg-cyan-600 text-white hover:bg-cyan-500"
                : "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {moveGridMode ? "Moving grid — click to stop" : "Move grid"}
          </button>

          {/* Live scale sliders */}
          <Field label={`Width ${scaleX}%`}>
            <input
              type="range"
              min={10}
              max={200}
              value={scaleX}
              disabled={!hasImage}
              onPointerDown={() => {
                onBeginGridScale();
              }}
              onChange={(e) => {
                const v = Number(e.target.value);
                setScaleX(v);
                if (lockAspect) setScaleY(v);
                onScaleGridLive(v / 100, (lockAspect ? v : scaleY) / 100);
              }}
              onPointerUp={() => {
                onCommitGridScale();
              }}
              className="w-full accent-cyan-500"
            />
          </Field>
          <Field label={`Height ${scaleY}%`}>
            <input
              type="range"
              min={10}
              max={200}
              value={scaleY}
              disabled={!hasImage || lockAspect}
              onPointerDown={() => {
                onBeginGridScale();
              }}
              onChange={(e) => {
                const v = Number(e.target.value);
                setScaleY(v);
                onScaleGridLive(scaleX / 100, v / 100);
              }}
              onPointerUp={() => {
                onCommitGridScale();
              }}
              className="w-full accent-cyan-500 disabled:opacity-40"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={lockAspect}
              onChange={(e) => {
                setLockAspect(e.target.checked);
                if (e.target.checked) setScaleY(scaleX);
              }}
              className="accent-cyan-500"
            />
            Lock aspect ratio
          </label>
          <button
            type="button"
            disabled={!hasImage || (scaleX === 100 && scaleY === 100)}
            onClick={() => {
              onScaleGrid(scaleX / 100, scaleY / 100);
              setScaleX(100);
              setScaleY(100);
            }}
            className="w-full rounded-md bg-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Apply exact scale
          </button>
        </div>
      </div>

      <Field label="Vertical lines">
        <NumberInput
          min={1}
          max={50}
          value={settings.verticalLines}
          onChange={(v) => patch({ verticalLines: v })}
        />
      </Field>

      <Field label="Horizontal lines">
        <NumberInput
          min={1}
          max={50}
          value={settings.horizontalLines}
          onChange={(v) => patch({ horizontalLines: v })}
        />
      </Field>

      <Field label="Vertical prefix">
        <TextInput
          value={settings.verticalPrefix}
          onChange={(v) => patchAndRefreshLabels({ verticalPrefix: v })}
        />
      </Field>

      <Field label="Horizontal prefix">
        <TextInput
          value={settings.horizontalPrefix}
          onChange={(v) => patchAndRefreshLabels({ horizontalPrefix: v })}
        />
      </Field>

      <Field label={`Vertical numbering (${numberingHint(settings.verticalNumbering)})`}>
        <select
          value={settings.verticalNumbering}
          onChange={(e) =>
            patchAndRefreshLabels({
              verticalNumbering: e.target.value as GridSettings["verticalNumbering"],
            })
          }
          className={selectClass}
        >
          <option value="ltr">Left → right</option>
          <option value="rtl">Right → left</option>
        </select>
      </Field>

      <Field label={`Horizontal numbering (${numberingHint(settings.horizontalNumbering)})`}>
        <select
          value={settings.horizontalNumbering}
          onChange={(e) =>
            patchAndRefreshLabels({
              horizontalNumbering: e.target
                .value as GridSettings["horizontalNumbering"],
            })
          }
          className={selectClass}
        >
          <option value="btt">Bottom → top</option>
          <option value="ttb">Top → bottom</option>
        </select>
      </Field>

      {/* Vertical lines: ▲/▼ toggle which ENDS, ◀/▶ radio which SIDE of the line */}
      <div className="space-y-1">
        <span className="text-xs text-slate-400">Vertical line labels</span>
        <VerticalLabelCross
          showTop={settings.verticalLabelTop}
          showBottom={settings.verticalLabelBottom}
          side={settings.verticalLabelSide}
          onToggleTop={() => patchAndRefreshLabels({ verticalLabelTop: !settings.verticalLabelTop })}
          onToggleBottom={() => patchAndRefreshLabels({ verticalLabelBottom: !settings.verticalLabelBottom })}
          onSelectSide={(s) => patchAndRefreshLabels({ verticalLabelSide: s })}
        />
      </div>

      {/* Horizontal lines: ◀/▶ toggle which ENDS, ▲/▼ radio which SIDE of the line */}
      <div className="space-y-1">
        <span className="text-xs text-slate-400">Horizontal line labels</span>
        <HorizontalLabelCross
          showLeft={settings.horizontalLabelLeft}
          showRight={settings.horizontalLabelRight}
          side={settings.horizontalLabelSide}
          onToggleLeft={() => patchAndRefreshLabels({ horizontalLabelLeft: !settings.horizontalLabelLeft })}
          onToggleRight={() => patchAndRefreshLabels({ horizontalLabelRight: !settings.horizontalLabelRight })}
          onSelectSide={(s) => patchAndRefreshLabels({ horizontalLabelSide: s })}
        />
      </div>

      <button type="button" onClick={addLabels} className={secondaryBtn}>
        Restore deleted labels
      </button>

      <button
        type="button"
        onClick={() =>
          patchAndRefreshLabels({
            ...settings,
            customVerticalLabels: {},
            customHorizontalLabels: {},
          })
        }
        className={secondaryBtn}
      >
        Rebuild all labels
      </button>

      <div className="border-t border-slate-800 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">
          Label appearance
        </h3>
        <Field label={`Font size (${settings.labelFontSize}px)`}>
          <input
            type="range"
            min={10}
            max={32}
            value={settings.labelFontSize}
            onChange={(e) =>
              patch({ labelFontSize: Number(e.target.value) })
            }
            className="w-full accent-cyan-500"
          />
        </Field>
        <Field label="Text color">
          <input
            type="color"
            value={settings.labelColor}
            onChange={(e) => patch({ labelColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
          />
        </Field>
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.labelBackgroundEnabled}
            onChange={(e) =>
              patch({ labelBackgroundEnabled: e.target.checked })
            }
            className="accent-cyan-500"
          />
          Label background
        </label>
        {settings.labelBackgroundEnabled && (
          <Field label="Background color">
            <input
              type="color"
              value={hexFromRgba(settings.labelBackgroundColor)}
              onChange={(e) =>
                patch({
                  labelBackgroundColor: rgbaFromHex(e.target.value, 0.88),
                })
              }
              className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
            />
          </Field>
        )}
        <button
          type="button"
          onClick={() => onRefreshLabelAppearance(settings)}
          className={secondaryBtn}
        >
          Apply label style
        </button>
      </div>

      <div className="border-t border-slate-800 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">
          Line appearance
        </h3>
        <Field label="Vertical color">
          <input
            type="color"
            value={settings.verticalLineColor}
            onChange={(e) => patch({ verticalLineColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
          />
        </Field>
        <Field label={`Vertical thickness (${settings.verticalLineThickness}px)`}>
          <input
            type="range"
            min={1}
            max={12}
            value={settings.verticalLineThickness}
            onChange={(e) =>
              patch({ verticalLineThickness: Number(e.target.value) })
            }
            className="w-full accent-cyan-500"
          />
        </Field>
        <Field label="Horizontal color">
          <input
            type="color"
            value={settings.horizontalLineColor}
            onChange={(e) => patch({ horizontalLineColor: e.target.value })}
            className="h-9 w-full cursor-pointer rounded border border-slate-700 bg-slate-900"
          />
        </Field>
        <Field label={`Horizontal thickness (${settings.horizontalLineThickness}px)`}>
          <input
            type="range"
            min={1}
            max={12}
            value={settings.horizontalLineThickness}
            onChange={(e) =>
              patch({ horizontalLineThickness: Number(e.target.value) })
            }
            className="w-full accent-cyan-500"
          />
        </Field>
        <Field label={`Opacity (${Math.round(settings.lineOpacity * 100)}%)`}>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(settings.lineOpacity * 100)}
            onChange={(e) =>
              patch({ lineOpacity: Number(e.target.value) / 100 })
            }
            className="w-full accent-cyan-500"
          />
        </Field>
        <Field label="Line style">
          <select
            value={settings.lineStyle}
            onChange={(e) =>
              patch({ lineStyle: e.target.value as GridSettings["lineStyle"] })
            }
            className={selectClass}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </Field>
        <button type="button" onClick={onRefreshStyles} className={secondaryBtn}>
          Apply line style
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Labels follow their line when you move it. Drag a label to fix its
        position manually. Double-click a line to add a point on it.
      </p>

      {selectedLineId && (
        <div className="border-t border-slate-800 pt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Selected line
          </h3>
          <p className="mb-2 text-xs text-slate-400">{selectedLineId}</p>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onAddControlPoint} className={secondaryBtn}>
              Add midpoint
            </button>
            <button
              type="button"
              onClick={onRemoveControlPoint}
              className={secondaryBtn}
            >
              Remove control point
            </button>
            <button type="button" onClick={onToggleLock} className={secondaryBtn}>
              Lock / unlock line
            </button>
            <button
              type="button"
              onClick={onDeleteLine}
              className="w-full rounded-md bg-red-900/60 px-3 py-2 text-sm text-red-300 hover:bg-red-800/70"
            >
              Delete line
            </button>
          </div>
        </div>
      )}

      <AnchorSection
        anchors={anchors}
        selectedAnchorId={selectedAnchorId}
        anchorMode={anchorMode}
        hasImage={hasImage}
        onToggleMode={onToggleAnchorMode}
        onSelect={onSelectAnchor}
        onUpdateNotes={onUpdateAnchorNotes}
        onUpdatePhoto={onUpdateAnchorPhoto}
        onDelete={onDeleteAnchor}
      />

    </aside>
  );
}

const selectClass =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200";
const secondaryBtn =
  "w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
    />
  );
}

function hexFromRgba(rgba: string): string {
  const match = rgba.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!match) return "#0f172a";
  const r = Number(match[1]).toString(16).padStart(2, "0");
  const g = Number(match[2]).toString(16).padStart(2, "0");
  const b = Number(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function rgbaFromHex(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
    />
  );
}

// Toggle button — can be on/off independently
function Toggle({ active, title, label, onClick }: {
  active: boolean; title: string; label: string; onClick: () => void;
}) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition ${active ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
      {label}
    </button>
  );
}

// Radio button — mutually exclusive within a group
function Radio({ active, title, label, onClick }: {
  active: boolean; title: string; label: string; onClick: () => void;
}) {
  return (
    <button type="button" title={title} onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition ${active ? "bg-amber-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}`}>
      {label}
    </button>
  );
}

/** Vertical lines: ▲/▼ toggle ends · ◀/▶ radio side */
function VerticalLabelCross({ showTop, showBottom, side, onToggleTop, onToggleBottom, onSelectSide }: {
  showTop: boolean; showBottom: boolean;
  side: "left" | "right";
  onToggleTop: () => void; onToggleBottom: () => void;
  onSelectSide: (s: "left" | "right") => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 items-center justify-items-center py-1">
      <div />
      <Toggle active={showTop}    title="Top end"    label="▲" onClick={onToggleTop} />
      <div />
      <Radio  active={side === "left"}  title="Left of line"  label="◀" onClick={() => onSelectSide("left")} />
      <div className="h-4 w-px bg-slate-600" />
      <Radio  active={side === "right"} title="Right of line" label="▶" onClick={() => onSelectSide("right")} />
      <div />
      <Toggle active={showBottom} title="Bottom end" label="▼" onClick={onToggleBottom} />
      <div />
    </div>
  );
}

/** Horizontal lines: ◀/▶ toggle ends · ▲/▼ radio side */
function HorizontalLabelCross({ showLeft, showRight, side, onToggleLeft, onToggleRight, onSelectSide }: {
  showLeft: boolean; showRight: boolean;
  side: "top" | "bottom";
  onToggleLeft: () => void; onToggleRight: () => void;
  onSelectSide: (s: "top" | "bottom") => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 items-center justify-items-center py-1">
      <div />
      <Radio  active={side === "top"}    title="Above line"  label="▲" onClick={() => onSelectSide("top")} />
      <div />
      <Toggle active={showLeft}  title="Left end"  label="◀" onClick={onToggleLeft} />
      <div className="h-px w-4 bg-slate-600" />
      <Toggle active={showRight} title="Right end" label="▶" onClick={onToggleRight} />
      <div />
      <Radio  active={side === "bottom"} title="Below line" label="▼" onClick={() => onSelectSide("bottom")} />
      <div />
    </div>
  );
}

function AnchorSection({
  anchors,
  selectedAnchorId,
  anchorMode,
  hasImage,
  onToggleMode,
  onSelect,
  onUpdateNotes,
  onUpdatePhoto,
  onDelete,
}: {
  anchors: AnchorData[];
  selectedAnchorId: string | null;
  anchorMode: boolean;
  hasImage: boolean;
  onToggleMode: () => void;
  onSelect: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdatePhoto: (id: string, dataUrl: string | undefined) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const selectedAnchor = anchors.find((a) => a.id === selectedAnchorId) ?? null;

  return (
    <div className="border-t border-slate-800 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase text-slate-500"
      >
        <span className="flex items-center gap-2">
          Anchors
          {anchors.length > 0 && (
            <span className="rounded bg-orange-900/60 px-1.5 py-0.5 text-orange-300">
              {anchors.length}
            </span>
          )}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <button
            type="button"
            disabled={!hasImage}
            onClick={onToggleMode}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              anchorMode
                ? "bg-orange-600 text-white hover:bg-orange-500"
                : "border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {anchorMode ? "Placing anchors — click to stop" : "Place anchor"}
          </button>

          {anchors.length > 0 && (
            <ul className="space-y-1">
              {anchors.map((anchor) => (
                <li
                  key={anchor.id}
                  onClick={() => onSelect(anchor.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition ${
                    selectedAnchorId === anchor.id
                      ? "bg-orange-900/50 text-orange-200 ring-1 ring-orange-700"
                      : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-orange-500 text-[10px] font-bold text-slate-900">
                    {anchor.index}
                  </span>
                  <span className="flex-1 truncate text-xs">
                    {anchor.notes ? (
                      anchor.notes
                    ) : (
                      <span className="text-slate-500">No notes</span>
                    )}
                  </span>
                  {anchor.photoDataUrl && (
                    <span className="text-xs text-orange-400">📷</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {selectedAnchor && (
            <div className="space-y-2 rounded-md border border-orange-800/40 bg-orange-950/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-300">
                  A-{selectedAnchor.index}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(selectedAnchor.id)}
                  className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/40"
                >
                  Delete
                </button>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-slate-400">Notes</span>
                <textarea
                  value={selectedAnchor.notes}
                  onChange={(e) => onUpdateNotes(selectedAnchor.id, e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-orange-600 focus:outline-none"
                  placeholder="Inspection notes…"
                />
              </label>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Photo</span>
                {selectedAnchor.photoDataUrl ? (
                  <div className="space-y-1">
                    <img
                      src={selectedAnchor.photoDataUrl}
                      alt={`Anchor A-${selectedAnchor.index}`}
                      className="w-full rounded-md object-cover"
                      style={{ maxHeight: 120 }}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdatePhoto(selectedAnchor.id, undefined)}
                      className="w-full rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700"
                    >
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-900 px-3 py-3 text-xs text-slate-500 hover:border-orange-700 hover:text-orange-400">
                    <span>Click to add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () =>
                          onUpdatePhoto(selectedAnchor.id, reader.result as string);
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
