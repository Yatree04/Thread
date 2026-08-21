export type MemberType = "file" | "screenshot" | "tab" | "clipboard";

/** A real 0-100 score from the clustering model (or a client-side default) —
 * not a fake display number. >=85 reads as high confidence, >=65 medium, else low. */
export type Confidence = number;

export type Lifecycle = "forming" | "active" | "idle" | "archived";

export interface TrailItem {
  id: string;
  trailId: string | null;
  type: MemberType;
  title: string;
  detail?: string;
  evidence: string;
  addedAt: number;
}

export interface CachedContext {
  text: string;
  at: number;
}

export interface Trail {
  id: string;
  name: string;
  confidence: Confidence;
  lifecycle: Lifecycle;
  createdAt: number;
  lastActiveAt: number;
  /** set when the person rejected this grouping via "Not a Trail" (7.1 correction flow) */
  rejected?: boolean;
  /** cached AI-generated context blurbs, keyed by "all" or an item id (7.x Contextualise) */
  context?: Record<string, CachedContext>;
}

export interface ToastState {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
