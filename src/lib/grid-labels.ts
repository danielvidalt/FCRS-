import { Text, type Canvas } from "fabric";
import { horizontalLabel, verticalLabel } from "@/lib/grid";
import type { FreeLabelData, GridLineData, GridSettings } from "@/types/grid";

export const LABEL_KEY = "gridLabelId";

export type LabelPlacement = "top" | "bottom" | "left" | "right";

export function labelKeyFor(lineId: string, placement: LabelPlacement): string {
  return `${lineId}-${placement}`;
}

export function isLabelHidden(settings: GridSettings, key: string): boolean {
  return Boolean(settings.hiddenLabelKeys?.[key]);
}

export function parseLabelKey(
  key: string
): { lineId: string; placement: LabelPlacement } | null {
  const match = key.match(/^(v-\d+|h-\d+)-(top|bottom|left|right)$/);
  if (!match) return null;
  return {
    lineId: match[1],
    placement: match[2] as LabelPlacement,
  };
}

export function fabricLabelStyle(settings: GridSettings) {
  return {
    fontSize: settings.labelFontSize,
    fontFamily: "system-ui, sans-serif",
    fill: settings.labelColor,
    backgroundColor: settings.labelBackgroundEnabled
      ? settings.labelBackgroundColor
      : "",
    textBackgroundColor: "",
    padding: 6,
    selectable: true,
    editable: true,
    objectCaching: false,
  };
}

export function freeLabelStyle(label: FreeLabelData, settings: GridSettings) {
  const enabled = label.backgroundEnabled ?? settings.labelBackgroundEnabled;
  // Use backgroundColor (full object rect) instead of textBackgroundColor (per-char)
  // to avoid clipping of the last character that Fabric.js textBackgroundColor exhibits.
  return {
    fontSize: label.fontSize ?? settings.labelFontSize,
    fontFamily: "system-ui, sans-serif",
    fill: label.color ?? settings.labelColor,
    backgroundColor: enabled
      ? (label.backgroundColor ?? settings.labelBackgroundColor)
      : "",
    textBackgroundColor: "",
    padding: 6,
    selectable: true,
    editable: true,
    objectCaching: false,
  };
}

export function applyLabelStyle(text: Text, settings: GridSettings) {
  text.set(fabricLabelStyle(settings));
}

type LabelSideSettings = {
  verticalLabelSide?: "left" | "right";
  horizontalLabelSide?: "top" | "bottom";
};

// Visual gap from line to label edge (same on both sides for symmetric look).
const SIDE_GAP = 12;
// Estimated label width (text + padding) for symmetric left-offset calculation.
const LABEL_EST_W = 40;
// Gap between line endpoint and label (outside the line).
const END_GAP = 10;

export function defaultLabelPosition(
  line: GridLineData,
  placement: LabelPlacement,
  canvasWidth: number,
  canvasHeight: number,
  sideSettings?: LabelSideSettings
): { x: number; y: number } {
  const pts = line.points;
  if (!pts.length) return { x: 8, y: 8 };

  const pad = 8;
  const labelH = 22;

  if (line.orientation === "vertical") {
    const topPt = pts.reduce((a, b) => (a.y < b.y ? a : b));
    const botPt = pts.reduce((a, b) => (a.y > b.y ? a : b));
    const side = sideSettings?.verticalLabelSide ?? "left";
    const refPt = placement === "top" ? topPt : botPt;

    // x: same visual gap from the line on both sides
    const x = side === "right"
      ? Math.min(canvasWidth - 52, refPt.x + SIDE_GAP)
      : Math.max(pad, refPt.x - SIDE_GAP - LABEL_EST_W);

    // y: label sits OUTSIDE the line endpoint (not on the line body)
    const y = placement === "top"
      ? Math.max(pad, refPt.y - labelH - END_GAP)
      : Math.min(canvasHeight - labelH, refPt.y + END_GAP);

    return { x, y };
  }

  // horizontal line
  const leftPt = pts.reduce((a, b) => (a.x < b.x ? a : b));
  const rightPt = pts.reduce((a, b) => (a.x > b.x ? a : b));
  const hSide = sideSettings?.horizontalLabelSide ?? "top";
  const refPt = placement === "left" ? leftPt : rightPt;

  // x: keep labels inside the line extent, near the endpoint
  const x = placement === "left"
    ? Math.max(pad, refPt.x + SIDE_GAP)
    : Math.max(pad, Math.min(refPt.x - LABEL_EST_W - SIDE_GAP, canvasWidth - 52));

  // y: same visual gap from the line on both sides (above or below)
  const y = hSide === "bottom"
    ? Math.min(canvasHeight - labelH, refPt.y + SIDE_GAP)
    : Math.max(pad, refPt.y - labelH - SIDE_GAP);

  return { x, y };
}

export function getLabelsForLine(canvas: Canvas, lineId: string): Text[] {
  return canvas.getObjects().filter((obj) => {
    if (!(obj instanceof Text)) return false;
    const key = (obj as Text & Record<string, string>)[LABEL_KEY];
    if (!key) return false;
    return parseLabelKey(key)?.lineId === lineId;
  }) as Text[];
}

export function labelTextFor(
  line: GridLineData,
  placement: LabelPlacement,
  settings: GridSettings,
  vCount: number,
  hCount: number
): string {
  if (line.orientation === "vertical") {
    return verticalLabel(settings, line.index, vCount);
  }
  return horizontalLabel(settings, line.index, hCount);
}

export function syncLabelsForLine(
  canvas: Canvas,
  lineId: string,
  line: GridLineData,
  settings: GridSettings,
  vCount: number,
  hCount: number,
  manualPositions: Map<string, { x: number; y: number }>
): void {
  const cw = canvas.getWidth();
  const ch = canvas.getHeight();

  for (const text of getLabelsForLine(canvas, lineId)) {
    const key = (text as Text & Record<string, string>)[LABEL_KEY];
    if (!key) continue;

    if (isLabelHidden(settings, key)) {
      canvas.remove(text);
      continue;
    }

    const parsed = parseLabelKey(key);
    if (!parsed) continue;

    const manual = manualPositions.get(key);
    if (manual) {
      text.set({ left: manual.x, top: manual.y });
    } else {
      const pos = defaultLabelPosition(line, parsed.placement, cw, ch, settings);
      text.set({ left: pos.x, top: pos.y });
    }

    text.set({ text: labelTextFor(line, parsed.placement, settings, vCount, hCount) });
    applyLabelStyle(text, settings);
    text.setCoords();
  }
}

export function rememberLabelPosition(
  text: Text,
  manualPositions: Map<string, { x: number; y: number }>
): void {
  const key = (text as Text & Record<string, string>)[LABEL_KEY];
  if (!key) return;
  manualPositions.set(key, {
    x: text.left ?? 0,
    y: text.top ?? 0,
  });
}

export function placementsForLine(
  line: GridLineData,
  settings: GridSettings
): LabelPlacement[] {
  if (line.orientation === "vertical") {
    const list: LabelPlacement[] = [];
    if (settings.verticalLabelTop) list.push("top");
    if (settings.verticalLabelBottom) list.push("bottom");
    return list;
  }
  const list: LabelPlacement[] = [];
  if (settings.horizontalLabelLeft) list.push("left");
  if (settings.horizontalLabelRight) list.push("right");
  return list;
}

export function countLinesByOrientation(lines: Iterable<GridLineData>) {
  let vCount = 0;
  let hCount = 0;
  for (const line of lines) {
    if (line.orientation === "vertical") vCount++;
    else hCount++;
  }
  return { vCount, hCount };
}
