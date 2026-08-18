import type { Trail, TrailItem } from "../types";

const now = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const seedTrails: Trail[] = [
  {
    id: "trail-pricing",
    name: "Pricing Page Redesign",
    confidence: "high",
    lifecycle: "active",
    createdAt: now - 3 * DAY,
    lastActiveAt: now - 5 * MIN,
  },
  {
    id: "trail-onboarding",
    name: "Client Onboarding — Lumen Co.",
    confidence: "medium",
    lifecycle: "active",
    createdAt: now - 5 * DAY,
    lastActiveAt: now - 3 * HOUR,
  },
  {
    id: "trail-deck",
    name: "Q3 Investor Deck",
    confidence: "medium",
    lifecycle: "forming",
    createdAt: now - 1 * DAY,
    lastActiveAt: now - 6 * HOUR,
  },
  {
    id: "trail-auth",
    name: "Backend Auth Refactor",
    confidence: "high",
    lifecycle: "idle",
    createdAt: now - 9 * DAY,
    lastActiveAt: now - 2 * DAY,
  },
  {
    id: "trail-abtest",
    name: "Old Landing Page A/B Test",
    confidence: "high",
    lifecycle: "archived",
    createdAt: now - 40 * DAY,
    lastActiveAt: now - 21 * DAY,
  },
  {
    id: "trail-vendor",
    name: "Maybe: Vendor Research",
    confidence: "low",
    lifecycle: "forming",
    createdAt: now - 90 * MIN,
    lastActiveAt: now - 75 * MIN,
  },
];

