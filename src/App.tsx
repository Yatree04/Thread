import { useTrailStore } from "./store/trailStore";
import { useHotkey } from "./hooks/useHotkey";
import { Desktop } from "./components/Desktop";
import { Widget } from "./components/Widget";
import { ContinueCard } from "./components/ContinueCard";
import { CommandOverlay } from "./components/CommandOverlay";
import { SidePanel } from "./components/SidePanel";
import { ContextMenu } from "./components/ContextMenu";
import { ToastHost } from "./components/Toast";
import { DevToolbar } from "./components/DevToolbar";
import { WaypointIcon } from "./components/icons";

export default function App() {
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
