import type { Trail, TrailItem } from "../types";

export interface ElectronStatePayload {
  trails: Trail[];
  items: TrailItem[];
  toast?: { message: string; actionLabel?: string; undoType?: string; undoTrailId?: string };
}

export interface TrailsAPI {
  isElectron: true;
  platform: string;
  dispatch: (type: string, payload?: Record<string, unknown>) => void;
  requestOpenSidePanel: (trailId?: string) => void;
  hideOverlay: () => void;
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

export function getSurface(): "widget" | "overlay" | "sidepanel" | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const surface = params.get("surface");
  if (surface === "widget" || surface === "overlay" || surface === "sidepanel") return surface;
  return null;
}
