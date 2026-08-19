import type { Trail, TrailItem } from "../types";

export interface ElectronStatePayload {
  trails: Trail[];
  items: TrailItem[];
  toast?: { message: string; actionLabel?: string; undoType?: string; undoTrailId?: string };
}

export interface ElectronSettings {
  hasApiKey: boolean;
  defaultFolders: string[];
  extraFolders: string[];
}

export interface TrailsAPI {
  isElectron: true;
  platform: string;
  dispatch: (type: string, payload?: Record<string, unknown>) => void;
  requestOpenSidePanel: (trailId?: string) => void;
  requestOpenSettings: () => void;
  requestOpenCommandOverlay: () => void;
  hideOverlay: () => void;
  hideWidget: () => void;

  getSettings: () => Promise<ElectronSettings>;
  saveApiKey: (key: string) => Promise<{ ok: true }>;
  pickFolder: () => Promise<string | null>;
  addWatchFolder: (folder: string) => Promise<string[]>;
  removeWatchFolder: (folder: string) => Promise<string[]>;

  onState: (cb: (state: ElectronStatePayload) => void) => void;
  onWake: (cb: () => void) => void;
  onOpenCommandOverlay: (cb: () => void) => void;
  onExpandTrail: (cb: (trailId: string) => void) => void;
}

declare global {
  interface Window {
    trailsAPI?: TrailsAPI;
  }
}

export const electronAPI: TrailsAPI | undefined =
  typeof window !== "undefined" ? window.trailsAPI : undefined;

export const isElectron = Boolean(electronAPI);

export function getSurface(): "widget" | "overlay" | "sidepanel" | "settings" | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const surface = params.get("surface");
  if (surface === "widget" || surface === "overlay" || surface === "sidepanel" || surface === "settings") {
    return surface;
  }
  return null;
}
