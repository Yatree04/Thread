# Thread

A local background agent that watches your Downloads, Desktop, Screenshots, and clipboard, and groups new items into named **Threads** — using real content analysis, a real local database, and real confidence scoring. Not a mockup: everything described below actually runs.

## Run it

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Without an API key Thread still runs end-to-end, but falls back to simple keyword matching instead of real classification (this is shown clearly in Settings → Privacy, and in every "why grouped" reason it generates).

On first launch you'll get a consent screen listing exactly what Thread wants to watch — deselect anything before it starts. Nothing is watched until you confirm.

## What's real here

- **File watching** (`chokidar`) on Downloads/Desktop/Screenshots, and **clipboard polling** — both genuinely running in the background, not simulated.
- **A real SQLite database** (`better-sqlite3`) at your OS's app-data folder, persisting Threads/items/memberships across restarts. Schema in `src/main/db.js`.
- **Real two-tier clustering**: a cheap heuristic pre-filter (keyword + recency overlap, no API call) produces a shortlist of candidate Threads, then a single Claude call — using structured tool-use output, not free text parsing — decides membership, confidence, and writes a real one-sentence "why grouped" reason to the database. See `src/main/clustering.js` and `src/main/ai.js`.
- **A real floating widget** — frameless, always-on-top `BrowserWindow` with three size tiers (small/medium/large) you cycle through, showing live data pulled from SQLite.
- **A real global-hotkey command palette** (`Cmd/Ctrl+Shift+T`) — search, expandable real "why grouped" reasons, accept/reject that actually writes to the database.
- **A real system tray icon** whose pulse/tooltip is driven by actual watcher/clustering events (`src/main/events.js`), not a timer.
- **A real settings window**: folder watch toggles that actually reconfigure the watcher live, a browsable list of everything indexed with real delete (including moving files to the OS trash), and a privacy tab stating plainly what's stored vs. sent to the API.

## What's honestly simulated (see brief §2)

- **The file browser's right-click menu** (`src/renderer/file-browser-sim`) is Thread's own in-app window, not an injection into your real Finder/Explorer context menu — that requires a signed native OS extension per platform, out of scope here. It's clearly labeled in the UI. Everything *inside* it is real, though: it lists your actual indexed files, and Open/Reveal-in-file-manager/Move-to-Trash genuinely act on them.
- **Browser tab awareness** and **cross-device sync** are not built — the former would need a real Manifest V3 browser extension (a legitimately separate project), the latter a real backend. Neither is faked here.

## Privacy

- Everything is stored locally in SQLite — nothing is uploaded anywhere by default.
- The only outbound call is to Anthropic's API for classification, and it only ever receives: the filename, a short excerpt (first ~300 characters of text content — never full files, never image bytes), and your existing Thread names/summaries.
- Delete anything, anytime, from Settings → Indexed items.

This is a student/portfolio project, not a production tool — please treat it accordingly if you share it further.

## Structure

```
src/
  main/            Electron main process
    db.js           SQLite schema + queries
    watcher.js       chokidar folder watcher
    clipboard.js      clipboard polling
    clustering.js      heuristic pre-filter -> AI decision -> DB write
    ai.js             Anthropic structured tool-use call
    tray.js            tray icon, driven by real events
    windows.js         widget / palette / settings / file-browser-sim windows
    ipc.js             ipcMain handlers (the only way the renderer touches data)
    preload.js         contextBridge — renderer only ever gets window.thread
    events.js          shared EventEmitter for watcher/clustering -> tray/UI
  renderer/         UI (plain HTML/CSS/JS, no framework, no build step)
    widget/  palette/  settings/  file-browser-sim/  shared/ (design tokens, fonts)
```

Security note: renderers run with `contextIsolation: true` and `nodeIntegration: false` — they never get direct filesystem/DB access, only the limited `window.thread` API exposed via `preload.js`.
