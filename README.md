# Thread

An interactive design prototype for **Thread** — a local agent concept that quietly groups files, tabs, screenshots, and chats by activity instead of by data type, and lets you resume any of them with one click.

This is a case-study prototype, not a functioning agent: all data is scripted mock data, and all "AI" behavior (grouping, confidence, suggestions) is simulated in local React state.

## Run it

```bash
npm install
npm run dev
```

## What's here

Five interfaces, each reachable from the dev-mode nav at the top (a prototype convenience, not part of the product):

- **Continue Card** — a floating card that appears unprompted with the most recently active Thread.
- **Command Overlay** — a Spotlight-style palette, opened with `⌘K` / `Ctrl+K` from anywhere in the app.
- **Side Panel** — a docked view with Active / Needs Review / Dormant sections and watched-location toggles.
- **Context Menu** — a real right-click menu on mock files, with a Thread section inserted above the native OS items.
- **Screenshot Triage Bar** — a low-friction "Add to [Thread]?" bar that appears after a simulated screenshot.

A persistent "Thread — running" tray indicator (bottom-left) is visible across every view, with a tooltip timestamp that ticks up live.

State is shared across all five views — e.g. adding a file to a Thread from the context menu updates the Side Panel and Command Overlay immediately, and can surface in the Continue Card.

## Stack

React + Vite + Tailwind CSS v4 (CSS-first `@theme` tokens), Framer Motion for motion, Lucide for icons. No backend.

## Structure

```
/src
  /components   ContinueCard, CommandOverlay, SidePanel, ContextMenu, ScreenshotTriageBar, TrayIndicator, Toast
  /data         mockThreads.js — sample Threads, items, watched locations, mock files
  /utils        time.js — relative-time formatting
  App.jsx       dev-mode nav + shared state
  index.css     design tokens (colors, fonts, radius, motion)
```
