import { useEffect } from "react";
import { useTrailStore, startElectronSync } from "./store/trailStore";
import { useHotkey } from "./hooks/useHotkey";
import { Desktop } from "./components/Desktop";
import { Widget } from "./components/Widget";
import { Capture } from "./components/Capture";
import { Query } from "./components/Query";
import { ContextMenu } from "./components/ContextMenu";
import { ToastHost } from "./components/Toast";
import { DevToolbar } from "./components/DevToolbar";
import { Settings } from "./components/Settings";
import { WaypointIcon } from "./components/icons";
import { getSurface } from "./lib/electron";

export default function App() {
  const surface = getSurface();
  if (surface === "widget") return <ElectronWidgetWindow />;
  if (surface === "capture") return <ElectronCaptureWindow />;
  if (surface === "query") return <ElectronQueryWindow />;
  if (surface === "settings") return <Settings />;
  return <BrowserDemo />;
}

/** The desktop app's floating glance widget — its own real OS window. No
 * toasts here on purpose: a pinned desktop widget shouldn't pop notifications
 * over itself — see Query/Capture for where feedback like "Trail archived"
 * or "Added to X" actually surfaces. */
function ElectronWidgetWindow() {
  useEffect(() => startElectronSyncOnce(), []);
  return (
    <div className="h-screen w-screen bg-transparent">
      <Widget />
    </div>
  );
}

/** The quick-capture composer — its own real OS window, forever present as a
 * floating "+" bubble that resizes in place when expanded. No toasts here
 * either: filing feedback lives inline in each note's own status line. */
function ElectronCaptureWindow() {
  useEffect(() => startElectronSyncOnce(), []);
  return (
    <div className="h-screen w-screen bg-transparent">
      <Capture />
    </div>
  );
}

/** The Query Surface — search, browse, and manage Trails — its own real OS window. */
function ElectronQueryWindow() {
  useEffect(() => {
    startElectronSyncOnce();
    useTrailStore.setState({ queryOpen: true });
  }, []);
  return (
    <div className="h-screen w-screen bg-transparent">
      <Query />
      <ToastHost />
    </div>
  );
}

let started = false;
function startElectronSyncOnce() {
  if (started) return;
  started = true;
  startElectronSync();
}

/** The original browser-tab prototype — every surface floating over a mock
 * desktop, driven by the same real store every other surface reads. Runs
 * when opened as a plain browser tab (no ?surface= param), e.g. via `npm run dev`. */
function BrowserDemo() {
  const queryOpen = useTrailStore((s) => s.queryOpen);
  const captureExpanded = useTrailStore((s) => s.captureExpanded);
  const openQuery = useTrailStore((s) => s.openQuery);
  const closeQuery = useTrailStore((s) => s.closeQuery);

  useHotkey("k", () => {
    const s = useTrailStore.getState();
    s.queryOpen ? s.closeQuery() : s.openQuery();
  });

  return (
    <div className="trail-texture min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-paper/80 px-8 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <WaypointIcon size={16} className="text-ink" />
          <span className="font-serif-display text-base text-ink">Trails</span>
          <span className="hidden text-xs text-ink-faint sm:inline">
            — Widget, Capture, and Query: three surfaces, click through them
          </span>
        </div>
        <button
          onClick={() => (queryOpen ? closeQuery() : openQuery())}
          className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs text-ink-soft hover:border-accent-soft"
        >
          ⌘K / Ctrl+K to search
        </button>
      </header>

      <main>
        <Desktop />
      </main>

      {/* Widget: pinned top-right, always present — matches the real desktop app. */}
      <div className="fixed right-6 top-6 z-40 h-[460px] w-[300px]">
        <Widget />
      </div>

      {/* Capture: forever-floating "+" bubble, stacked below the Widget — never
       * a conditionally-mounted overlay, since it's meant to always be there. */}
      <div
        className={`fixed right-6 z-40 transition-all ${captureExpanded ? "h-[520px] w-[360px]" : "h-14 w-14"}`}
        style={{ top: 500 }}
      >
        <Capture />
      </div>

      <Query />
      <DevToolbar />
      <ContextMenu />
      <ToastHost />
    </div>
  );
}
