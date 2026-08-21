import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lifecycle, MemberType, Trail, TrailItem } from "../types";
import { seedItems, seedTrails } from "../data/seed";
import { makeId } from "../lib/id";
import { electronAPI, isElectron } from "../lib/electron";

export type WakeMode = "auto" | "low" | "multiple" | "none";
export type QueryFilter = "all" | "active" | "idle" | "archived";
export type QuerySort = "recency" | "name";

export interface CaptureDecision {
  action: "add" | "new" | "unfiled";
  trailId?: string;
  name?: string;
  confidence?: number;
  evidence?: string;
}

export interface CaptureResult {
  decision: CaptureDecision;
  itemId: string;
  trailId: string | null;
}

interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface PendingMerge {
  sourceId: string;
}

interface TrailState {
  trails: Trail[];
  items: TrailItem[];
  feedbackLog: { trailId: string; note: string; at: number }[];

  wakeMode: WakeMode;
  continueCardResolved: boolean;

  // Query Surface — merges the old Command Overlay (search) + Side Panel (browse/manage)
  queryOpen: boolean;
  queryFilter: QueryFilter;
  querySort: QuerySort;
  queryDetailTrailId: string | null;

  // Capture Surface — quick-capture composer
  captureExpanded: boolean;

  contextMenu: { itemId: string; x: number; y: number } | null;
  pendingMerge: PendingMerge | null;
  pendingItemPicker: { itemId: string } | null;

  toast: Toast | null;

  // derived-ish helpers
  itemsOf: (trailId: string) => TrailItem[];
  activeTrails: () => Trail[];

  // Continue Card / wake (now lives inside the Widget's continuity popup)
  setWakeMode: (mode: WakeMode) => void;
  simulateWake: (mode?: WakeMode) => void;
  dismissContinueCard: () => void;
  resumeTrail: (trailId: string) => void;
  notATrail: (trailId: string) => void;
  confirmLowConfidence: (trailId: string) => void;

  // Query Surface
  openQuery: (trailId?: string) => void;
  closeQuery: () => void;
  setQueryFilter: (f: QueryFilter) => void;
  setQuerySort: (s: QuerySort) => void;
  openQueryDetail: (trailId: string) => void;
  closeQueryDetail: () => void;

  // Capture Surface
  expandCapture: () => void;
  collapseCapture: () => void;

  // Trail CRUD
  renameTrail: (trailId: string, name: string) => void;
  archiveTrail: (trailId: string) => void;
  undoArchive: (trailId: string) => void;
  startMerge: (sourceId: string) => void;
  completeMerge: (targetId: string) => void;
  cancelMerge: () => void;
  createTrail: (name: string, itemIds?: string[]) => string;

  // Quick Capture — real AI clustering in Electron, a local heuristic in the browser demo
  quickCapture: (input: {
    text: string;
    attachmentType?: MemberType;
    attachmentTitle?: string;
    attachmentDetail?: string;
  }) => Promise<CaptureResult>;

  // Members
  removeMember: (itemId: string) => void;
  moveMember: (itemId: string, trailId: string) => void;

