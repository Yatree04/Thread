export type MemberType = "file" | "screenshot" | "tab" | "clipboard";

export type Confidence = "high" | "medium" | "low";

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

export interface Trail {
  id: string;
  name: string;
  confidence: Confidence;
  lifecycle: Lifecycle;
  createdAt: number;
  lastActiveAt: number;
  /** set when the person rejected this grouping via "Not a Trail" (7.1 correction flow) */
  rejected?: boolean;
}

export interface ToastState {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
