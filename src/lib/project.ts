import type { MultiFacadeProjectData, ProjectData } from "@/types/grid";

const STORAGE_KEY = "facade-grid-mapper-project";

export type SavedProject = ProjectData | MultiFacadeProjectData;

export function saveToLocalStorage(project: SavedProject): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function loadFromLocalStorage(): SavedProject | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedProject;
  } catch {
    return null;
  }
}

export function downloadProjectJson(project: SavedProject): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `facade-grid-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function loadProjectFromFile(file: File): Promise<SavedProject> {
  const text = await file.text();
  return JSON.parse(text) as SavedProject;
}
