"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Canvas,
  FabricImage,
  IText,
  Point,
  Text,
  type FabricObject,
  type TPointerEventInfo,
} from "fabric";
import {
  ANCHOR_KEY,
  applyGridLineStyle,
  buildGridLineObject,
  fabricObjectToLineData,
  FREE_LABEL_KEY,
  getGridLineId,
  GRID_LINE_KEY,
  isGridLineObject,
  replaceGridLine,
} from "@/lib/fabric-grid";
import {
  applyBackgroundPadding,
  countLinesByOrientation,
  defaultLabelPosition,
  fabricLabelStyle,
  freeLabelStyle,
  isLabelHidden,
  LABEL_KEY,
  labelKeyFor,
  labelTextFor,
  parseLabelKey,
  placementsForLine,
  rememberLabelPosition,
  syncLabelsForLine,
} from "@/lib/grid-labels";
import { createInitialLines } from "@/lib/grid";
import { insertPointOnLineAt } from "@/lib/line-points";
import type {
  AnchorData,
  FreeLabelData,
  GridLineData,
  GridSettings,
  ProjectData,
  ViewState,
} from "@/types/grid";

function fitImageToCanvas(img: FabricImage, cw: number, ch: number) {
  const { width: iw, height: ih } = img.getOriginalSize();
  if (!iw || !ih) return;

  const scale = Math.min((cw * 0.92) / iw, (ch * 0.92) / ih);
  img.set({
    originX: "left",
    originY: "top",
    scaleX: scale,
    scaleY: scale,
    left: (cw - iw * scale) / 2,
    top: (ch - ih * scale) / 2,
    selectable: false,
    evented: false,
  });
}

function loadFabricImage(dataUrl: string): Promise<FabricImage> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(new FabricImage(element));
    element.onerror = () => reject(new Error("Could not load image."));
    element.src = dataUrl;
  });
}

function setCanvasImage(
  canvas: Canvas,
  img: FabricImage,
  previous: FabricImage | null
) {
  if (previous) {
    canvas.remove(previous);
    previous.dispose();
  }
  if (canvas.backgroundImage) {
    canvas.backgroundImage.dispose();
    canvas.backgroundImage = undefined;
  }
  canvas.add(img);
  canvas.sendObjectToBack(img);
}

export interface GridCanvasHandle {
  loadImage: (file: File) => Promise<void>;
  generateGrid: (settings: GridSettings) => void;
  resetGrid: () => void;
  getSnapshot: (
    settings: GridSettings,
    imageName: string
  ) => ProjectData | null;
  applyProject: (project: ProjectData) => Promise<void>;
  exportImage: (format: "png" | "jpeg") => string | null;
  copyToClipboard: () => Promise<boolean>;
  undo: () => void;
  redo: () => void;
  resetView: () => void;
  setZoom: (zoom: number) => void;
  nudgeZoom: (delta: number) => void;
  addControlPoint: () => void;
  removeControlPoint: () => void;
  toggleLockSelected: () => void;
  deleteSelectedLine: () => void;
  beginGridScale: () => void;
  scaleGridLive: (scaleX: number, scaleY: number) => void;
  commitGridScale: () => void;
  scaleGrid: (scaleX: number, scaleY: number) => void;
  addFreeLabel: (opts?: { text?: string; x?: number; y?: number; enterEdit?: boolean; fontSize?: number }) => void;
  getFreeLabelMeta: (id: string) => FreeLabelData | null;
  updateFreeLabelStyle: (id: string, style: Partial<Pick<FreeLabelData, "fontSize" | "color" | "backgroundColor" | "backgroundEnabled">>) => void;
  refreshGridStyles: (settings: GridSettings) => void;
  refreshLabels: (settings: GridSettings) => void;
  refreshLabelAppearance: (settings: GridSettings) => void;
  getCanvasSize: () => { width: number; height: number };
  hasImage: () => boolean;
  deleteAnchor: (id: string) => void;
  updateAnchorNotes: (id: string, notes: string) => void;
  selectAnchor: (id: string) => void;
}

interface GridCanvasProps {
  settings: GridSettings;
  panMode: boolean;
  moveGridMode: boolean;
  anchorMode: boolean;
  onSelectionChange: (lineId: string | null, freeLabelId: string | null, anchorId: string | null) => void;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  onSettingsChange: (settings: GridSettings) => void;
  onAnchorsChange: (anchors: AnchorData[]) => void;
}

type HistoryEntry = {
  lines: GridLineData[];
  freeLabels: FreeLabelData[];
  view: ViewState;
  hiddenLabelKeys: Record<string, boolean>;
};


