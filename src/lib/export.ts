import { Canvas, FabricImage, IText, Text } from "fabric";
import { buildGridLineObject, FREE_LABEL_KEY } from "@/lib/fabric-grid";
import {
  fabricLabelStyle,
  freeLabelStyle,
  LABEL_KEY,
  labelKeyFor,
  isLabelHidden,
  defaultLabelPosition,
  labelTextFor,
  placementsForLine,
  countLinesByOrientation,
} from "@/lib/grid-labels";
import type { ProjectData } from "@/types/grid";

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

export async function renderProjectDataToDataUrl(
  project: ProjectData,
  format: "png" | "jpeg"
): Promise<string> {
  const el = document.createElement("canvas");
  const cw = project.canvasWidth || 1200;
  const ch = project.canvasHeight || 800;

  const canvas = new Canvas(el, {
    width: cw,
    height: ch,
    backgroundColor: "transparent",
    selection: false,
    preserveObjectStacking: true,
  });

  try {
    const imageEl = new Image();
    await new Promise<void>((resolve, reject) => {
      imageEl.onload = () => resolve();
      imageEl.onerror = () => reject(new Error("Image load failed"));
      imageEl.src = project.imageDataUrl;
    });

    const img = new FabricImage(imageEl);
    fitImageToCanvas(img, cw, ch);
    canvas.add(img);
    canvas.sendObjectToBack(img);

    const { gridSettings, lines } = project;
    const vLines = lines
      .filter((l) => l.orientation === "vertical")
      .sort((a, b) => a.index - b.index);
    const hLines = lines
      .filter((l) => l.orientation === "horizontal")
      .sort((a, b) => a.index - b.index);
    const { vCount, hCount } = countLinesByOrientation(lines);

    for (const line of lines) {
      const segment = buildGridLineObject(line, gridSettings);
      canvas.add(segment);
      canvas.bringObjectToFront(segment);
    }

    const style = fabricLabelStyle(gridSettings);
    for (const line of [...vLines, ...hLines]) {
      for (const placement of placementsForLine(line, gridSettings)) {
        const key = labelKeyFor(line.id, placement);
        if (isLabelHidden(gridSettings, key)) continue;
        const pos = defaultLabelPosition(line, placement, cw, ch, gridSettings);
        const text = new Text(
          labelTextFor(line, placement, gridSettings, vCount, hCount),
          { ...style, left: pos.x, top: pos.y, selectable: false, evented: false }
        );
        text.set({ [LABEL_KEY]: key } as Record<string, string>);
        canvas.add(text);
        canvas.bringObjectToFront(text);
      }
    }

    // Render free labels with per-label style
    for (const label of project.freeLabels ?? []) {
      const itext = new IText(label.text || "Label", {
        ...freeLabelStyle(label, gridSettings),
        left: label.x,
        top: label.y,
        selectable: false,
        evented: false,
      });
      itext.set({ [FREE_LABEL_KEY]: label.id } as Record<string, string>);
      canvas.add(itext);
      canvas.bringObjectToFront(itext);
    }

    canvas.renderAll();

    return canvas.toDataURL({
      format,
      quality: format === "jpeg" ? 0.92 : 1,
      multiplier: 2,
    });
  } finally {
    canvas.dispose();
  }
}