  // Context menu (surface 4)
  openContextMenu: (itemId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
  openItemPicker: (itemId: string) => void;
  closeItemPicker: () => void;

  // Toast
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  clearToast: () => void;
}

const ARCHIVE_MEMORY: Record<string, Lifecycle> = {};

/**
 * In the Electron desktop app, main.cjs's store.cjs is the real single
 * source of truth (real files/clipboard/tabs feed it, real AI clusters
 * into it). This mirrors mutating actions into an IPC dispatch and lets
 * the broadcast-back overwrite `trails`/`items` — everything else (UI-only
 * state like which filter tab is active) stays local as before.
 */
let electronSyncStarted = false;
export function startElectronSync() {
  const api = electronAPI;
  if (!api || electronSyncStarted) return;
  electronSyncStarted = true;
  api.onState(({ trails, items, toast }) => {
    useTrailStore.setState({ trails, items });
    if (toast) {
      const undo =
        toast.undoType && toast.undoTrailId
          ? () => api.dispatch(toast.undoType!, { trailId: toast.undoTrailId })
          : undefined;
      useTrailStore.getState().showToast(toast.message, toast.actionLabel, undo);
    }
  });
  api.onWake(() => useTrailStore.getState().setWakeMode("auto"));
  api.onOpenQuery(() => useTrailStore.getState().openQuery());
  api.onExpandTrail((trailId) =>
    useTrailStore.setState({ queryOpen: true, queryDetailTrailId: trailId })
  );
  // Capture's expand/collapse is a real main-process resize (electron/main.cjs),
  // and may be triggered from a different window (Widget, tray) than this one —
  // this is what tells *this* renderer to switch between bubble and composer.
  api.onCaptureExpandedChanged((expanded) => useTrailStore.setState({ captureExpanded: expanded }));
}

export const useTrailStore = create<TrailState>()(
  persist(
    (set, get) => ({
      trails: isElectron ? [] : seedTrails,
      items: isElectron ? [] : seedItems,
      feedbackLog: [],

      wakeMode: "auto",
      continueCardResolved: false,

      queryOpen: false,
      queryFilter: "all",
      querySort: "recency",
      queryDetailTrailId: null,
      captureExpanded: false,

      contextMenu: null,
      pendingMerge: null,
      pendingItemPicker: null,

      toast: null,

      itemsOf: (trailId) => get().items.filter((i) => i.trailId === trailId),
      activeTrails: () => get().trails.filter((t) => !t.rejected),

      setWakeMode: (mode) => set({ wakeMode: mode, continueCardResolved: false }),
      simulateWake: (mode) =>
        set({ wakeMode: mode ?? get().wakeMode, continueCardResolved: false }),

      dismissContinueCard: () => set({ continueCardResolved: true }),

      resumeTrail: (trailId) => {
        const trail = get().trails.find((t) => t.id === trailId);
        if (!trail) return;
        const count = get().itemsOf(trailId).length;
        set((s) => ({
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, lastActiveAt: Date.now() } : t
          ),
          continueCardResolved: true,
        }));
        get().showToast(
          `Reopening ${count} item${count === 1 ? "" : "s"} from "${trail.name}"…`
        );
        electronAPI?.dispatch("resumeTrail", { trailId });
      },

      notATrail: (trailId) => {
        const trail = get().trails.find((t) => t.id === trailId);
        if (!trail) return;
        set((s) => ({
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, rejected: true } : t
          ),
          items: s.items.map((i) =>
            i.trailId === trailId ? { ...i, trailId: null, evidence: "Not yet grouped" } : i
          ),
          feedbackLog: [
            ...s.feedbackLog,
            { trailId, note: "Marked 'Not a Trail' — pattern deprioritized", at: Date.now() },
          ],
          continueCardResolved: true,
        }));
        get().showToast(
          `"${trail.name}" dismissed. Its items are available to sort manually.`
        );
        electronAPI?.dispatch("notATrail", { trailId });
      },

