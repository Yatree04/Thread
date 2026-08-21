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

export interface ClassifyDecision {
  action: "add" | "new" | "unfiled";
  trailId?: string;
  name?: string;
  confidence?: number;
  evidence?: string;
}

export interface CaptureResult {
  decision: ClassifyDecision;
  itemId: string;
  trailId: string | null;
}

export interface ScreenshotResult {
  path: string;
  dataUrl: string;
}

export interface ContextSummaryResult {
  text: string;
  at: number;
}

export interface TrailsAPI {
  isElectron: true;
  platform: string;
  dispatch: (type: string, payload?: Record<string, unknown>) => void;
  expandCapture: () => void;
  collapseCapture: () => void;
  requestOpenQuery: (trailId?: string) => void;
  requestOpenSettings: () => void;
  hideQuery: () => void;
  hideWidget: () => void;

  submitCapture: (payload: {
    text: string;
    attachmentType?: TrailItem["type"];
    attachmentTitle?: string;
    attachmentDetail?: string;
  }) => Promise<CaptureResult>;
  captureScreenshot: () => Promise<ScreenshotResult | null>;
  pickImageFile: () => Promise<string | null>;

  getContextSummary: (trailId: string, itemId?: string) => Promise<ContextSummaryResult>;

  getSettings: () => Promise<ElectronSettings>;
  saveApiKey: (key: string) => Promise<{ ok: true }>;
  pickFolder: () => Promise<string | null>;
  addWatchFolder: (folder: string) => Promise<string[]>;
  removeWatchFolder: (folder: string) => Promise<string[]>;

  onState: (cb: (state: ElectronStatePayload) => void) => void;
  onWake: (cb: () => void) => void;
  onOpenQuery: (cb: () => void) => void;
  onExpandTrail: (cb: (trailId: string) => void) => void;
  onCaptureExpandedChanged: (cb: (expanded: boolean) => void) => void;
}

declare global {
  interface Window {
    trailsAPI?: TrailsAPI;
  }
}

export const electronAPI: TrailsAPI | undefined =
  typeof window !== "undefined" ? window.trailsAPI : undefined;

export const isElectron = Boolean(electronAPI);

export function getSurface(): "widget" | "capture" | "query" | "settings" | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const surface = params.get("surface");
  if (surface === "widget" || surface === "capture" || surface === "query" || surface === "settings") {
    return surface;
  }
  return null;
}
