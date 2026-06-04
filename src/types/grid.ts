export type LineStyle = "solid" | "dashed" | "dotted";
export type VerticalLabelPosition = "top" | "bottom" | "both";
export type HorizontalLabelPosition = "left" | "right" | "both";
export type VerticalNumbering = "ltr" | "rtl";
export type HorizontalNumbering = "btt" | "ttb";

export interface GridSettings {
  verticalLines: number;
  horizontalLines: number;
  lineColor?: string;
  lineThickness?: number;
  verticalLineColor: string;
  horizontalLineColor: string;
  verticalLineThickness: number;
  horizontalLineThickness: number;
  lineOpacity: number;
  lineStyle: LineStyle;
  verticalPrefix: string;
  horizontalPrefix: string;
  verticalNumbering: VerticalNumbering;
  horizontalNumbering: HorizontalNumbering;
  /** @deprecated kept for migration — use verticalLabel* booleans instead */
  verticalLabelPosition: VerticalLabelPosition;
  /** @deprecated kept for migration — use horizontalLabel* booleans instead */
  horizontalLabelPosition: HorizontalLabelPosition;
  // Vertical line labels: which ends are active
  verticalLabelTop: boolean;
  verticalLabelBottom: boolean;
  // Vertical line labels: which side of the line the text sits on
  verticalLabelSide: "left" | "right";
  // Horizontal line labels: which ends are active
  horizontalLabelLeft: boolean;
  horizontalLabelRight: boolean;
  // Horizontal line labels: which side of the line the text sits on
  horizontalLabelSide: "top" | "bottom";
  customVerticalLabels: Record<number, string>;
  customHorizontalLabels: Record<number, string>;
  hiddenLabelKeys: Record<string, boolean>;
  labelFontSize: number;
  labelColor: string;
  labelBackgroundColor: string;
  labelBackgroundEnabled: boolean;
}

export interface FreeLabelData {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  backgroundEnabled?: boolean;
}

export interface AnchorData {
  id: string;
  index: number;
  x: number;
  y: number;
  notes: string;
  photoDataUrl?: string;
}

export interface GridLineData {
  id: string;
  orientation: "vertical" | "horizontal";
  index: number;
  points: { x: number; y: number }[];
  locked: boolean;
}

export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface ProjectData {
  version: 1;
  savedAt: string;
  imageDataUrl: string;
  imageName: string;
  gridSettings: GridSettings;
  lines: GridLineData[];
  freeLabels?: FreeLabelData[];
  anchors?: AnchorData[];
  gridLabelPositions?: Record<string, { x: number; y: number }>;
  view: ViewState;
  canvasWidth: number;
  canvasHeight: number;
}

export type ProjectViewId =
  | "north"
  | "south"
  | "east"
  | "west"
  | "rooftop"
  | "other";

export interface MultiFacadeProjectData {
  version: 2;
  mode: "project";
  savedAt: string;
  projectName?: string;
  activeViewId: ProjectViewId;
  activeImageIndex: number;
  views: Partial<Record<ProjectViewId, ProjectData[]>>;
}

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  verticalLines: 5,
  horizontalLines: 5,
  verticalLineColor: "#00d4ff",
  horizontalLineColor: "#00d4ff",
  verticalLineThickness: 2,
  horizontalLineThickness: 2,
  lineOpacity: 0.85,
  lineStyle: "solid",
  verticalPrefix: "D",
  horizontalPrefix: "L",
  verticalNumbering: "ltr",
  horizontalNumbering: "btt",
  verticalLabelPosition: "top",
  horizontalLabelPosition: "left",
  verticalLabelTop: true,
  verticalLabelBottom: false,
  verticalLabelSide: "left",
  horizontalLabelLeft: true,
  horizontalLabelRight: false,
  horizontalLabelSide: "top",
  customVerticalLabels: {},
  customHorizontalLabels: {},
  hiddenLabelKeys: {},
  labelFontSize: 14,
  labelColor: "#ffffff",
  labelBackgroundColor: "rgba(15, 23, 42, 0.88)",
  labelBackgroundEnabled: true,
};
