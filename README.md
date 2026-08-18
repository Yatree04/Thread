# Trails

A working prototype of **Trails** — a background agent that groups related files,
screenshots, browser tabs, and clipboard items into named bundles ("Trails") and
surfaces them across five UI surfaces. This repo implements the full system spec
end-to-end as an interactive React app: one shared, local, persisted **Trail
Store** that every surface reads from and writes back to, exactly as described in
section `0.4` of the spec.

## Run it

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. That's it — no backend, no
accounts, no network calls. State lives in your browser's `localStorage`.

```bash
npm run build    # type-checks and produces a static dist/ bundle
npm run preview  # serve that production build locally
```

## What's actually implemented

All five surfaces from the spec, wired to one shared store:

| Surface | File | Spec section |
|---|---|---|
| Widget | `src/components/Widget.tsx` | glance-only companion doc |
| Continue Card | `src/components/ContinueCard.tsx` | `1.0` |
| Command Overlay | `src/components/CommandOverlay.tsx` | `2.0` |
| Side Panel | `src/components/SidePanel.tsx` | `3.0` |
| Right-click Context Menu | `src/components/ContextMenu.tsx` + `Desktop.tsx` | `4.0` |

Every string, icon, and state from the spec is real and interactive, not just
mocked up visually:

- **Continue Card** — single-Trail resume, the 4-item member preview with
  "+N more" overflow, the low-confidence "Looks right? Yes/No" variant (`1.8.4`),
  the multi-Trail chooser (`1.8.2`), silent no-op when nothing's recent (`1.8.3`),
  Escape-to-dismiss, click-outside-to-dismiss, and a 20s auto-dismiss (`1.9`).
- **Command Overlay** — `⌘K` / `Ctrl+K` opens it from anywhere, live search with
  match highlighting, arrow-key navigation, Enter to open, empty-query "Recent
  Trails," and the no-results state.
- **Side Panel** — filter tabs (All/Active/Idle/Archived), sort toggle
  (recency/name), search-within, expand-to-edit rows with an editable name field,
  per-member remove, **Archive Trail** with an inline undo toast, and **Merge
  with another Trail** via a picker.
- **Context Menu** — real OS-style right-click on every desktop item, with the
  two spec'd variants ("Part of '…'" with its submenu, vs. "Add to a Trail" with
  its submenu and inline "New Trail…" create) plus generic decoy items (Copy /
  Rename / Move to Trash) for realism.
- **Cross-surface flows (`7.0`)** — rejecting a Trail from the Continue Card
  (`Not a Trail`) unassigns its members back to the unfiled pool, exactly like
  the correction flow describes; moving/merging/archiving anywhere is reflected
  immediately everywhere else, because every surface reads the same store — no
  separate sync step.

## Architecture

```
src/
  types.ts              Trail / TrailItem / shared types
  data/seed.ts           mock "watcher" output — seed Trails + items
  store/trailStore.ts     the Trail Store (0.3) — zustand + localStorage persist
  store/selectors.ts      pure derivation logic (e.g. which Continue Card state to show)
  components/
    Widget.tsx            Surface: Widget (glance-only)
    ContinueCard.tsx       Surface: Continue Card
    CommandOverlay.tsx     Surface: Command Overlay
    SidePanel.tsx           Surface: Side Panel
    ContextMenu.tsx        Surface: Context Menu
    Desktop.tsx            mock "OS" surface — the files/tabs/screenshots you right-click
    TrailPicker.tsx        shared small picker (used by Merge + context-menu "Move to…")
    DevToolbar.tsx         NOT part of the spec — see below
```

This mirrors `0.0` in the spec directly: `trailStore.ts` is the single source of
truth (`0.3`); every surface component only ever reads from and calls actions on
that store, never holding its own copy of Trail data.

### Design system

Warm paper background, a subtle topographic-linework texture, an editorial serif
(Fraunces) for Trail names and headings, a clean grotesk (Space Grotesk) for
body text, and a bespoke waypoint-pin mark used as the brand icon throughout —
matching the visual direction from the reference inspiration images. Confidence
is always a small dot: filled/saturated for high, filled/muted for medium,
outline for low.

### Why there's a "Simulate the OS" toolbar

Real Trails is driven by background watchers — file system, screenshots,
clipboard, browser tabs — plus OS-level events like sleep/wake and a global
hotkey. A browser tab can't observe your actual filesystem or clipboard, and
can't detect your laptop waking from sleep. So:

- **`⌘K` / `Ctrl+K`** really works — it's a real global hotkey, wired the same
  way it would be in production.
- **Right-click** on any item in the desktop grid really works — it's a real
  native context menu event, not a styled button pretending to be one.
- **Sleep/wake, and the four watchers**, can't be observed from a browser tab,
  so the small "Simulate the OS" panel (top-left) gives you buttons that fire
  the same store actions those events would trigger in production —
  `simulateWake(mode)` and `simulateActivity()`. Everything downstream of that
  point (which Trail shows, how confidence renders, what the clustering engine
  produces) is the real implementation, not mocked.

That panel is clearly out-of-spec chrome, kept visually separate from the five
real surfaces, so you can tell at a glance what's "the product" vs. what's
"the demo control."

### Clustering engine

The spec describes it as "local heuristics + AI-assisted grouping." This
prototype doesn't run a real classifier — `simulateActivity()` pulls from a
small scripted pool of realistic "next events" (a new screenshot lands in an
existing Trail, an unrelated tab shows up ungrouped, etc.) so you can see how
the system *reacts* to new signal without needing a real watcher pipeline
behind it. The seed data (`src/data/seed.ts`) is written to hit every
lifecycle state (Forming / Active / Idle / Archived) and confidence level
(High / Medium / Low) at once, so every surface has something real to show on
first load.

## Tech stack

Vite + React 18 + TypeScript, Tailwind CSS v4, Zustand (with `localStorage`
persistence), Framer Motion for the Continue Card's entrance, and Lucide for
supporting icons. No backend, no build step beyond `vite build`, no external
services.
