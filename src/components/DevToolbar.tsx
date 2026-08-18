import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { WaypointIcon } from "./icons";

/**
 * Not part of the Trails spec — this is the "OS chrome" for the prototype.
 * Real Trails is triggered by sleep/wake, a global hotkey, and background
 * watchers; a browser tab can't observe those, so this bar gives you buttons
 * to fire the same events on demand and see every surface/state respond.
 */
export function DevToolbar() {
  const [collapsed, setCollapsed] = useState(false);
  const simulateWake = useTrailStore((s) => s.simulateWake);
  const simulateActivity = useTrailStore((s) => s.simulateActivity);
  const openCommandOverlay = useTrailStore((s) => s.openCommandOverlay);
  const sidePanelOpen = useTrailStore((s) => s.sidePanelOpen);
  const toggleSidePanel = () => {
    const s = useTrailStore.getState();
    s.sidePanelOpen ? s.closeSidePanel() : s.openSidePanel();
  };

  return (
    <div className="fixed left-6 top-20 z-[65] w-64 select-none">
      <div className="paper-card rounded-2xl">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-2.5"
        >
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
            <WaypointIcon size={13} /> Simulate the OS
          </span>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {!collapsed && (
          <div className="space-y-1.5 border-t border-line px-3.5 py-3 text-xs">
            <p className="text-ink-faint">Continue Card (wake)</p>
            <div className="flex flex-wrap gap-1.5">
              <ToolButton onClick={() => simulateWake("auto")}>Normal</ToolButton>
              <ToolButton onClick={() => simulateWake("low")}>Low confidence</ToolButton>
              <ToolButton onClick={() => simulateWake("multiple")}>Multiple Trails</ToolButton>
              <ToolButton onClick={() => simulateWake("none")}>None recent</ToolButton>
            </div>
            <p className="pt-1 text-ink-faint">Watchers</p>
            <div className="flex flex-wrap gap-1.5">
              <ToolButton onClick={simulateActivity}>New activity</ToolButton>
            </div>
            <p className="pt-1 text-ink-faint">Surfaces</p>
            <div className="flex flex-wrap gap-1.5">
              <ToolButton onClick={openCommandOverlay}>⌘K Search</ToolButton>
              <ToolButton onClick={toggleSidePanel}>
                {sidePanelOpen ? "Close" : "Open"} Side Panel
              </ToolButton>
            </div>
            <p className="pt-1.5 text-[11px] leading-snug text-ink-faint">
              Right-click any item below to try the context menu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-line bg-paper-raised px-2.5 py-1 font-medium text-ink-soft hover:border-accent-soft hover:text-ink"
    >
      {children}
    </button>
  );
}
