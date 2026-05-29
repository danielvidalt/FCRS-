import {
  Line,
  Polyline,
  Point,
  controlsUtils,
  util,
  type Canvas,
  type FabricObject,
} from "fabric";
import { strokeDashArray } from "@/lib/grid";
import type { GridLineData, GridSettings } from "@/types/grid";

export const GRID_LINE_KEY = "gridLineId";
export const FREE_LABEL_KEY = "freeLabelId";

function lineColorFor(settings: GridSettings, line: GridLineData) {
  return line.orientation === "vertical"
    ? settings.verticalLineColor
    : settings.horizontalLineColor;
}

function lineThicknessFor(settings: GridSettings, line: GridLineData) {
  return line.orientation === "vertical"
    ? settings.verticalLineThickness
    : settings.horizontalLineThickness;
}

const lineStyle = (settings: GridSettings, line: GridLineData) => ({
  fill: "transparent",
  stroke: lineColorFor(settings, line),
  strokeWidth: lineThicknessFor(settings, line),
  strokeDashArray: strokeDashArray(settings.lineStyle),
  strokeLineCap: "round" as const,
  strokeUniform: true,
  opacity: settings.lineOpacity,
  selectable: !line.locked,
  evented: !line.locked,
  hasControls: !line.locked,
  hasBorders: false,
  lockMovementX: line.locked,
  lockMovementY: line.locked,
  lockScalingX: true,
  lockScalingY: true,
  lockRotation: true,
  objectCaching: false,
  perPixelTargetFind: true,
  padding: 8,
});

export function applyGridLineStyle(
  obj: FabricObject,
  settings: GridSettings,
  line: GridLineData,
  locked?: boolean
) {
  const isLocked = locked ?? line.locked;
  obj.set({
    stroke: lineColorFor(settings, line),
    strokeWidth: lineThicknessFor(settings, line),
    strokeDashArray: strokeDashArray(settings.lineStyle),
    strokeUniform: true,
    opacity: settings.lineOpacity,
    selectable: !isLocked,
    evented: !isLocked,
    hasControls: !isLocked,
    hasBorders: false,
    lockMovementX: isLocked,
    lockMovementY: isLocked,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
  });
  if (obj instanceof Polyline) {
    obj.controls = isLocked
      ? {}
      : controlsUtils.createPolyControls(obj);
    obj.setCoords();
  }
}

export function isGridLineObject(obj: FabricObject): boolean {
  return Boolean((obj as FabricObject & Record<string, string>)[GRID_LINE_KEY]);
}

export function getGridLineId(obj: FabricObject): string {
  return (obj as FabricObject & Record<string, string>)[GRID_LINE_KEY];
}

/** Canvas-space endpoints for a grid line Fabric object. */
export function fabricObjectToLineData(
  obj: FabricObject,
  meta: GridLineData
): GridLineData {
  const matrix = obj.calcTransformMatrix();

  if (obj instanceof Line) {
    const local = obj.calcLinePoints();
    const p1 = util.transformPoint(new Point(local.x1, local.y1), matrix);
    const p2 = util.transformPoint(new Point(local.x2, local.y2), matrix);
    return {
      ...meta,
      points: [
        { x: p1.x, y: p1.y },
        { x: p2.x, y: p2.y },
      ],
    };
  }

  if (obj instanceof Polyline) {
    const offsetX = obj.pathOffset?.x ?? 0;
    const offsetY = obj.pathOffset?.y ?? 0;
    const points = obj.points.map((p) => {
      const local = new Point(p.x - offsetX, p.y - offsetY);
      const canvasPoint = util.transformPoint(local, matrix);
      return { x: canvasPoint.x, y: canvasPoint.y };
    });
    return { ...meta, points };
  }

  return meta;
}

export function buildGridLineObject(
  line: GridLineData,
  settings: GridSettings
): Polyline {
  const polyline = new Polyline(
    line.points.map((p) => ({ x: p.x, y: p.y })),
    lineStyle(settings, line)
  );
  polyline.controls = line.locked
    ? {}
    : controlsUtils.createPolyControls(polyline);
  polyline.set({ [GRID_LINE_KEY]: line.id } as Record<string, string>);
  return polyline;
}

export function replaceGridLine(
  canvas: Canvas,
  previous: FabricObject,
  line: GridLineData,
  settings: GridSettings,
  select = true
): Polyline {
  canvas.remove(previous);
  const segment = buildGridLineObject(line, settings);
  canvas.add(segment);
  if (select) canvas.setActiveObject(segment);
  return segment;
}
