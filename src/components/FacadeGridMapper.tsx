"use client";

import { useCallback, useRef, useState } from "react";
import GridCanvas, { type GridCanvasHandle } from "@/components/GridCanvas";
import ImageUploadDropzone from "@/components/ImageUploadDropzone";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import TopToolbar from "@/components/TopToolbar";
import {
  downloadProjectJson,
  loadProjectFromFile,
  saveToLocalStorage,
  type SavedProject,
} from "@/lib/project";
import WorkspaceDropOverlay from "@/components/WorkspaceDropOverlay";
import { isValidImageFile } from "@/lib/image-upload";
import {
  DEFAULT_GRID_SETTINGS,
  type AnchorData,
  type FreeLabelData,
  type GridSettings,
  type MultiFacadeProjectData,
  type ProjectData,
  type ProjectViewId,
} from "@/types/grid";
import { renderProjectDataToDataUrl } from "@/lib/export";
import { addImageMetadata } from "@/lib/image-metadata";
import JSZip from "jszip";

type AppMode = "image" | "project";
type ProjectViewsState = Partial<Record<ProjectViewId, ProjectData[]>>;

const PROJECT_VIEWS: { id: ProjectViewId; title: string }[] = [
  { id: "north", title: "North Facade" },
  { id: "south", title: "South Facade" },
  { id: "east", title: "East Facade" },
  { id: "west", title: "West Facade" },
  { id: "rooftop", title: "Rooftop" },
  { id: "other", title: "Other" },
];

function normalizeSettings(settings: Partial<GridSettings>): GridSettings {
  const next = { ...DEFAULT_GRID_SETTINGS, ...settings };
  const legacyColor = settings.lineColor;
  const legacyThickness = settings.lineThickness;
  if (!settings.verticalLineColor && legacyColor) {
    next.verticalLineColor = legacyColor;
  }
  if (!settings.horizontalLineColor && legacyColor) {
    next.horizontalLineColor = legacyColor;
  }
  if (!settings.verticalLineThickness && legacyThickness) {
    next.verticalLineThickness = legacyThickness;
  }
  if (!settings.horizontalLineThickness && legacyThickness) {
    next.horizontalLineThickness = legacyThickness;
  }
  if ((next.verticalLabelPosition as string) === "none") {
    next.verticalLabelPosition = DEFAULT_GRID_SETTINGS.verticalLabelPosition;
  }
  if ((next.horizontalLabelPosition as string) === "none") {
    next.horizontalLabelPosition = DEFAULT_GRID_SETTINGS.horizontalLabelPosition;
  }
  // Migrate projects saved before the per-position booleans were added.
  if (!("verticalLabelTop" in settings)) {
    const vp = next.verticalLabelPosition;
    next.verticalLabelTop = vp === "top" || vp === "both";
    next.verticalLabelBottom = vp === "bottom" || vp === "both";
  }
  if (!("verticalLabelSide" in settings)) {
    next.verticalLabelSide = "left";
  }
  if (!("horizontalLabelLeft" in settings)) {
    const hp = next.horizontalLabelPosition;
    next.horizontalLabelLeft = hp === "left" || hp === "both";
    next.horizontalLabelRight = hp === "right" || hp === "both";
  }
  if (!("horizontalLabelSide" in settings)) {
    next.horizontalLabelSide = "top";
  }
  next.hiddenLabelKeys = next.hiddenLabelKeys ?? {};
  return next;
}

function isMultiProject(project: SavedProject): project is MultiFacadeProjectData {
  return "mode" in project && project.mode === "project";
}

function normalizeProject(project: ProjectData): ProjectData {
  return {
    ...project,
    gridSettings: normalizeSettings(project.gridSettings),
  };
}

function normalizeProjectViews(
  views: MultiFacadeProjectData["views"] | Partial<Record<ProjectViewId, ProjectData>>
): ProjectViewsState {
  const entries = Object.entries(views).map(([id, value]) => {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return [id, list.map(normalizeProject)];
  });
  return Object.fromEntries(entries) as ProjectViewsState;
}

function getFirstProjectImage(views: ProjectViewsState) {
  for (const view of PROJECT_VIEWS) {
    const image = views[view.id]?.[0];
    if (image) return { viewId: view.id, imageIndex: 0, image };
  }
  return null;
}