const GridCanvas = forwardRef<GridCanvasHandle, GridCanvasProps>(
  function GridCanvas(
    {
      settings,
      panMode,
      moveGridMode,
      anchorMode,
      onSelectionChange,
      onHistoryChange,
      onSettingsChange,
      onAnchorsChange,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<Canvas | null>(null);
    const imageRef = useRef<FabricImage | null>(null);
    const imageDataUrlRef = useRef<string>("");
    const imageNameRef = useRef<string>("");
    const linesMetaRef = useRef<Map<string, GridLineData>>(new Map());
    const freeLabelsMetaRef = useRef<Map<string, FreeLabelData>>(new Map());
    const manualLabelPositionsRef = useRef(
      new Map<string, { x: number; y: number }>()
    );
    const historyRef = useRef<HistoryEntry[]>([]);
    const historyIndexRef = useRef(-1);
    const anchorsMetaRef = useRef<Map<string, AnchorData>>(new Map());
    const anchorCounterRef = useRef(0);
    const scaleBaselineRef = useRef<GridLineData[] | null>(null);
    const viewRef = useRef<ViewState>({ zoom: 1, panX: 0, panY: 0 });
    const isPanningRef = useRef(false);
    const lastPanRef = useRef({ x: 0, y: 0 });
    const [ready, setReady] = useState(false);
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onHistoryChangeRef = useRef(onHistoryChange);
    const onSettingsChangeRef = useRef(onSettingsChange);
    const onAnchorsChangeRef = useRef(onAnchorsChange);
    const settingsRef = useRef(settings);
    const moveGridModeRef = useRef(moveGridMode);
    onSelectionChangeRef.current = onSelectionChange;
    moveGridModeRef.current = moveGridMode;
    onHistoryChangeRef.current = onHistoryChange;
    onSettingsChangeRef.current = onSettingsChange;
    onAnchorsChangeRef.current = onAnchorsChange;
    settingsRef.current = settings;

    const updateSettingsRef = useCallback((next: GridSettings) => {
      settingsRef.current = next;
      onSettingsChangeRef.current(next);
    }, []);

    const pushHistory = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const lines = extractLines(canvas);
      const freeLabels = extractFreeLabels(canvas);
      const entry: HistoryEntry = {
        lines,
        freeLabels,
        view: { ...viewRef.current },
        hiddenLabelKeys: { ...settingsRef.current.hiddenLabelKeys },
      };
      const next = historyRef.current.slice(0, historyIndexRef.current + 1);
      next.push(entry);
      if (next.length > 40) next.shift();
      historyRef.current = next;
      historyIndexRef.current = next.length - 1;
      onHistoryChangeRef.current(historyIndexRef.current > 0, false);
    }, []);

    const extractLines = (canvas: Canvas): GridLineData[] => {
      const result: GridLineData[] = [];
      canvas.getObjects().forEach((obj) => {
        const id = (obj as FabricObject & Record<string, string>)[
          GRID_LINE_KEY
        ];
        if (!id || !isGridLineObject(obj)) return;
        const meta = linesMetaRef.current.get(id);
        if (!meta) return;
        result.push(fabricObjectToLineData(obj, meta));
      });
      return result.sort((a, b) => {
        if (a.orientation !== b.orientation) {
          return a.orientation === "vertical" ? -1 : 1;
        }
        return a.index - b.index;
      });
    };

    const extractFreeLabels = (canvas: Canvas): FreeLabelData[] => {
      const result: FreeLabelData[] = [];
      canvas.getObjects().forEach((obj) => {
        const id = (obj as FabricObject & Record<string, string>)[FREE_LABEL_KEY];
        if (!id) return;
        const meta = freeLabelsMetaRef.current.get(id);
        result.push({
          ...meta,
          id,
          text: (obj as IText).text ?? "",
          x: obj.left ?? 0,
          y: obj.top ?? 0,
        });
      });
      return result;
    };

    const extractAnchors = (canvas: Canvas): AnchorData[] => {
      const result: AnchorData[] = [];
      canvas.getObjects().forEach((obj) => {
        const id = (obj as FabricObject & Record<string, string>)[ANCHOR_KEY];
        if (!id) return;
        const meta = anchorsMetaRef.current.get(id);
        if (!meta) return;
        result.push({ ...meta, x: obj.left ?? meta.x, y: obj.top ?? meta.y });
      });
      return result;
    };

    const applyView = useCallback((view: ViewState) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      viewRef.current = view;
      canvas.setZoom(view.zoom);
      const vpt = canvas.viewportTransform;
      if (vpt) {
        vpt[4] = view.panX;
        vpt[5] = view.panY;
        canvas.setViewportTransform(vpt);
      }
      canvas.requestRenderAll();
    }, []);

    const clearLineObjects = (canvas: Canvas) => {
      canvas
        .getObjects()
        .filter(
          (o) => (o as FabricObject & Record<string, string>)[GRID_LINE_KEY]
        )
        .forEach((o) => canvas.remove(o));
    };

    const clearLabelObjects = (canvas: Canvas) => {
      canvas
        .getObjects()
        .filter((o) => (o as FabricObject & Record<string, string>)[LABEL_KEY])
        .forEach((o) => canvas.remove(o));
    };

    const clearGridObjects = (canvas: Canvas) => {
      clearLineObjects(canvas);
      clearLabelObjects(canvas);
    };

    const renderLines = useCallback(
      (canvas: Canvas, lines: GridLineData[], gridSettings: GridSettings) => {
        clearLineObjects(canvas);
        linesMetaRef.current.clear();
        lines.forEach((line) => {
          linesMetaRef.current.set(line.id, line);
          const segment = buildGridLineObject(line, gridSettings);
          canvas.add(segment);
          canvas.bringObjectToFront(segment);
        });
        canvas.renderAll();
      },
      []
    );

    const attachLabel = useCallback(
      (
        text: IText,
        key: string,
      ) => {
        text.set({ [LABEL_KEY]: key } as Record<string, string>);
        text.on("modified", () => {
          rememberLabelPosition(text, manualLabelPositionsRef.current);
        });
      },
      []
    );

    const renderLabels = useCallback(
      (canvas: Canvas, gridSettings: GridSettings) => {
        clearLabelObjects(canvas);

        const vLines = [...linesMetaRef.current.values()]
          .filter((l) => l.orientation === "vertical")
          .sort((a, b) => a.index - b.index);
        const hLines = [...linesMetaRef.current.values()]
          .filter((l) => l.orientation === "horizontal")
          .sort((a, b) => a.index - b.index);
        const allLines = [...vLines, ...hLines];
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();
        const style = fabricLabelStyle(gridSettings);

        for (const line of allLines) {
          const placements = placementsForLine(line, gridSettings);
          for (const placement of placements) {
            const key = labelKeyFor(line.id, placement);
            if (isLabelHidden(gridSettings, key)) continue;
            const manual = manualLabelPositionsRef.current.get(key);
            const pos =
              manual ??
              defaultLabelPosition(line, placement, cw, ch, gridSettings);
            const text = new IText(
              labelTextFor(
                line,
                placement,
                gridSettings,
                vLines.length,
                hLines.length
              ),
              { ...style, left: pos.x, top: pos.y }
            );
            applyBackgroundPadding(text);
            attachLabel(text, key);
            canvas.add(text);
            canvas.bringObjectToFront(text);
          }
        }

        canvas.renderAll();
      },
      [attachLabel]
    );

    const updateLineAndSyncLabels = useCallback(
      (target: FabricObject) => {
        const canvas = canvasRef.current;
        if (!canvas || !isGridLineObject(target)) return;
        const id = getGridLineId(target);
        const meta = linesMetaRef.current.get(id);
        if (!meta) return;
        const updated = fabricObjectToLineData(target, meta);
        linesMetaRef.current.set(id, updated);
        applyGridLineStyle(target, settingsRef.current, updated, meta.locked);
        const { vCount, hCount } = countLinesByOrientation(
          linesMetaRef.current.values()
        );
        syncLabelsForLine(
          canvas,
          id,
          updated,
          settingsRef.current,
          vCount,
          hCount,
          manualLabelPositionsRef.current
        );
      },
      []
    );

    const syncAllLabels = useCallback(
      (canvas: Canvas, gridSettings: GridSettings) => {
        const { vCount, hCount } = countLinesByOrientation(
          linesMetaRef.current.values()
        );
        for (const line of linesMetaRef.current.values()) {
          syncLabelsForLine(
            canvas,
            line.id,
            line,
            gridSettings,
            vCount,
            hCount,
            manualLabelPositionsRef.current
          );
        }
        canvas.getObjects().forEach((obj) => {
          const rec = obj as FabricObject & Record<string, string>;
          if (rec[LABEL_KEY]) {
            canvas.bringObjectToFront(obj);
          } else if (rec[FREE_LABEL_KEY]) {
            // Free labels keep their own per-label style — just reorder
            (obj as IText).setCoords();
            canvas.bringObjectToFront(obj);
          }
        });
        canvas.requestRenderAll();
      },
      []
    );

    const insertPointOnLineAtPointer = useCallback(
      (target: FabricObject, scenePoint: Point): boolean => {
        const canvas = canvasRef.current;
        if (!canvas || !isGridLineObject(target)) return false;
        const id = getGridLineId(target);
        const meta = linesMetaRef.current.get(id);
        if (!meta || meta.locked) return false;

        const current = fabricObjectToLineData(target, meta);
        const nextPoints = insertPointOnLineAt(current.points, {
          x: scenePoint.x,
          y: scenePoint.y,
        });
        if (!nextPoints) return false;

        const newMeta: GridLineData = { ...meta, points: nextPoints };
        linesMetaRef.current.set(id, newMeta);
        replaceGridLine(canvas, target, newMeta, settingsRef.current);
        const { vCount, hCount } = countLinesByOrientation(
          linesMetaRef.current.values()
        );
        syncLabelsForLine(
          canvas,
          id,
          newMeta,
          settingsRef.current,
          vCount,
          hCount,
          manualLabelPositionsRef.current
        );
        canvas.requestRenderAll();
        return true;
      },
      []
    );

    const renderFreeLabels = useCallback(
      (canvas: Canvas, freeLabels: FreeLabelData[], gridSettings: GridSettings) => {
        canvas
          .getObjects()
          .filter((o) => (o as FabricObject & Record<string, string>)[FREE_LABEL_KEY])
          .forEach((o) => canvas.remove(o));
        freeLabelsMetaRef.current.clear();
        freeLabels.forEach((label) => {
          freeLabelsMetaRef.current.set(label.id, label);
          const itext = new IText(label.text || "Label", {
            ...freeLabelStyle(label, gridSettings),
            left: label.x,
            top: label.y,
          });
          applyBackgroundPadding(itext);
          itext.set({ [FREE_LABEL_KEY]: label.id } as Record<string, string>);
          canvas.add(itext);
          canvas.bringObjectToFront(itext);
        });
        canvas.renderAll();
      },
      []
    );

    const renderAnchors = useCallback(
      (canvas: Canvas, anchors: AnchorData[]) => {
        canvas
          .getObjects()
          .filter((o) => !!(o as FabricObject & Record<string, string>)[ANCHOR_KEY])
          .forEach((o) => canvas.remove(o));
        anchorsMetaRef.current.clear();
        let maxIndex = 0;
        anchors.forEach((anchor) => {
          anchorsMetaRef.current.set(anchor.id, anchor);
          if (anchor.index > maxIndex) maxIndex = anchor.index;
          const displayText = anchor.notes
            ? `A-${anchor.index} — ${anchor.notes}`
            : `A-${anchor.index}`;
          const itext = new IText(displayText, {
            fontSize: 11,
            fontFamily: "system-ui, sans-serif",
            fill: "#1e293b",
            backgroundColor: "#f97316",
            padding: 5,
            left: anchor.x,
            top: anchor.y,
            selectable: true,
            editable: true,
            objectCaching: false,
            hasControls: false,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
          });
          applyBackgroundPadding(itext);
          itext.set({ [ANCHOR_KEY]: anchor.id } as Record<string, string>);
          canvas.add(itext);
          canvas.bringObjectToFront(itext);
        });
        anchorCounterRef.current = Math.max(anchorCounterRef.current, maxIndex);
        canvas.renderAll();
      },
      []
    );

    const renderLabelsRef = useRef(renderLabels);
    const renderFreeLabelsRef = useRef(renderFreeLabels);
    const renderAnchorsRef = useRef(renderAnchors);
    const syncAllLabelsRef = useRef(syncAllLabels);
    const updateLineAndSyncLabelsRef = useRef(updateLineAndSyncLabels);
    const insertPointOnLineAtPointerRef = useRef(insertPointOnLineAtPointer);
    renderLabelsRef.current = renderLabels;
    renderFreeLabelsRef.current = renderFreeLabels;
    renderAnchorsRef.current = renderAnchors;
    syncAllLabelsRef.current = syncAllLabels;
    updateLineAndSyncLabelsRef.current = updateLineAndSyncLabels;
    insertPointOnLineAtPointerRef.current = insertPointOnLineAtPointer;

    useEffect(() => {
      if (!containerRef.current) return;
      // Capture in closure so cleanup can call replaceChildren even if the ref
      // gets nulled by React before the cleanup runs (React 18 StrictMode).
      const container = containerRef.current;
      const el = document.createElement("canvas");
      container.appendChild(el);

      const width = container.clientWidth || 900;
      const height = container.clientHeight || 600;

      const canvas = new Canvas(el, {
        width,
        height,
        backgroundColor: "transparent",
        selection: !panMode,
        preserveObjectStacking: true,
      });
      const wrapper = (canvas as Canvas & { wrapperEl?: HTMLElement }).wrapperEl;
      if (wrapper) {
        wrapper.style.position = "relative";
        wrapper.style.zIndex = "1";
      }
      const canvasWrapper = canvas.getElement().parentElement;
      if (canvasWrapper) {
        canvasWrapper.style.position = "relative";
        canvasWrapper.style.zIndex = "10";
      }

      canvasRef.current = canvas;

      const onModified = (e?: { target?: FabricObject }) => {
        const target = e?.target ?? canvas.getActiveObject();
        if (target instanceof Text) {
          const anchorId = (target as Text & Record<string, string>)[ANCHOR_KEY];
          if (anchorId) {
            const existing = anchorsMetaRef.current.get(anchorId);
            if (existing) {
              anchorsMetaRef.current.set(anchorId, {
                ...existing,
                x: target.left ?? existing.x,
                y: target.top ?? existing.y,
              });
              onAnchorsChangeRef.current([...anchorsMetaRef.current.values()]);
            }
          } else {
            const freeId = (target as Text & Record<string, string>)[FREE_LABEL_KEY];
            if (freeId) {
              const existing = freeLabelsMetaRef.current.get(freeId);
              freeLabelsMetaRef.current.set(freeId, {
                ...existing,
                id: freeId,
                text: (target as IText).text ?? "",
                x: target.left ?? 0,
                y: target.top ?? 0,
              });
            } else {
              const key = (target as Text & Record<string, string>)[LABEL_KEY];
              if (key) rememberLabelPosition(target, manualLabelPositionsRef.current);
            }
          }
        } else if (target && isGridLineObject(target)) {
          updateLineAndSyncLabelsRef.current(target);
        }
        pushHistory();
      };

      canvas.on("object:modified", onModified);
      canvas.on("object:modifyPoly", (e) => {
        if (e.target && isGridLineObject(e.target)) {
          updateLineAndSyncLabelsRef.current(e.target);
        }
      });
      canvas.on("object:scaling", (e) => {
        if (e.target && isGridLineObject(e.target)) {
          const id = getGridLineId(e.target);
          const meta = linesMetaRef.current.get(id);
          if (meta) applyGridLineStyle(e.target, settingsRef.current, meta);
        }
      });
      canvas.on("mouse:dblclick", (opt) => {
        const target = opt.target;
        if (!target || !isGridLineObject(target)) return;
        if (insertPointOnLineAtPointerRef.current(target, opt.scenePoint)) {
          pushHistory();
        }
      });

      // Save label text + position when inline editing exits.
      canvas.on("text:editing:exited", ({ target }) => {
        const anchorId = (target as IText & Record<string, string>)[ANCHOR_KEY];
        if (anchorId) {
          const existing = anchorsMetaRef.current.get(anchorId);
          if (existing) {
            // Parse notes from edited text: everything after "A-N — " or "A-N"
            const full = target.text ?? `A-${existing.index}`;
            const prefix = `A-${existing.index} — `;
            const notes = full.startsWith(prefix)
              ? full.slice(prefix.length)
              : full === `A-${existing.index}`
              ? ""
              : full;
            anchorsMetaRef.current.set(anchorId, {
              ...existing,
              notes,
              x: target.left ?? existing.x,
              y: target.top ?? existing.y,
            });
            onAnchorsChangeRef.current([...anchorsMetaRef.current.values()]);
          }
          pushHistory();
          return;
        }
        const freeId = (target as IText & Record<string, string>)[FREE_LABEL_KEY];
        if (freeId) {
          const existing = freeLabelsMetaRef.current.get(freeId);
          freeLabelsMetaRef.current.set(freeId, {
            ...existing,
            id: freeId,
            text: target.text ?? "",
            x: target.left ?? 0,
            y: target.top ?? 0,
          });
          pushHistory();
          return;
        }
        const key = (target as IText & Record<string, string>)[LABEL_KEY];
        if (!key) return;
        rememberLabelPosition(target, manualLabelPositionsRef.current);
        const parsed = parseLabelKey(key);
        if (!parsed) return;
        const meta = linesMetaRef.current.get(parsed.lineId);
        if (!meta) return;
        const newText = target.text ?? "";
        const cur = settingsRef.current;
        const nextSettings =
          meta.orientation === "vertical"
            ? { ...cur, customVerticalLabels: { ...cur.customVerticalLabels, [meta.index]: newText } }
            : { ...cur, customHorizontalLabels: { ...cur.customHorizontalLabels, [meta.index]: newText } };
        updateSettingsRef(nextSettings);
        pushHistory();
      });

      const deleteLineById = (id: string) => {
        const lineObj = canvas
          .getObjects()
          .find((o) => (o as FabricObject & Record<string, string>)[GRID_LINE_KEY] === id);
        if (lineObj) canvas.remove(lineObj);
        linesMetaRef.current.delete(id);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        const target = canvas.getActiveObject();
        if (!target) return;
        if ((target as FabricObject & { isEditing?: boolean }).isEditing) return;

        if (isGridLineObject(target)) {
          event.preventDefault();
          const id = getGridLineId(target);
          canvas.discardActiveObject();
          deleteLineById(id);
          onSelectionChangeRef.current(null, null, null);
          canvas.requestRenderAll();
          pushHistory();
          return;
        }

        if (target instanceof Text) {
          const anchorId = (target as Text & Record<string, string>)[ANCHOR_KEY];
          if (anchorId) {
            event.preventDefault();
            anchorsMetaRef.current.delete(anchorId);
            canvas.remove(target);
            canvas.discardActiveObject();
            onSelectionChangeRef.current(null, null, null);
            canvas.requestRenderAll();
            onAnchorsChangeRef.current([...anchorsMetaRef.current.values()]);
            pushHistory();
            return;
          }
          const freeId = (target as Text & Record<string, string>)[FREE_LABEL_KEY];
          if (freeId) {
            event.preventDefault();
            freeLabelsMetaRef.current.delete(freeId);
            canvas.remove(target);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            pushHistory();
            return;
          }
          const key = (target as Text & Record<string, string>)[LABEL_KEY];
          if (!key) return;
          event.preventDefault();
          const nextSettings = {
            ...settingsRef.current,
            hiddenLabelKeys: { ...settingsRef.current.hiddenLabelKeys, [key]: true },
          };
          updateSettingsRef(nextSettings);
          manualLabelPositionsRef.current.delete(key);
          canvas.remove(target);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          pushHistory();
        }
      };
      window.addEventListener("keydown", onKeyDown);

      const fireSelection = () => {
        const obj = canvas.getActiveObject();
        const rec = obj as (FabricObject & Record<string, string>) | undefined;
        const lineId = rec?.[GRID_LINE_KEY];
        const freeId = rec?.[FREE_LABEL_KEY];
        const anchorId = rec?.[ANCHOR_KEY];
        onSelectionChangeRef.current(
          typeof lineId === "string" ? lineId : null,
          typeof freeId === "string" ? freeId : null,
          typeof anchorId === "string" ? anchorId : null,
        );
      };
      canvas.on("selection:created", fireSelection);
      canvas.on("selection:updated", fireSelection);
      canvas.on("selection:cleared", () => onSelectionChangeRef.current(null, null, null));

      const onWheel = (opt: TPointerEventInfo<WheelEvent>) => {
        const e = opt.e;
        e.preventDefault();
        e.stopPropagation();
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** e.deltaY;
        zoom = Math.min(5, Math.max(0.2, zoom));
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom);
        viewRef.current.zoom = zoom;
        const vpt = canvas.viewportTransform;
        if (vpt) {
          viewRef.current.panX = vpt[4];
          viewRef.current.panY = vpt[5];
        }
      };
      canvas.on("mouse:wheel", onWheel);

      setReady(true);
      pushHistory();

      const resizeObserver = new ResizeObserver(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0) {
          canvas.setDimensions({ width: w, height: h });
          canvas.requestRenderAll();
        }
      });
      resizeObserver.observe(container);

      return () => {
        window.removeEventListener("keydown", onKeyDown);
        resizeObserver.disconnect();
        canvas.dispose();
        canvasRef.current = null;
        container.replaceChildren();
      };
      // Canvas must initialize once; unstable deps were recreating it after upload.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.selection = !panMode;
      canvas.defaultCursor = panMode ? "grab" : "default";

      const pointerXY = (opt: TPointerEventInfo) => {
        const e = opt.e;
        if ("clientX" in e) return { x: e.clientX, y: e.clientY };
        const touch = e.touches[0] ?? e.changedTouches[0];
        return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
      };

      const onDown = (opt: TPointerEventInfo) => {
        if (!panMode) return;
        isPanningRef.current = true;
        lastPanRef.current = pointerXY(opt);
        canvas.defaultCursor = "grabbing";
      };
      const onMove = (opt: TPointerEventInfo) => {
        if (!panMode || !isPanningRef.current) return;
        const vpt = canvas.viewportTransform;
        if (!vpt) return;
        const { x, y } = pointerXY(opt);
        vpt[4] += x - lastPanRef.current.x;
        vpt[5] += y - lastPanRef.current.y;
        canvas.setViewportTransform(vpt);
        viewRef.current.panX = vpt[4];
        viewRef.current.panY = vpt[5];
        lastPanRef.current = { x, y };
        canvas.requestRenderAll();
      };
      const onUp = () => {
        isPanningRef.current = false;
        if (panMode) canvas.defaultCursor = "grab";
      };

      canvas.on("mouse:down", onDown);
      canvas.on("mouse:move", onMove);
      canvas.on("mouse:up", onUp);

      return () => {
        canvas.off("mouse:down", onDown);
        canvas.off("mouse:move", onMove);
        canvas.off("mouse:up", onUp);
      };
    }, [panMode]);

    // Move-grid mode: drag to translate the entire grid in real-time.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (moveGridMode) {
        canvas.selection = false;
        canvas.defaultCursor = "move";
      } else {
        canvas.selection = !panMode;
        canvas.defaultCursor = panMode ? "grab" : "default";
        return;
      }

      const isMoving = { current: false };
      const last = { x: 0, y: 0 };

      const pointerXY = (opt: TPointerEventInfo) => {
        const e = opt.e;
        if ("clientX" in e) return { x: e.clientX, y: e.clientY };
        const t = (e as TouchEvent).touches[0] ?? (e as TouchEvent).changedTouches[0];
        return { x: t?.clientX ?? 0, y: t?.clientY ?? 0 };
      };

      const onDown = (opt: TPointerEventInfo) => {
        isMoving.current = true;
        const { x, y } = pointerXY(opt);
        last.x = x; last.y = y;
        canvas.discardActiveObject();
      };

      const onMove = (opt: TPointerEventInfo) => {
        if (!isMoving.current) return;
        const { x, y } = pointerXY(opt);
        const zoom = canvas.getZoom();
        const dx = (x - last.x) / zoom;
        const dy = (y - last.y) / zoom;
        last.x = x; last.y = y;

        canvas.getObjects().forEach((obj) => {
          const rec = obj as FabricObject & Record<string, string>;
          if (rec[GRID_LINE_KEY] || rec[LABEL_KEY] || rec[FREE_LABEL_KEY]) {
            obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
            obj.setCoords();
          }
        });
        canvas.requestRenderAll();
      };

      const onUp = () => {
        if (!isMoving.current) return;
        isMoving.current = false;
        // Sync linesMetaRef with new positions after drag.
        canvas.getObjects().forEach((obj) => {
          const id = (obj as FabricObject & Record<string, string>)[GRID_LINE_KEY];
          if (!id) return;
          const meta = linesMetaRef.current.get(id);
          if (meta) linesMetaRef.current.set(id, fabricObjectToLineData(obj, meta));
        });
        // Sync free labels meta.
        canvas.getObjects().forEach((obj) => {
          const freeId = (obj as FabricObject & Record<string, string>)[FREE_LABEL_KEY];
          if (!freeId) return;
          const existing = freeLabelsMetaRef.current.get(freeId);
          if (existing) {
            freeLabelsMetaRef.current.set(freeId, {
              ...existing,
              x: obj.left ?? existing.x,
              y: obj.top ?? existing.y,
            });
          }
        });
        pushHistory();
      };

      canvas.on("mouse:down", onDown);
      canvas.on("mouse:move", onMove);
      canvas.on("mouse:up", onUp);

      return () => {
        canvas.off("mouse:down", onDown);
        canvas.off("mouse:move", onMove);
        canvas.off("mouse:up", onUp);
        canvas.defaultCursor = "default";
        canvas.selection = true;
      };
    }, [moveGridMode, panMode]);

    // Anchor placement mode: click on empty canvas to drop an anchor marker.
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !anchorMode) return;

      canvas.selection = false;
      canvas.defaultCursor = "crosshair";

      const onDown = (opt: TPointerEventInfo) => {
        if (opt.target) return; // let existing object selection handle clicks on objects
        const point = opt.scenePoint;
        if (!point) return;
        anchorCounterRef.current += 1;
        const id = `anchor-${Math.random().toString(36).slice(2, 10)}`;
        const anchor: AnchorData = {
          id,
          index: anchorCounterRef.current,
          x: point.x,
          y: point.y,
          notes: "",
        };
        anchorsMetaRef.current.set(id, anchor);
        const itext = new IText(`A-${anchor.index}`, {
          fontSize: 11,
          fontFamily: "system-ui, sans-serif",
          fill: "#1e293b",
          backgroundColor: "#f97316",
          padding: 5,
          left: anchor.x,
          top: anchor.y,
          selectable: true,
          editable: true,
          objectCaching: false,
          hasControls: false,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
        });
        applyBackgroundPadding(itext);
        itext.set({ [ANCHOR_KEY]: id } as Record<string, string>);
        canvas.add(itext);
        canvas.bringObjectToFront(itext);
        canvas.setActiveObject(itext);
        canvas.renderAll();
        onAnchorsChangeRef.current([...anchorsMetaRef.current.values()]);
        pushHistory();
      };

      canvas.on("mouse:down", onDown);
      return () => {
        canvas.off("mouse:down", onDown);
        canvas.selection = !panMode;
        canvas.defaultCursor = panMode ? "grab" : "default";
      };
    }, [anchorMode, panMode, pushHistory]);

    useImperativeHandle(ref, () => ({
      hasImage: () => !!imageRef.current,
      getCanvasSize: () => {
        const canvas = canvasRef.current;
        return {
          width: canvas?.getWidth() ?? 1200,
          height: canvas?.getHeight() ?? 800,
        };
      },

      loadImage: async (file: File) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imageDataUrlRef.current = dataUrl;
        imageNameRef.current = file.name;

        const img = await loadFabricImage(dataUrl);
        const cw = canvas.getWidth();
        const ch = canvas.getHeight();
        fitImageToCanvas(img, cw, ch);
        setCanvasImage(canvas, img, imageRef.current);
        imageRef.current = img;
        viewRef.current = { zoom: 1, panX: 0, panY: 0 };
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        clearGridObjects(canvas);
        canvas
          .getObjects()
          .filter((o) => (o as FabricObject & Record<string, string>)[FREE_LABEL_KEY])
          .forEach((o) => canvas.remove(o));
        linesMetaRef.current.clear();
        freeLabelsMetaRef.current.clear();
        anchorsMetaRef.current.clear();
        anchorCounterRef.current = 0;
        manualLabelPositionsRef.current.clear();
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        onAnchorsChangeRef.current([]);
        pushHistory();
      },

      generateGrid: (gridSettings: GridSettings) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageRef.current) return;
        manualLabelPositionsRef.current.clear();
        const lines = createInitialLines(
          canvas.getWidth(),
          canvas.getHeight(),
          gridSettings
        );
        renderLines(canvas, lines, gridSettings);
        renderLabels(canvas, gridSettings);
        pushHistory();
      },

      resetGrid: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        clearGridObjects(canvas);
        linesMetaRef.current.clear();
        manualLabelPositionsRef.current.clear();
        canvas.discardActiveObject();
        onSelectionChangeRef.current(null, null, null);
        canvas.requestRenderAll();
        pushHistory();
      },

      getSnapshot: (gridSettings: GridSettings, imageName: string) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageDataUrlRef.current) return null;
        return {
          version: 1,
          savedAt: new Date().toISOString(),
          imageDataUrl: imageDataUrlRef.current,
          imageName: imageName || imageNameRef.current,
          gridSettings,
          lines: extractLines(canvas),
          freeLabels: extractFreeLabels(canvas),
          gridLabelPositions: Object.fromEntries(manualLabelPositionsRef.current),
          view: { ...viewRef.current },
          canvasWidth: canvas.getWidth(),
          canvasHeight: canvas.getHeight(),
        };
      },

      applyProject: async (project: ProjectData) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        imageDataUrlRef.current = project.imageDataUrl;
        imageNameRef.current = project.imageName;

        const img = await loadFabricImage(project.imageDataUrl);
        const cw = project.canvasWidth || canvas.getWidth();
        const ch = project.canvasHeight || canvas.getHeight();
        canvas.setDimensions({ width: cw, height: ch });

        fitImageToCanvas(img, cw, ch);
        setCanvasImage(canvas, img, imageRef.current);
        imageRef.current = img;

        const gridSettings = {
          ...settingsRef.current,
          ...project.gridSettings,
        };

        // Restore per-tab manual label positions so labels from one tab
        // never contaminate another tab's layout.
        manualLabelPositionsRef.current.clear();
        if (project.gridLabelPositions) {
          for (const [key, pos] of Object.entries(project.gridLabelPositions)) {
            manualLabelPositionsRef.current.set(key, pos);
          }
        }

        anchorCounterRef.current = 0;
        renderAnchors(canvas, []);
        onAnchorsChangeRef.current([]);
        renderLines(canvas, project.lines, gridSettings);
        renderLabels(canvas, gridSettings);
        renderFreeLabels(canvas, project.freeLabels ?? [], gridSettings);
        applyView(project.view);
        pushHistory();
      },

      exportImage: (format: "png" | "jpeg") => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL({
          format,
          quality: format === "jpeg" ? 0.92 : 1,
          multiplier: 2,
        });
      },

      copyToClipboard: async () => {
        const dataUrl = canvasRef.current?.toDataURL({
          format: "png",
          multiplier: 2,
        });
        if (!dataUrl) return false;
        const blob = await (await fetch(dataUrl)).blob();
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        return true;
      },

      undo: () => {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        const entry = historyRef.current[historyIndexRef.current];
        const canvas = canvasRef.current;
        if (!canvas || !entry) return;
        const nextSettings = {
          ...settingsRef.current,
          hiddenLabelKeys: { ...entry.hiddenLabelKeys },
        };
        updateSettingsRef(nextSettings);
        entry.lines.forEach((l) => linesMetaRef.current.set(l.id, l));
        renderLines(canvas, entry.lines, nextSettings);
        renderLabelsRef.current(canvas, nextSettings);
        renderFreeLabelsRef.current(canvas, entry.freeLabels ?? [], nextSettings);
        applyView(entry.view);
        onHistoryChange(historyIndexRef.current > 0, true);
      },

      redo: () => {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        const entry = historyRef.current[historyIndexRef.current];
        const canvas = canvasRef.current;
        if (!canvas || !entry) return;
        const nextSettings = {
          ...settingsRef.current,
          hiddenLabelKeys: { ...entry.hiddenLabelKeys },
        };
        updateSettingsRef(nextSettings);
        entry.lines.forEach((l) => linesMetaRef.current.set(l.id, l));
        renderLines(canvas, entry.lines, nextSettings);
        renderLabelsRef.current(canvas, nextSettings);
        renderFreeLabelsRef.current(canvas, entry.freeLabels ?? [], nextSettings);
        applyView(entry.view);
        onHistoryChange(
          historyIndexRef.current > 0,
          historyIndexRef.current < historyRef.current.length - 1
        );
      },

      resetView: () => {
        applyView({ zoom: 1, panX: 0, panY: 0 });
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.setZoom(1);
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          canvas.requestRenderAll();
        }
        pushHistory();
      },

      setZoom: (zoom: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const z = Math.min(5, Math.max(0.2, zoom));
        canvas.setZoom(z);
        viewRef.current.zoom = z;
        canvas.requestRenderAll();
      },

      nudgeZoom: (delta: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const z = Math.min(5, Math.max(0.2, canvas.getZoom() + delta));
        canvas.setZoom(z);
        viewRef.current.zoom = z;
        canvas.requestRenderAll();
      },

      addControlPoint: () => {
        const canvas = canvasRef.current;
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj || !isGridLineObject(obj)) return;
        const id = getGridLineId(obj);
        const meta = linesMetaRef.current.get(id);
        if (!meta || meta.locked) return;

        const pts = fabricObjectToLineData(obj, meta).points;
        if (pts.length < 2) return;
        const mid = Math.floor(pts.length / 2);
        const a = pts[mid - 1];
        const b = pts[mid] ?? pts[mid - 1];
        const newPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const updated = [...pts.slice(0, mid), newPoint, ...pts.slice(mid)];
        const newMeta = { ...meta, points: updated };
        linesMetaRef.current.set(id, newMeta);
        replaceGridLine(canvas, obj, newMeta, settings);
        const { vCount, hCount } = countLinesByOrientation(
          linesMetaRef.current.values()
        );
        syncLabelsForLine(
          canvas,
          id,
          newMeta,
          settings,
          vCount,
          hCount,
          manualLabelPositionsRef.current
        );
        canvas.requestRenderAll();
        pushHistory();
      },

      removeControlPoint: () => {
        const canvas = canvasRef.current;
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj || !isGridLineObject(obj)) return;
        const id = getGridLineId(obj);
        const meta = linesMetaRef.current.get(id);
        if (!meta || meta.locked) return;

        const pts = fabricObjectToLineData(obj, meta).points;
        if (pts.length <= 2) return;

        const updated = pts.slice(0, -1);
        const newMeta = { ...meta, points: updated };
        linesMetaRef.current.set(id, newMeta);
        replaceGridLine(canvas, obj, newMeta, settings);
        const { vCount, hCount } = countLinesByOrientation(
          linesMetaRef.current.values()
        );
        syncLabelsForLine(
          canvas,
          id,
          newMeta,
          settings,
          vCount,
          hCount,
          manualLabelPositionsRef.current
        );
        canvas.requestRenderAll();
        pushHistory();
      },

      toggleLockSelected: () => {
        const canvas = canvasRef.current;
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj || !isGridLineObject(obj)) return;
        const id = getGridLineId(obj);
        const meta = linesMetaRef.current.get(id);
        if (!meta) return;
        const locked = !meta.locked;
        const newMeta = { ...meta, locked };
        linesMetaRef.current.set(id, newMeta);
        applyGridLineStyle(obj, settings, newMeta, locked);
        canvas.requestRenderAll();
        pushHistory();
      },

      addFreeLabel: (opts = {}) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { enterEdit = true } = opts;
        const id = `fl-${Math.random().toString(36).slice(2, 10)}`;
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
        const defaultX = (canvas.getWidth() / 2 - vpt[4]) / zoom - 30;
        const defaultY = (canvas.getHeight() / 2 - vpt[5]) / zoom - 12;
        const text = opts.text ?? "Label";
        const x = opts.x ?? defaultX;
        const y = opts.y ?? defaultY;
        // Tab labels (pre-filled text, no edit mode) get a bigger default font
        const fontSize = opts.text && !enterEdit ? 18 : undefined;
        const labelMeta: FreeLabelData = { id, text, x, y, fontSize };
        const itext = new IText(text, {
          ...freeLabelStyle(labelMeta, settingsRef.current),
          left: x,
          top: y,
        });
        applyBackgroundPadding(itext);
        itext.set({ [FREE_LABEL_KEY]: id } as Record<string, string>);
        freeLabelsMetaRef.current.set(id, labelMeta);
        canvas.add(itext);
        canvas.bringObjectToFront(itext);
        if (enterEdit) {
          canvas.setActiveObject(itext);
          itext.enterEditing();
          itext.selectAll();
        }
        canvas.renderAll();
        pushHistory();
      },

      getFreeLabelMeta: (id: string) => {
        return freeLabelsMetaRef.current.get(id) ?? null;
      },

      updateFreeLabelStyle: (id: string, style: Partial<Pick<FreeLabelData, "fontSize" | "color" | "backgroundColor" | "backgroundEnabled">>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const existing = freeLabelsMetaRef.current.get(id);
        if (!existing) return;
        const updated: FreeLabelData = { ...existing, ...style };
        freeLabelsMetaRef.current.set(id, updated);
        const obj = canvas.getObjects().find(
          (o) => (o as FabricObject & Record<string, string>)[FREE_LABEL_KEY] === id
        );
        if (obj) {
          (obj as IText).set(freeLabelStyle(updated, settingsRef.current));
          (obj as IText).setCoords();
          canvas.requestRenderAll();
        }
      },

      deleteSelectedLine: () => {
        const canvas = canvasRef.current;
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj || !isGridLineObject(obj)) return;
        const id = getGridLineId(obj);
        canvas.discardActiveObject();
        canvas.remove(obj);
        linesMetaRef.current.delete(id);
        onSelectionChangeRef.current(null, null, null);
        canvas.requestRenderAll();
        pushHistory();
      },

      beginGridScale: () => {
        scaleBaselineRef.current = [...linesMetaRef.current.values()].map(
          (l) => ({ ...l, points: l.points.map((p) => ({ ...p })) })
        );
      },

      scaleGridLive: (scaleX: number, scaleY: number) => {
        const canvas = canvasRef.current;
        const baseline = scaleBaselineRef.current;
        if (!canvas || !baseline?.length) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const line of baseline) {
          for (const p of line.points) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
          }
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const scaled = baseline.map((line) => ({
          ...line,
          points: line.points.map((p) => ({
            x: cx + (p.x - cx) * scaleX,
            y: cy + (p.y - cy) * scaleY,
          })),
        }));
        scaled.forEach((l) => linesMetaRef.current.set(l.id, l));
        renderLines(canvas, scaled, settingsRef.current);
        renderLabelsRef.current(canvas, settingsRef.current);
        renderFreeLabelsRef.current(canvas, [...freeLabelsMetaRef.current.values()], settingsRef.current);
        canvas.discardActiveObject();
        onSelectionChangeRef.current(null, null, null);
      },

      commitGridScale: () => {
        pushHistory();
        scaleBaselineRef.current = null;
      },

      scaleGrid: (scaleX: number, scaleY: number) => {
        const canvas = canvasRef.current;
        if (!canvas || !linesMetaRef.current.size) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const line of linesMetaRef.current.values()) {
          for (const p of line.points) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
          }
        }
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        const scaledLines: GridLineData[] = [];
        for (const line of linesMetaRef.current.values()) {
          const scaled: GridLineData = {
            ...line,
            points: line.points.map((p) => ({
              x: cx + (p.x - cx) * scaleX,
              y: cy + (p.y - cy) * scaleY,
            })),
          };
          linesMetaRef.current.set(line.id, scaled);
          scaledLines.push(scaled);
        }
        renderLines(canvas, scaledLines, settingsRef.current);
        renderLabelsRef.current(canvas, settingsRef.current);
        renderFreeLabelsRef.current(canvas, [...freeLabelsMetaRef.current.values()], settingsRef.current);
        canvas.discardActiveObject();
        onSelectionChangeRef.current(null, null, null);
        canvas.requestRenderAll();
        pushHistory();
      },

      refreshGridStyles: (gridSettings: GridSettings) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach((obj) => {
          if (!isGridLineObject(obj)) return;
          const id = getGridLineId(obj);
          const meta = linesMetaRef.current.get(id);
          if (meta) applyGridLineStyle(obj, gridSettings, meta, meta.locked);
        });
        canvas.requestRenderAll();
      },

      refreshLabels: (gridSettings: GridSettings) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        renderLabels(canvas, gridSettings);
      },

      refreshLabelAppearance: (gridSettings: GridSettings) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        syncAllLabels(canvas, gridSettings);
      },

      deleteAnchor: (id: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const obj = canvas
          .getObjects()
          .find((o) => (o as FabricObject & Record<string, string>)[ANCHOR_KEY] === id);
        if (obj) canvas.remove(obj);
        anchorsMetaRef.current.delete(id);
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        onAnchorsChangeRef.current([...anchorsMetaRef.current.values()]);
        pushHistory();
      },

      updateAnchorNotes: (id: string, notes: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const existing = anchorsMetaRef.current.get(id);
        if (!existing) return;
        anchorsMetaRef.current.set(id, { ...existing, notes });
        const obj = canvas
          .getObjects()
          .find((o) => (o as FabricObject & Record<string, string>)[ANCHOR_KEY] === id);
        if (obj instanceof IText) {
          const displayText = notes
            ? `A-${existing.index} — ${notes}`
            : `A-${existing.index}`;
          obj.set({ text: displayText });
          applyBackgroundPadding(obj);
          obj.setCoords();
          canvas.requestRenderAll();
        }
        onAnchorsChangeRef.current([...anchorsMetaRef.current.values()]);
      },

      selectAnchor: (id: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const obj = canvas
          .getObjects()
          .find((o) => (o as FabricObject & Record<string, string>)[ANCHOR_KEY] === id);
        if (obj) {
          canvas.setActiveObject(obj);
          canvas.requestRenderAll();
        }
      },
    }));

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full min-h-[480px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 [&_.canvas-container]:relative [&_.canvas-container]:z-10"
        data-ready={ready}
      >
      </div>
    );
  }
);

export default GridCanvas;
