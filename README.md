# Trails

A working implementation of **Trails** — a background agent that groups related
files, browser tabs, and clipboard items into named bundles ("Trails") and
surfaces them across five UI surfaces (Widget, Continue Card, Command Overlay,
Side Panel, right-click Context Menu).

This repo has **two ways to run it**:

1. **The real desktop app** (recommended) — an Electron app that actually
   watches your real Desktop/Downloads folders and clipboard, tracks your real
   browser tabs via a companion extension, uses the real Anthropic API to
   decide how to group things, and lives in your system tray with a real
   global hotkey. Not a browser tab pretending to be an app.
2. **The original browser prototype** — the same five surfaces running in a
   plain browser tab against scripted/simulated data, with a "Simulate the OS"
   panel standing in for things a browser can't observe (see the bottom of
   this doc). Useful for quickly seeing every UI state without touching your
   real files.

---

## Run the real desktop app

### 1. Install

```bash
npm install
```

### 2. (Optional but recommended) Add an Anthropic API key

Without a key, everything still runs for real — real files, real clipboard,
real tabs, real tray app, real global hotkey — but new items land unfiled
since there's no model deciding where they belong.

```bash
cp .env.example .env
# then edit .env and paste a key from https://console.anthropic.com/settings/keys
```

### 3. Launch

```bash
npm run electron:dev
```

This starts the Vite dev server and the Electron app together. You should see:
- A small **Widget** card appear bottom-left of your screen (always-on-top).
- A **Trails** tray icon appear in your system tray.
- Nothing else visible — the Continue Card and Command Overlay are hidden
  until something triggers them (see below).

### 4. (Optional) Install the browser-tab extension

Real browser tab tracking needs a small companion extension, since a desktop
app can't see your browser's tabs on its own:

1. Open `chrome://extensions` (or `edge://extensions`) in Chrome or Edge.
2. Turn on **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `browser-extension/` folder in this
   repo.
4. That's it — it silently reports your active tab's title + URL to the
   Trails app running on `127.0.0.1:8934`. Nothing leaves your machine.

### Try it

- **Real files**: drop a file onto your Desktop or into Downloads. Within a
  couple seconds it's detected, classified, and (if you added an API key)
  either joins an existing Trail or starts a new one.
- **Real clipboard**: copy some text. Same pipeline.
- **Real tabs**: switch tabs in your browser (with the extension loaded).
  Same pipeline.
- **`Ctrl+K` / `Cmd+K`**, from *anywhere* on your machine, opens the Command
  Overlay — a real global hotkey, not scoped to a browser tab.
- **Sleep your laptop and wake it up** (or just lock/unlock the screen) — the
  Continue Card appears for real, driven by Electron's real `powerMonitor`
  wake event, not a button.
- Click the **Widget**, or the tray icon, to open the real **Side Panel**
  window (docked to the right edge of your screen). It has an **Inbox**
  section for anything the watchers picked up that isn't confidently grouped
  yet — right-click any item there for the real context menu (`Add to a
  Trail` / `New Trail…` / etc.).
- **Quit** from the tray icon's menu when you're done — closing the Side
  Panel window just hides it, since Trails is meant to run in the background.

## What's real vs. what's a deliberate compromise

Being upfront about the boundary, since "desktop app" can mean a lot of things:

| Piece | Status |
|---|---|
| File system watcher (Desktop + Downloads) | **Real** — `chokidar`, live |
| Clipboard watcher | **Real** — polls the OS clipboard every 2.5s |
| Browser tab watcher | **Real**, via the companion extension + a local HTTP bridge (`electron/server.cjs`) — requires loading the extension manually (see above); browsers don't allow a desktop app to read tabs any other way without one |
| AI-assisted clustering | **Real** — calls the Anthropic API with your key; degrades to "leave it unfiled" with no key, never fakes a result |
| Global `Ctrl+K` hotkey | **Real** OS-level hotkey (`globalShortcut`) |
| Sleep/wake → Continue Card | **Real** (`powerMonitor` `resume` / `unlock-screen` events) |
| System tray app | **Real** |
| Widget / Side Panel as real OS windows | **Real** — separate `BrowserWindow`s, not divs in one tab |
| Screenshot watcher | **Not implemented** (by choice, to keep scope focused — see `electron/watchers/` to add one, it'd mirror the file watcher) |
| Right-click on your *actual* Windows Explorer files | **Not implemented** — that requires a native Windows shell extension (a whole separate native-code project). Right-click instead works on items in the app's own **Inbox** list, which is where real detected-but-unfiled items land. |
| Packaged installer (`.exe`) | **Not built yet** — currently runs via `npm run electron:dev`. Packaging with `electron-builder` is a natural next step if you want a double-click app. |

## Architecture

```
electron/
  main.cjs              app entrypoint — windows, tray, global hotkey, wake detection, IPC
  preload.cjs            contextBridge — exposes window.trailsAPI to the renderer, safely
  store.cjs               the REAL Trail Store (0.3) — persisted via electron-store, the
                          single source of truth every window mirrors over IPC
  clustering.cjs          real Anthropic API call — decides add/new/unfiled for each item
  server.cjs               local HTTP bridge (127.0.0.1:8934) the browser extension posts to
  watchers/
    fileSystem.cjs          chokidar watcher on Desktop + Downloads
    clipboard.cjs            polls Electron's clipboard module
  windows.cjs              creates the Widget / Overlay / Side Panel BrowserWindows
  assets/                  tray + app icons

browser-extension/       MV3 unpacked extension — reports the active tab to the bridge

src/                     the same React app powers both the desktop app and the browser demo
  App.tsx                 branches on ?surface=widget|overlay|sidepanel (Electron windows)
                          vs. no param (browser demo) — see below
  lib/electron.ts          typed window.trailsAPI bridge + surface detection
  store/trailStore.ts       one Zustand store; in Electron it mirrors electron/store.cjs
                          over IPC instead of owning the data itself
  components/               the five surfaces — identical code runs in both modes
```

Each Electron window (`Widget`, `Overlay`, `SidePanel`) loads the *same* Vite
page with a different `?surface=` query param, and `App.tsx` renders only that
surface. All three mirror `electron/store.cjs`'s state over IPC — mutating
actions (archive, merge, rename, resume, …) dispatch to the main process,
which is the actual source of truth (spec `0.3`/`0.4`), and broadcasts the
result back to every open window. This is stricter than a typical browser
tab's `localStorage` — there's no way for one window to drift out of sync.

## Run the original browser prototype

```bash
npm run dev
```

Open the printed `http://localhost:5173` URL (no `?surface=` param) for the
original all-in-one demo: every surface floating over a mock desktop of
scripted items, with a **"Simulate the OS"** panel standing in for things a
browser tab can't observe (sleep/wake, watchers). `⌘K`/`Ctrl+K` and
right-click both really work here too. See the inline comments in
`src/components/DevToolbar.tsx` for what each button simulates. State
persists to `localStorage`.

```bash
npm run build    # type-checks and produces a static dist/ bundle
npm run preview  # serve that production build locally
```

## Tech stack

Electron (real desktop shell), Vite + React 18 + TypeScript (same app for
both modes), Tailwind CSS v4, Zustand, Framer Motion, Lucide icons, chokidar
(file watching), the Anthropic SDK (clustering), electron-store (persistence).