async function fileToProjectData(
  file: File,
  gridSettings: GridSettings,
  canvasSize: { width: number; height: number },
  viewTitle?: string
): Promise<ProjectData> {
  const imageDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    imageDataUrl,
    imageName: file.name,
    gridSettings,
    lines: [],
    freeLabels: viewTitle
      ? [{ id: `fl-${Math.random().toString(36).slice(2, 10)}`, text: viewTitle, x: Math.round(canvasSize.width * 0.05), y: Math.round(canvasSize.height * 0.05) }]
      : [],
    view: { zoom: 1, panX: 0, panY: 0 },
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
  };
}

export default function FacadeGridMapper() {
  const canvasRef = useRef<GridCanvasHandle>(null);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const activeViewRef = useRef<ProjectViewId>("north");
  const activeImageIndexRef = useRef(0);
  const projectViewsRef = useRef<ProjectViewsState>({});
  const [mode, setMode] = useState<AppMode | null>(null);
  const [settings, setSettings] = useState<GridSettings>(DEFAULT_GRID_SETTINGS);
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const [moveGridMode, setMoveGridMode] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [selectedFreeLabelStyle, setSelectedFreeLabelStyle] = useState<FreeLabelData | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<ProjectViewId>("north");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [projectSetupOpen, setProjectSetupOpen] = useState(false);
  const [projectViews, setProjectViews] = useState<ProjectViewsState>({});
  const [projectName, setProjectName] = useState("");
  const [anchorMode, setAnchorMode] = useState(false);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<AnchorData[]>([]);

  const flash = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 2800);
  }, []);

  const handleHistoryChange = useCallback((undo: boolean, redo: boolean) => {
    setCanUndo(undo);
    setCanRedo(redo);
  }, []);

  const rememberActiveView = useCallback(
    (gridSettings = settings) => {
      if (mode !== "project") return projectViewsRef.current;
      const snapshot = canvasRef.current?.getSnapshot(gridSettings, "");
      if (!snapshot) return projectViewsRef.current;
      const currentList = projectViewsRef.current[activeViewRef.current] ?? [];
      const nextList = [...currentList];
      nextList[activeImageIndexRef.current] = normalizeProject(snapshot);
      const next = {
        ...projectViewsRef.current,
        [activeViewRef.current]: nextList,
      };
      projectViewsRef.current = next;
      setProjectViews(next);
      return next;
    },
    [mode, settings]
  );

  const handleUpload = useCallback(
    async (file: File, viewId = activeViewRef.current) => {
      if (!isValidImageFile(file)) {
        flash("Use a JPG or PNG image.");
        return;
      }

      if (mode === "project") {
        rememberActiveView();
      }

      if (mode === "project" && viewId !== activeViewRef.current) {
        activeViewRef.current = viewId;
        activeImageIndexRef.current =
          projectViewsRef.current[viewId]?.length ?? 0;
        setActiveViewId(viewId);
        setActiveImageIndex(activeImageIndexRef.current);
      }

      try {
        await canvasRef.current?.loadImage(file);
      } catch {
        flash("Could not open that image.");
        return;
      }
      setHasImage(true);
      setZoom(1);
      setSelectedLineId(null);
      flash(`Loaded ${file.name}`);

      if (mode === "project") {
        // Add the view title as a default editable label on the image.
        const viewTitle = PROJECT_VIEWS.find((v) => v.id === viewId)?.title;
        if (viewTitle && canvasRef.current) {
          const { width: cw, height: ch } = canvasRef.current.getCanvasSize();
          canvasRef.current.addFreeLabel({
            text: viewTitle,
            x: Math.round(cw * 0.05),
            y: Math.round(ch * 0.05),
            enterEdit: false,
          });
        }
        const snapshot = canvasRef.current?.getSnapshot(settings, file.name);
        if (snapshot) {
          const currentList = projectViewsRef.current[viewId] ?? [];
          const nextList = [...currentList, normalizeProject(snapshot)];
          activeImageIndexRef.current = nextList.length - 1;
          const next = {
            ...projectViewsRef.current,
            [viewId]: nextList,
          };
          projectViewsRef.current = next;
          setProjectViews(next);
          setActiveImageIndex(activeImageIndexRef.current);
        }
      }
    },
    [flash, mode, rememberActiveView, settings]
  );

  const handleProjectFilesUpload = useCallback(
    async (viewId: ProjectViewId, files: File[]) => {
      const validFiles = files.filter(isValidImageFile);
      if (!validFiles.length) {
        flash("Use a JPG or PNG image.");
        return;
      }

      rememberActiveView();
      const canvasSize = canvasRef.current?.getCanvasSize() ?? {
        width: 1200,
        height: 800,
      };
      const viewTitle = PROJECT_VIEWS.find((v) => v.id === viewId)?.title;
      const newImages = await Promise.all(
        validFiles.map((file) =>
          fileToProjectData(file, settings, canvasSize, viewTitle).then(normalizeProject)
        )
      );
      const currentList = projectViewsRef.current[viewId] ?? [];
      const nextList = [...currentList, ...newImages];
      const next = {
        ...projectViewsRef.current,
        [viewId]: nextList,
      };
      projectViewsRef.current = next;
      setProjectViews(next);
      activeViewRef.current = viewId;
      activeImageIndexRef.current = nextList.length - newImages.length;
      setActiveViewId(viewId);
      setActiveImageIndex(activeImageIndexRef.current);
      setHasImage(true);
      setZoom(1);
      flash(`${newImages.length} image${newImages.length === 1 ? "" : "s"} loaded`);
    },
    [flash, rememberActiveView, settings]
  );

  const switchProjectView = useCallback(
    async (viewId: ProjectViewId, imageIndex = 0) => {
      if (
        viewId === activeViewRef.current &&
        imageIndex === activeImageIndexRef.current
      ) {
        return;
      }
      rememberActiveView();
      const target = projectViewsRef.current[viewId]?.[imageIndex];
      if (!target) {
        flash("Upload an image for that view first.");
        return;
      }
      activeViewRef.current = viewId;
      activeImageIndexRef.current = imageIndex;
      setActiveViewId(viewId);
      setActiveImageIndex(imageIndex);
      try {
        await canvasRef.current?.applyProject(target);
      } catch {
        flash("Could not open that project image.");
        return;
      }
      setSettings(target.gridSettings);
      setHasImage(true);
      setZoom(target.view.zoom);
      setSelectedLineId(null);
    },
    [flash, rememberActiveView]
  );

  const openProjectWorkspace = useCallback(async () => {
    const current =
      projectViewsRef.current[activeViewRef.current]?.[
        activeImageIndexRef.current
      ];
    const fallback = getFirstProjectImage(projectViewsRef.current);
    const target = current
      ? {
          viewId: activeViewRef.current,
          imageIndex: activeImageIndexRef.current,
          image: current,
        }
      : fallback;

    if (!target) {
      flash("Upload at least one project image first.");
      return;
    }

    activeViewRef.current = target.viewId;
    activeImageIndexRef.current = target.imageIndex;
    setActiveViewId(target.viewId);
    setActiveImageIndex(target.imageIndex);
    try {
      await canvasRef.current?.applyProject(target.image);
    } catch {
      flash("Could not open that project image.");
      return;
    }
    setSettings(target.image.gridSettings);
    setHasImage(true);
    setZoom(target.image.view.zoom);
    setSelectedLineId(null);
    setProjectSetupOpen(false);
  }, [flash]);

  const handleSettingsChange = useCallback(
    (next: GridSettings) => {
      setSettings(next);
      if (mode === "project") {
        window.setTimeout(() => rememberActiveView(next), 0);
      }
    },
    [mode, rememberActiveView]
  );

  const handleClose = useCallback(() => {
    setMode(null);
    setSettings(DEFAULT_GRID_SETTINGS);
    setZoom(1);
    setPanMode(false);
    setMoveGridMode(false);
    setHasImage(false);
    setSelectedLineId(null);
    setCanUndo(false);
    setCanRedo(false);
    setStatus(null);
    setActiveViewId("north");
    setActiveImageIndex(0);
    setProjectSetupOpen(false);
    setProjectViews({});
    setProjectName("");
    setAnchorMode(false);
    setSelectedAnchorId(null);
    setAnchors([]);
    projectViewsRef.current = {};
    activeViewRef.current = "north";
    activeImageIndexRef.current = 0;
  }, []);

  const handleGenerate = () => {
    if (!canvasRef.current?.hasImage()) {
      flash("Upload an image first.");
      return;
    }
    canvasRef.current.generateGrid(settings);
    flash("Grid generated — drag line endpoints to match perspective.");
  };

  const handleResetGrid = useCallback(() => {
    if (!canvasRef.current?.hasImage()) {
      flash("Upload an image first.");
      return;
    }
    canvasRef.current.resetGrid();
    setSelectedLineId(null);
    flash("Grid cleared. Adjust settings and generate again.");
  }, [flash]);

  const handleExportCurrentTab = useCallback(
    async (format: "png" | "jpeg") => {
      const ext = format === "png" ? "png" : "jpg";
      const meta = { projectName: projectName || undefined };

      let url = canvasRef.current?.exportImage(format);
      if (!url) { flash("Nothing to export."); return; }
      url = addImageMetadata(url, format, meta);

      const viewTitle =
        PROJECT_VIEWS.find((v) => v.id === activeViewRef.current)?.title ??
        activeViewRef.current;
      const viewImages = projectViewsRef.current[activeViewRef.current];
      const imageLabel =
        viewImages && viewImages.length > 1
          ? `${viewTitle} ${activeImageIndexRef.current + 1}`
          : viewTitle;
      const namePrefix = projectName.trim() ? `${projectName.trim()}_` : "";
      downloadDataUrl(url, `${namePrefix}${imageLabel}.${ext}`);
      flash("Tab exported.");
    },
    [projectName, flash]
  );

  const handleExport = useCallback(
    async (format: "png" | "jpeg") => {
      const ext = format === "png" ? "png" : "jpg";
      const meta = { projectName: projectName || undefined };

      if (mode !== "project") {
        let url = canvasRef.current?.exportImage(format);
        if (!url) { flash("Nothing to export."); return; }
        url = addImageMetadata(url, format, meta);
        downloadDataUrl(url, `facade-grid-${Date.now()}.${ext}`);
        flash(`${ext.toUpperCase()} exported.`);
        return;
      }

      // Project mode: bundle all images into a single ZIP.
      const updatedViews = rememberActiveView();
      const queue: Array<{ viewId: ProjectViewId; index: number; data: ProjectData }> = [];
      for (const view of PROJECT_VIEWS) {
        (updatedViews[view.id] ?? []).forEach((data, idx) =>
          queue.push({ viewId: view.id, index: idx, data })
        );
      }

      if (!queue.length) { flash("No images to export."); return; }

      flash(`Building ZIP with ${queue.length} image${queue.length === 1 ? "" : "s"}…`);

      const zip = new JSZip();
      const namePrefix = projectName.trim() ? `${projectName.trim()}_` : "";

      for (const { viewId, index, data } of queue) {
        try {
          let url: string;
          if (viewId === activeViewRef.current && index === activeImageIndexRef.current) {
            url = canvasRef.current?.exportImage(format) ?? "";
            if (!url) throw new Error("Canvas not ready");
          } else {
            url = await renderProjectDataToDataUrl(data, format);
          }
          url = addImageMetadata(url, format, meta);

          const viewTitle = PROJECT_VIEWS.find((v) => v.id === viewId)?.title ?? viewId;
          const viewImages = updatedViews[viewId];
          const tabLabel =
            viewImages && viewImages.length > 1
              ? `${viewTitle} ${index + 1}`
              : viewTitle;
          const filename = `${namePrefix}${tabLabel}.${ext}`;
          const base64 = url.split(",")[1];
          zip.file(filename, base64, { base64: true });
        } catch {
          flash(`Error rendering ${viewId}.`);
          return;
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(blob);
      const zipName = projectName.trim() ? `${projectName.trim()}.zip` : "project-export.zip";
      downloadDataUrl(zipUrl, zipName);
      URL.revokeObjectURL(zipUrl);
      flash(`${queue.length} image${queue.length === 1 ? "" : "s"} exported.`);
    },
    [mode, rememberActiveView, flash, projectName]
  );

  const persist = useCallback(() => {
    const snapshot = canvasRef.current?.getSnapshot(settings, "");
    if (!snapshot) {
      flash("Nothing to save — upload an image first.");
      return null;
    }

    if (mode === "project") {
      const currentList = projectViewsRef.current[activeViewRef.current] ?? [];
      const nextList = [...currentList];
      nextList[activeImageIndexRef.current] = normalizeProject(snapshot);
      const views = {
        ...projectViewsRef.current,
        [activeViewRef.current]: nextList,
      };
      const project: MultiFacadeProjectData = {
        version: 2,
        mode: "project",
        savedAt: new Date().toISOString(),
        projectName: projectName || undefined,
        activeViewId: activeViewRef.current,
        activeImageIndex: activeImageIndexRef.current,
        views,
      };
      projectViewsRef.current = views;
      setProjectViews(views);
      saveToLocalStorage(project);
      downloadProjectJson(project);
      flash("Project saved (download + local storage).");
      return project;
    }

    const project = normalizeProject(snapshot);
    saveToLocalStorage(project);
    downloadProjectJson(project);
    flash("Project saved (download + local storage).");
    return project;
  }, [settings, flash, mode]);

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const loadSavedProject = async (file: File) => {
    const project = await loadProjectFromFile(file);

    if (isMultiProject(project)) {
      const views = normalizeProjectViews(project.views);
      const fallback = getFirstProjectImage(views);
      const targetId = views[project.activeViewId]?.length
        ? project.activeViewId
        : fallback?.viewId;
      if (!targetId) throw new Error("Empty project");
      const targetIndex =
        targetId === project.activeViewId
          ? Math.min(
              project.activeImageIndex ?? 0,
              (views[targetId]?.length ?? 1) - 1
            )
          : fallback?.imageIndex ?? 0;
      const target = views[targetId]?.[targetIndex];
      if (!target) throw new Error("Empty project");
      setMode("project");
      setProjectSetupOpen(false);
      setProjectName(project.projectName ?? "");
      projectViewsRef.current = views;
      activeViewRef.current = targetId;
      activeImageIndexRef.current = targetIndex;
      setProjectViews(views);
      setActiveViewId(targetId);
      setActiveImageIndex(targetIndex);
      await canvasRef.current?.applyProject(target);
      setSettings(target.gridSettings);
      setHasImage(true);
      setZoom(target.view.zoom);
      saveToLocalStorage(project);
      return;
    }

    const imageProject = normalizeProject(project);
    setMode("image");
    setProjectSetupOpen(false);
    await canvasRef.current?.applyProject(imageProject);
    setSettings(imageProject.gridSettings);
    setHasImage(true);
    setZoom(imageProject.view.zoom);
    saveToLocalStorage(imageProject);
  };

  const workspace = (
    <div className="flex min-h-0 flex-1">
      <LeftSidebar
        zoom={zoom}
        panMode={panMode}
        hasImage={hasImage}
        onUpload={(file) => void handleUpload(file)}
        onInvalidUpload={() => flash("Use a JPG or PNG image.")}
        onZoomChange={(z) => {
          canvasRef.current?.setZoom(z);
          setZoom(z);
        }}
        onZoomIn={() => {
          canvasRef.current?.nudgeZoom(0.15);
          setZoom((z) => Math.min(5, z + 0.15));
        }}
        onZoomOut={() => {
          canvasRef.current?.nudgeZoom(-0.15);
          setZoom((z) => Math.max(0.2, z - 0.15));
        }}
        onPanModeChange={setPanMode}
        onResetView={() => {
          canvasRef.current?.resetView();
          setZoom(1);
        }}
      />

      <WorkspaceDropOverlay
        onFile={(file) => void handleUpload(file)}
        onInvalidFile={() => flash("Use a JPG or PNG image.")}
      >
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col p-3">
          {mode === "project" && (
            <ProjectTabs
              activeViewId={activeViewId}
              activeImageIndex={activeImageIndex}
              views={projectViews}
              onSelect={(id, index) => void switchProjectView(id, index)}
            />
          )}
          <GridCanvas
            ref={canvasRef}
            settings={settings}
            panMode={panMode}
            moveGridMode={moveGridMode}
            anchorMode={anchorMode}
            onAnchorsChange={setAnchors}
            onSelectionChange={(lineId, freeLabelId, anchorId) => {
              setSelectedLineId(lineId);
              if (freeLabelId) {
                const meta = canvasRef.current?.getFreeLabelMeta(freeLabelId);
                setSelectedFreeLabelStyle(meta ?? null);
              } else {
                setSelectedFreeLabelStyle(null);
              }
              setSelectedAnchorId(anchorId);
            }}
            onHistoryChange={handleHistoryChange}
            onSettingsChange={handleSettingsChange}
          />
          {mode === "project" && projectSetupOpen && (
            <ProjectUploadBoard
              views={projectViews}
              projectName={projectName}
              onProjectNameChange={setProjectName}
              onUpload={(viewId, files) =>
                void handleProjectFilesUpload(viewId, files)
              }
              onInvalidFile={() => flash("Use a JPG or PNG image.")}
              onOpen={() => void openProjectWorkspace()}
            />
          )}
          {status && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-950/90 px-4 py-2 text-sm text-cyan-300 shadow-lg ring-1 ring-cyan-800">
              {status}
            </div>
          )}
        </main>
      </WorkspaceDropOverlay>

      <RightSidebar
        settings={settings}
        selectedLineId={selectedLineId}
        selectedFreeLabelStyle={selectedFreeLabelStyle}
        hasImage={hasImage}
        onChange={handleSettingsChange}
        onGenerate={handleGenerate}
        onResetGrid={handleResetGrid}
        onAddLabel={() => canvasRef.current?.addFreeLabel()}
        onRefreshStyles={() => canvasRef.current?.refreshGridStyles(settings)}
        onRefreshLabels={(s) => {
          handleSettingsChange(s);
          canvasRef.current?.refreshLabels(s);
        }}
        onRefreshLabelAppearance={(s) => {
          canvasRef.current?.refreshLabelAppearance(s);
        }}
        onUpdateFreeLabelStyle={(id, style) => {
          canvasRef.current?.updateFreeLabelStyle(id, style);
          setSelectedFreeLabelStyle((prev) => prev ? { ...prev, ...style } : null);
        }}
        moveGridMode={moveGridMode}
        onMoveGridModeChange={setMoveGridMode}
        onBeginGridScale={() => canvasRef.current?.beginGridScale()}
        onScaleGridLive={(sx, sy) => canvasRef.current?.scaleGridLive(sx, sy)}
        onCommitGridScale={() => canvasRef.current?.commitGridScale()}
        onScaleGrid={(sx, sy) => canvasRef.current?.scaleGrid(sx, sy)}
        onAddControlPoint={() => canvasRef.current?.addControlPoint()}
        onRemoveControlPoint={() => canvasRef.current?.removeControlPoint()}
        onToggleLock={() => canvasRef.current?.toggleLockSelected()}
        onDeleteLine={() => canvasRef.current?.deleteSelectedLine()}
        anchorMode={anchorMode}
        anchors={anchors}
        selectedAnchorId={selectedAnchorId}
        onToggleAnchorMode={() => {
          const next = !anchorMode;
          setAnchorMode(next);
          if (next) {
            setPanMode(false);
            setMoveGridMode(false);
          }
        }}
        onSelectAnchor={(id) => {
          setSelectedAnchorId(id);
          canvasRef.current?.selectAnchor(id);
        }}
        onDeleteAnchor={(id) => {
          canvasRef.current?.deleteAnchor(id);
          if (selectedAnchorId === id) setSelectedAnchorId(null);
        }}
      />
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-100">
      <TopToolbar
        projectName={projectName || undefined}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportAll={(fmt) => void handleExport(fmt)}
        onExportTab={(fmt) => void handleExportCurrentTab(fmt)}
        onCopy={async () => {
          try {
            const ok = await canvasRef.current?.copyToClipboard();
            flash(ok ? "Copied to clipboard." : "Could not copy.");
          } catch {
            flash("Clipboard not available in this browser.");
          }
        }}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onReset={() => {
          canvasRef.current?.resetView();
          setZoom(1);
        }}
        onClose={handleClose}
      />

      <input
        ref={loadInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            await loadSavedProject(file);
            flash(`Loaded ${file.name}`);
          } catch {
            flash("Invalid project file.");
          }
          e.target.value = "";
        }}
      />

      {!mode && (
        <ModeChooser
          onChoose={(nextMode) => {
            setMode(nextMode);
            setProjectSetupOpen(nextMode === "project");
          }}
        />
      )}
      {mode === "image" && workspace}
      {mode === "project" && workspace}
    </div>
  );
}

