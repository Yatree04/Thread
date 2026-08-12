// Mock data for the Thread prototype. Nothing here is fetched or computed
// from a real filesystem/browser/model — it's scripted to demonstrate the
// interaction model convincingly.

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();

let idCounter = 1000;
export function nextId() {
  idCounter += 1;
  return idCounter;
}

export const ITEM_TYPES = ["file", "tab", "screenshot", "chat"];

export const initialThreads = [
  {
    id: "packaging-redesign",
    name: "Packaging Redesign",
    state: "active",
    lastTouched: now - 12 * MIN,
    summary: "Comparing die-line proofs against the supplier's new quote",
    whyGrouped:
      "Shared keywords 'packaging', 'die-line', 'supplier' · touched within 2 hours",
    items: [
      { id: nextId(), type: "file", name: "box-mockup-v3.ai", confidence: "confirmed" },
      { id: nextId(), type: "file", name: "die-line-spec.pdf", confidence: "confirmed" },
      { id: nextId(), type: "tab", name: "Supplier Quotes — Google Sheets", confidence: "confirmed" },
      { id: nextId(), type: "screenshot", name: "Screenshot 2026-08-11 09.14.png", confidence: "confirmed" },
      { id: nextId(), type: "chat", name: '"can you send the die-line by Friday?" — Priya', confidence: "suggested" },
    ],
  },
  {
    id: "sisters-wedding",
    name: "Sister's Wedding",
    state: "active",
    lastTouched: now - 47 * MIN,
    summary: "Narrowing down venues and syncing the guest list with Mom",
    whyGrouped:
      "Shared keywords 'venue', 'guest list', 'catering' · 4 items touched today",
    items: [
      { id: nextId(), type: "tab", name: "The Knot — Venue Checklist", confidence: "confirmed" },
      { id: nextId(), type: "file", name: "guest-list-draft.xlsx", confidence: "confirmed" },
      { id: nextId(), type: "chat", name: '"forwarded the caterer\'s deposit invoice" — Mom', confidence: "confirmed" },
      { id: nextId(), type: "screenshot", name: "Screenshot 2026-08-10 19.03.png", confidence: "suggested" },
    ],
  },
  {
    id: "landlord-dispute",
    name: "Landlord Dispute",
    state: "forming",
    lastTouched: now - 6 * MIN,
    summary: "Pulling together the notice timeline for the lease dispute",
    whyGrouped:
      "2 items just linked · shared keyword 'lease renewal' within the last 10 minutes",
    items: [
      { id: nextId(), type: "tab", name: "NYC Housing Court — Filing Guide", confidence: "confirmed" },
      { id: nextId(), type: "chat", name: '"landlord says he never got the notice" — Alex', confidence: "confirmed" },
      { id: nextId(), type: "file", name: "lease-renewal-2024.pdf", confidence: "suggested" },
    ],
  },
  {
    id: "q3-budget-review",
    name: "Q3 Budget Review",
    state: "dormant",
    lastTouched: now - 9 * DAY,
    summary: "Reconciled actuals against forecast before the finance sync",
    whyGrouped:
      "Shared keywords 'Q3', 'forecast', 'variance' · last touched 9 days ago",
    items: [
      { id: nextId(), type: "file", name: "Q3-actuals.xlsx", confidence: "confirmed" },
      { id: nextId(), type: "file", name: "variance-notes.docx", confidence: "confirmed" },
      { id: nextId(), type: "tab", name: "Finance Dashboard — Q3 View", confidence: "confirmed" },
    ],
  },
  {
    id: "kitchen-remodel",
    name: "Kitchen Remodel Quotes",
    state: "dormant",
    lastTouched: now - 16 * DAY,
    summary: "Collecting cabinet and countertop quotes for comparison",
    whyGrouped:
      "Shared keywords 'cabinet', 'quote', 'contractor' · last touched 16 days ago",
    items: [
      { id: nextId(), type: "file", name: "cabinet-quote-ikea.pdf", confidence: "confirmed" },
      { id: nextId(), type: "screenshot", name: "Screenshot 2026-07-26 11.40.png", confidence: "confirmed" },
      { id: nextId(), type: "tab", name: "Countertop Comparison — Sheet", confidence: "confirmed" },
    ],
  },
];

export const initialWatchedLocations = [
  { id: "downloads", label: "Downloads", enabled: true },
  { id: "desktop", label: "Desktop", enabled: true },
  { id: "screenshots", label: "Screenshots", enabled: true },
  { id: "tabs", label: "Browser tabs", enabled: false },
];

// Files shown in the mocked file manager for the context-menu demo.
// `guess` names the Thread the agent would pre-fill, with its own confidence.
export const mockFiles = [
  { id: "f1", name: "box-mockup-v3.ai", kind: "ai", guessThreadId: "packaging-redesign", guessConfidence: "confirmed" },
  { id: "f2", name: "die-line-spec.pdf", kind: "pdf", guessThreadId: "packaging-redesign", guessConfidence: "confirmed" },
  { id: "f3", name: "guest-list-draft.xlsx", kind: "xlsx", guessThreadId: "sisters-wedding", guessConfidence: "confirmed" },
  { id: "f4", name: "lease-renewal-2024.pdf", kind: "pdf", guessThreadId: "landlord-dispute", guessConfidence: "suggested" },
  { id: "f5", name: "Q3-actuals.xlsx", kind: "xlsx", guessThreadId: "q3-budget-review", guessConfidence: "confirmed" },
  { id: "f6", name: "vacation-itinerary.pdf", kind: "pdf", guessThreadId: null, guessConfidence: null },
  { id: "f7", name: "resume-2026.docx", kind: "docx", guessThreadId: null, guessConfidence: null },
];
