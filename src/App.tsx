import { useEffect } from "react";
import { useTrailStore, startElectronSync } from "./store/trailStore";
import { useHotkey } from "./hooks/useHotkey";
import { Desktop } from "./components/Desktop";
import { Widget } from "./components/Widget";
import { ContinueCard } from "./components/ContinueCard";
import { CommandOverlay } from "./components/CommandOverlay";
import { SidePanel } from "./components/SidePanel";
import { ContextMenu } from "./components/ContextMenu";
import { ToastHost } from "./components/Toast";
import { DevToolbar } from "./components/DevToolbar";
import { Settings } from "./components/Settings";
import { WaypointIcon } from "./components/icons";
import { getSurface } from "./lib/electron";

export default function App() {
  const surface = getSurface();
  if (surface === "widget") return <ElectronWidgetWindow />;
  if (surface === "overlay") return <ElectronOverlayWindow />;
  if (surface === "sidepanel") return <ElectronSidePanelWindow />;
  if (surface === "settings") return <Settings />;
  return <BrowserDemo />;
}

/** The desktop app's floating glance widget — its own real OS window. */
function ElectronWidgetWindow() {
  useEffect(() => startElectronSyncOnce(), []);
  return (
    <div className="h-screen w-screen bg-transparent">
      <Widget />
      <ToastHost />
    </div>
  );
}

/** Shared frameless overlay window — shows the Continue Card on real
 * sleep/wake, and the Command Overlay on the real global ⌘K/Ctrl+K hotkey. */
function ElectronOverlayWindow() {
  useEffect(() => startElectronSyncOnce(), []);
  return (
    <div className="h-screen w-screen bg-transparent">
      <ContinueCard />
      <CommandOverlay />
    </div>
  );
}

/** The real, always-available Side Panel — its own docked-right OS window. */
function ElectronSidePanelWindow() {
  useEffect(() => {
    startElectronSyncOnce();
    useTrailStore.setState({ sidePanelOpen: true });
  }, []);
  return (
    <div className="trail-texture h-screen w-screen bg-paper">
      <SidePanel />
      <ContextMenu />
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
 * desktop, driven by scripted/simulated data. Runs when opened as a plain
 * browser tab (no ?surface= param), e.g. via `npm run dev`. */
function BrowserDemo() {
  const openCommandOverlay = useTrailStore((s) => s.openCommandOverlay);
  const closeCommandOverlay = useTrailStore((s) => s.closeCommandOverlay);
  const commandOverlayOpen = useTrailStore((s) => s.commandOverlayOpen);
  const sidePanelOpen = useTrailStore((s) => s.sidePanelOpen);

  useHotkey("k", () => {
    const s = useTrailStore.getState();
    s.commandOverlayOpen ? s.closeCommandOverlay() : s.openCommandOverlay();
  });

  return (
    <div className="trail-texture min-h-screen">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-paper/80 px-8 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <WaypointIcon size={16} className="text-ink" />
          <span className="font-serif-display text-base text-ink">Trails</span>
          <span className="hidden text-xs text-ink-faint sm:inline">
            — a working prototype of the full system spec
          </span>
        </div>
        <button
          onClick={() => (commandOverlayOpen ? closeCommandOverlay() : openCommandOverlay())}
          className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs text-ink-soft hover:border-accent-soft"
        >
          ⌘K / Ctrl+K to search
        </button>
      </header>

      <main className={sidePanelOpen ? "mr-[380px] transition-[margin]" : "transition-[margin]"}>
        <Desktop />
      </main>

      <Widget />
      <DevToolbar />
      <ContinueCard />
      <CommandOverlay />
      <SidePanel />
      <ContextMenu />
      <ToastHost />
    </div>
  );
}