function ModeChooser({ onChoose }: { onChoose: (mode: AppMode) => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 p-6">
      {/* Welcome / branding */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-3">
          <span className="text-5xl font-black tracking-tight text-cyan-400">FCRS</span>
          <span className="mt-1 text-lg font-light text-slate-400">Grid Tool</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Developed by</span>
          <span className="font-semibold text-slate-400">Daniel Vidal</span>
        </div>
      </div>

      {/* Mode selection */}
      <div className="w-full max-w-2xl">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-slate-500">
          Select a mode to get started
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <ModeButton
            title="Image"
            body="Work with a single image — upload, generate grid, adjust lines and labels, then export."
            onClick={() => onChoose("image")}
          />
          <ModeButton
            title="Project"
            body="Multi-view project — organise North, South, East, West facades and Rooftop in one file."
            onClick={() => onChoose("project")}
          />
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-44 rounded-lg border border-slate-700 bg-slate-950 p-6 text-left transition hover:border-cyan-500 hover:bg-slate-900"
    >
      <span className="block text-xl font-semibold text-cyan-300">{title}</span>
      <span className="mt-3 block text-sm leading-relaxed text-slate-400">
        {body}
      </span>
    </button>
  );
}

function ProjectUploadBoard({
  views,
  projectName,
  onProjectNameChange,
  onUpload,
  onInvalidFile,
  onOpen,
}: {
  views: ProjectViewsState;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onUpload: (viewId: ProjectViewId, files: File[]) => void;
  onInvalidFile: () => void;
  onOpen: () => void;
}) {
  const hasAnyImage = Object.values(views).some((items) => items?.length);

  return (
    <div className="absolute inset-3 z-20 flex flex-col gap-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/95 p-6 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-cyan-300">
            New project
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Name your project, upload the facade views, then open the workspace.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-slate-400 shrink-0">Project name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
              placeholder="Untitled project"
              className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={!hasAnyImage}
          onClick={onOpen}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 self-end"
        >
          Open workspace
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROJECT_VIEWS.map((view) => (
          <section
            key={view.id}
            className="rounded-lg border border-slate-800 bg-slate-950 p-4"
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              {view.title}
            </h3>
            {!!views[view.id]?.length && (
              <p className="mb-2 rounded bg-cyan-950/60 px-2 py-1 text-xs text-cyan-300">
                {views[view.id]?.length} image
                {views[view.id]?.length === 1 ? "" : "s"} loaded
              </p>
            )}
            <ImageUploadDropzone
              compact={false}
              multiple
              onFile={(file) => onUpload(view.id, [file])}
              onFiles={(files) => onUpload(view.id, files)}
              onInvalidFile={onInvalidFile}
            />
          </section>
        ))}
      </div>
    </div>
  );
}

function ProjectTabs({
  activeViewId,
  activeImageIndex,
  views,
  onSelect,
}: {
  activeViewId: ProjectViewId;
  activeImageIndex: number;
  views: ProjectViewsState;
  onSelect: (viewId: ProjectViewId, imageIndex: number) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-700">
      {PROJECT_VIEWS.map((view) => {
        const images = views[view.id] ?? [];
        if (!images.length) {
          return (
            <button
              key={view.id}
              type="button"
              disabled
              className="rounded-t-md border border-b-0 border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 opacity-40"
            >
              {view.title}
            </button>
          );
        }
        return images.map((_, index) => {
          const active = activeViewId === view.id && activeImageIndex === index;
          const label =
            images.length === 1 ? view.title : `${view.title} ${index + 1}`;
          return (
          <button
            key={`${view.id}-${index}`}
            type="button"
            onClick={() => onSelect(view.id, index)}
            className={`rounded-t-md border border-b-0 px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "border-cyan-500 bg-slate-900 text-cyan-300"
                : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900"
            }`}
          >
            {label}
          </button>
          );
        });
      })}
    </div>
  );
}