export const seedItems: TrailItem[] = [
  // Pricing Page Redesign
  {
    id: "item-1",
    trailId: "trail-pricing",
    type: "file",
    title: "pricing-page-v3.fig",
    evidence: "Included: opened in same window",
    addedAt: now - 3 * DAY,
  },
  {
    id: "item-2",
    trailId: "trail-pricing",
    type: "screenshot",
    title: "Screenshot — competitor pricing grid",
    evidence: "Included: matched by content",
    addedAt: now - 2 * DAY,
  },
  {
    id: "item-3",
    trailId: "trail-pricing",
    type: "tab",
    title: "Stripe Docs — Tiered pricing models",
    evidence: "Included: opened in same window",
    addedAt: now - 1 * DAY,
  },
  {
    id: "item-4",
    trailId: "trail-pricing",
    type: "clipboard",
    title: "“Starter / Pro / Scale” tier copy draft",
    evidence: "Included: matched by content",
    addedAt: now - 18 * HOUR,
  },
  {
    id: "item-5",
    trailId: "trail-pricing",
    type: "file",
    title: "pricing-copy-final.docx",
    evidence: "Included: opened in same window",
    addedAt: now - 12 * MIN,
  },
  {
    id: "item-6",
    trailId: "trail-pricing",
    type: "tab",
    title: "Figma — Pricing Page Redesign",
    evidence: "Included: opened in same window",
    addedAt: now - 12 * MIN,
  },

  // Client Onboarding
  {
    id: "item-7",
    trailId: "trail-onboarding",
    type: "file",
    title: "lumen-co-contract-signed.pdf",
    evidence: "Included: opened in same window",
    addedAt: now - 5 * DAY,
  },
  {
    id: "item-8",
    trailId: "trail-onboarding",
    type: "tab",
    title: "Notion — Lumen Co. onboarding checklist",
    evidence: "Included: matched by content",
    addedAt: now - 4 * DAY,
  },
  {
    id: "item-9",
    trailId: "trail-onboarding",
    type: "clipboard",
    title: "Kickoff call notes, 3:00pm Thu",
    evidence: "Included: matched by content",
    addedAt: now - 3 * HOUR,
  },

  // Q3 Investor Deck
  {
    id: "item-10",
    trailId: "trail-deck",
    type: "file",
    title: "q3-investor-deck.key",
    evidence: "Included: opened in same window",
    addedAt: now - 1 * DAY,
  },
  {
    id: "item-11",
    trailId: "trail-deck",
    type: "screenshot",
    title: "Screenshot — revenue chart draft",
    evidence: "Included: matched by content",
    addedAt: now - 6 * HOUR,
  },

  // Backend Auth Refactor
  {
    id: "item-12",
    trailId: "trail-auth",
    type: "file",
    title: "auth-middleware.ts",
    evidence: "Included: opened in same window",
    addedAt: now - 9 * DAY,
  },
  {
    id: "item-13",
    trailId: "trail-auth",
    type: "tab",
    title: "GitHub — PR #482 refresh token rotation",
    evidence: "Included: opened in same window",
    addedAt: now - 2 * DAY,
  },
  {
    id: "item-14",
    trailId: "trail-auth",
    type: "file",
    title: "session-store.ts",
    evidence: "Included: matched by content",
    addedAt: now - 2 * DAY,
  },

  // Old Landing Page A/B Test (archived)
  {
    id: "item-15",
    trailId: "trail-abtest",
    type: "file",
    title: "landing-variant-b.html",
    evidence: "Included: opened in same window",
    addedAt: now - 40 * DAY,
  },
  {
    id: "item-16",
    trailId: "trail-abtest",
    type: "screenshot",
    title: "Screenshot — conversion results",
    evidence: "Included: matched by content",
    addedAt: now - 21 * DAY,
  },

  // Maybe: Vendor Research (low confidence)
  {
    id: "item-17",
    trailId: "trail-vendor",
    type: "tab",
    title: "Compare: 3 project-management vendors",
    evidence: "Included: matched by content",
    addedAt: now - 90 * MIN,
  },
  {
    id: "item-18",
    trailId: "trail-vendor",
    type: "screenshot",
    title: "Screenshot — vendor pricing table",
    evidence: "Included: matched by content",
    addedAt: now - 75 * MIN,
  },

  // Unfiled desktop items (no trail yet) — for the right-click "Add to a Trail" demo
  {
    id: "item-19",
    trailId: null,
    type: "file",
    title: "team-offsite-notes.md",
    evidence: "Not yet grouped",
    addedAt: now - 2 * HOUR,
  },
  {
    id: "item-20",
    trailId: null,
    type: "screenshot",
    title: "Screenshot — flight confirmation",
    evidence: "Not yet grouped",
    addedAt: now - 1 * HOUR,
  },
  {
    id: "item-21",
    trailId: null,
    type: "tab",
    title: "Airbnb — offsite house options",
    evidence: "Not yet grouped",
    addedAt: now - 50 * MIN,
  },
  {
    id: "item-22",
    trailId: null,
    type: "clipboard",
    title: "“OOO Sept 4–8, back the 9th”",
    evidence: "Not yet grouped",
    addedAt: now - 10 * MIN,
  },
];

const activityPool: TrailItem[] = [
  {
    id: "activity-1",
    trailId: "trail-pricing",
    type: "screenshot",
    title: "Screenshot — updated tier comparison",
    evidence: "Included: matched by content",
    addedAt: now,
  },
  {
    id: "activity-2",
    trailId: "trail-deck",
    type: "tab",
    title: "Google Sheets — Q3 revenue model",
    evidence: "Included: opened in same window",
    addedAt: now,
  },
  {
    id: "activity-3",
    trailId: null,
    type: "clipboard",
    title: "“Follow up with legal re: NDA”",
    evidence: "Not yet grouped",
    addedAt: now,
  },
  {
    id: "activity-4",
    trailId: "trail-onboarding",
    type: "file",
    title: "lumen-co-welcome-packet.pdf",
    evidence: "Included: opened in same window",
    addedAt: now,
  },
  {
    id: "activity-5",
    trailId: null,
    type: "tab",
    title: "Figma Community — topographic texture packs",
    evidence: "Not yet grouped",
    addedAt: now,
  },
];

let activityIndex = 0;
export function nextActivityItem(): TrailItem {
  const template = activityPool[activityIndex % activityPool.length];
  activityIndex += 1;
  return {
    ...template,
    id: `${template.id}-${Date.now()}`,
    addedAt: Date.now(),
  };
}

export const newTrailNamePool = [
  "Untitled cluster — 3 related tabs",
  "Possible Trail: recent screenshots",
  "Untitled cluster — vendor emails",
];
