import type {
  GridLineData,
  GridSettings,
  HorizontalNumbering,
  VerticalNumbering,
} from "@/types/grid";

export function strokeDashArray(style: GridSettings["lineStyle"]): number[] {
  if (style === "dashed") return [12, 6];
  if (style === "dotted") return [2, 4];
  return [];
}

export function verticalLabel(
  settings: GridSettings,
  index: number,
  total: number
): string {
  const custom = settings.customVerticalLabels[index];
  if (custom) return custom;
  const order =
    settings.verticalNumbering === "ltr"
      ? index + 1
      : total - index;
  return `${settings.verticalPrefix}${order}`;
}

export function horizontalLabel(
  settings: GridSettings,
  index: number,
  total: number
): string {
  const custom = settings.customHorizontalLabels[index];
  if (custom) return custom;
  const order =
    settings.horizontalNumbering === "btt"
      ? total - index
      : index + 1;
  return `${settings.horizontalPrefix}${order}`;
}

export function createInitialLines(
  width: number,
  height: number,
  settings: GridSettings
): GridLineData[] {
  const lines: GridLineData[] = [];
  const vCount = Math.max(1, settings.verticalLines);
  const hCount = Math.max(1, settings.horizontalLines);

  for (let i = 0; i < vCount; i++) {
    const x = ((i + 1) / (vCount + 1)) * width;
    lines.push({
      id: `v-${i}`,
      orientation: "vertical",
      index: i,
      points: [
        { x, y: 0 },
        { x, y: height },
      ],
      locked: false,
    });
  }

  for (let i = 0; i < hCount; i++) {
    const y = ((i + 1) / (hCount + 1)) * height;
    lines.push({
      id: `h-${i}`,
      orientation: "horizontal",
      index: i,
      points: [
        { x: 0, y },
        { x: width, y },
      ],
      locked: false,
    });
  }

  return lines;
}

export function lineId(orientation: "vertical" | "horizontal", index: number) {
  return orientation === "vertical" ? `v-${index}` : `h-${index}`;
}

export function parseLabelIndex(
  orientation: "vertical" | "horizontal",
  id: string
): number | null {
  const match = id.match(/^(v|h)-(\d+)$/);
  if (!match) return null;
  const kind = match[1] === "v" ? "vertical" : "horizontal";
  if (kind !== orientation) return null;
  return Number(match[2]);
}

export function numberingHint(
  dir: VerticalNumbering | HorizontalNumbering
): string {
  const map: Record<string, string> = {
    ltr: "Left → right",
    rtl: "Right → left",
    btt: "Bottom → top",
    ttb: "Top → bottom",
  };
  return map[dir] ?? dir;
}