      confirmLowConfidence: (trailId) => {
        set((s) => ({
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, confidence: 90, lifecycle: "active" as Lifecycle } : t
          ),
          continueCardResolved: true,
        }));
        get().showToast("Confirmed — confidence updated.");
        electronAPI?.dispatch("confirmLowConfidence", { trailId });
      },

      openQuery: (trailId) => {
        set({ queryOpen: true, queryDetailTrailId: trailId ?? get().queryDetailTrailId });
        electronAPI?.requestOpenQuery(trailId);
      },
      closeQuery: () => {
        set({ queryOpen: false });
        electronAPI?.hideQuery();
      },
      setQueryFilter: (f) => set({ queryFilter: f }),
      setQuerySort: (s) => set({ querySort: s }),
      openQueryDetail: (trailId) => set({ queryDetailTrailId: trailId }),
      closeQueryDetail: () => set({ queryDetailTrailId: null }),

      expandCapture: () => {
        set({ captureExpanded: true });
        electronAPI?.expandCapture();
      },
      collapseCapture: () => {
        set({ captureExpanded: false });
        electronAPI?.collapseCapture();
      },

      renameTrail: (trailId, name) => {
        set((s) => ({
          trails: s.trails.map((t) => (t.id === trailId ? { ...t, name } : t)),
        }));
        electronAPI?.dispatch("renameTrail", { trailId, name });
      },

      archiveTrail: (trailId) => {
        const trail = get().trails.find((t) => t.id === trailId);
        if (!trail) return;
        ARCHIVE_MEMORY[trailId] = trail.lifecycle;
        set((s) => ({
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, lifecycle: "archived" as Lifecycle } : t
          ),
        }));
        get().showToast("Trail archived", "Undo", () => get().undoArchive(trailId));
        electronAPI?.dispatch("archiveTrail", { trailId });
      },

      undoArchive: (trailId) => {
        const prev = ARCHIVE_MEMORY[trailId] ?? "active";
        set((s) => ({
          trails: s.trails.map((t) => (t.id === trailId ? { ...t, lifecycle: prev } : t)),
        }));
        get().clearToast();
        electronAPI?.dispatch("undoArchive", { trailId });
      },

      startMerge: (sourceId) => set({ pendingMerge: { sourceId } }),
      cancelMerge: () => set({ pendingMerge: null }),
      completeMerge: (targetId) => {
        const { pendingMerge, trails } = get();
        if (!pendingMerge) return;
        const source = trails.find((t) => t.id === pendingMerge.sourceId);
        const target = trails.find((t) => t.id === targetId);
        if (!source || !target || source.id === target.id) {
          set({ pendingMerge: null });
          return;
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.trailId === source.id ? { ...i, trailId: target.id } : i
          ),
          trails: s.trails
            .filter((t) => t.id !== source.id)
            .map((t) =>
              t.id === target.id ? { ...t, lastActiveAt: Date.now() } : t
            ),
          pendingMerge: null,
          queryDetailTrailId: target.id,
        }));
        get().showToast(`Merged "${source.name}" into "${target.name}"`);
        electronAPI?.dispatch("completeMerge", { sourceId: source.id, targetId: target.id });
      },

      createTrail: (name, itemIds = []) => {
        const id = makeId("trail");
        const trail: Trail = {
          id,
          name,
          confidence: 90,
          lifecycle: "forming",
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
        };
        set((s) => ({
          trails: [trail, ...s.trails],
          items: s.items.map((i) =>
            itemIds.includes(i.id)
              ? { ...i, trailId: id, evidence: "Included: added manually" }
              : i
          ),
        }));
        get().showToast(`Created "${name}"`);
        electronAPI?.dispatch("createTrail", { name, itemIds });
        return id;
      },

      quickCapture: async (input) => {
        if (isElectron && electronAPI) {
          return electronAPI.submitCapture(input);
        }

        // Browser demo has no real backend AI to call — mirror the real
        // pipeline's shape with a simple local heuristic, same spirit as
        // the rest of this demo's simulated OS events.
        const trimmed = input.text.trim();
        const title =
          input.attachmentTitle ||
          (trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed) ||
          "Quick capture";
        const type: MemberType = input.attachmentType || "clipboard";
        const detail = input.attachmentType ? input.text : input.attachmentDetail;
        const lower = input.text.toLowerCase();
        const match = get().trails.find(
          (t) => !t.rejected && lower.includes(t.name.toLowerCase().split(" ")[0])
        );
        const id = makeId("item");

        if (match) {
          set((s) => ({
            items: [
              ...s.items,
              { id, trailId: match.id, type, title, detail, evidence: "Included: matched by content", addedAt: Date.now() },
            ],
            trails: s.trails.map((t) => (t.id === match.id ? { ...t, lastActiveAt: Date.now() } : t)),
          }));
          get().showToast(`New activity added to "${match.name}"`);
          return { decision: { action: "add", trailId: match.id, confidence: 88 }, itemId: id, trailId: match.id };
        }

        set((s) => ({
          items: [...s.items, { id, trailId: null, type, title, detail, evidence: "Not yet grouped", addedAt: Date.now() }],
        }));
        get().showToast("New item detected — not yet grouped into a Trail");
        return { decision: { action: "unfiled" }, itemId: id, trailId: null };
      },

      removeMember: (itemId) => {
        set((s) => ({
          items: s.items.map((i) =>
            i.id === itemId ? { ...i, trailId: null, evidence: "Not yet grouped" } : i
          ),
        }));
        electronAPI?.dispatch("removeMember", { itemId });
      },

      moveMember: (itemId, trailId) => {
        const trail = get().trails.find((t) => t.id === trailId);
        set((s) => ({
          items: s.items.map((i) =>
            i.id === itemId
              ? { ...i, trailId, evidence: "Included: added manually" }
              : i
          ),
          trails: s.trails.map((t) =>
            t.id === trailId ? { ...t, lastActiveAt: Date.now() } : t
          ),
        }));
        if (trail) get().showToast(`Added to "${trail.name}"`);
        electronAPI?.dispatch("moveMember", { itemId, trailId });
      },

      openContextMenu: (itemId, x, y) => set({ contextMenu: { itemId, x, y } }),
      closeContextMenu: () => set({ contextMenu: null }),
      openItemPicker: (itemId) => set({ pendingItemPicker: { itemId }, contextMenu: null }),
      closeItemPicker: () => set({ pendingItemPicker: null }),

      showToast: (message, actionLabel, onAction) =>
        set({ toast: { id: makeId("toast"), message, actionLabel, onAction } }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: "trails-store",
      partialize: (s) => ({
        trails: s.trails,
        items: s.items,
        feedbackLog: s.feedbackLog,
      }),
    }
  )
);
