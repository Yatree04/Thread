import { useMemo, useState } from "react";
import { ChevronRight, Search, Settings } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { WaypointIcon, ConfidenceDot } from "./icons";
import { confidenceLabel, relativeTime } from "../lib/format";

/**
 * Surface 0 — Widget (companion doc). Glance-only: shows the most relevant
 * Trail at a glance, no editing here. Clicking navigates to the Side Panel;
 * it never mutates a Trail directly.
 */
export function Widget() {
  const trails = useTrailStore((s) => s.trails);
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const openSidePanel = useTrailStore((s) => s.openSidePanel);
  const openCommandOverlay = useTrailStore((s) => s.openCommandOverlay);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const current = useMemo(() => {
    return trails
      .filter((t) => !t.rejected && t.lifecycle !== "archived")
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  }, [trails]);

  const memberCount = current ? itemsOf(current.id).length : 0;

  return (
    <div className="fixed bottom-6 left-6 z-40 w-72 select-none">
      <div className="paper-card trail-texture rounded-3xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-ink-soft">
            <WaypointIcon size={15} />
            <span className="text-xs font-medium tracking-wide uppercase">Trails</span>
          </div>
          <div className="relative flex items-center gap-1">
            <button
              onClick={openCommandOverlay}
              className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              aria-label="Search"
              title="Search (⌘K)"
            >
              <Search size={14} />
            </button>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              aria-label="Settings"
            >
              <Settings size={14} />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-8 w-48 rounded-xl border border-line bg-paper-raised p-3 text-xs text-ink-soft shadow-lg">
                <p className="mb-1 font-medium text-ink">Widget</p>
                <p>Glance-only — open the Side Panel to edit, archive, or merge Trails.</p>
              </div>
            )}
          </div>
        </div>

        {current ? (
          <button
            onClick={() => openSidePanel(current.id)}
            className="mt-3 block w-full text-left"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <ConfidenceDot confidence={current.confidence} size={7} />
              <span>{confidenceLabel(current.confidence)}</span>
            </div>
            <h3 className="mt-1 font-serif-display text-xl leading-tight text-ink">
              {current.name}
            </h3>
            <div className="mt-3 flex items-end justify-between">
              <Sparkline seed={current.id} />
              <div className="text-right text-xs text-ink-soft">
                <p>{memberCount} items</p>
                <p className="text-ink-faint">{relativeTime(current.lastActiveAt)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs text-ink-soft group-hover:text-ink">
              <span>View in Side Panel</span>
              <ChevronRight size={14} />
            </div>
          </button>
        ) : (
          <div className="mt-4 py-2 text-center">
            <p className="text-sm text-ink-soft">You're all caught up.</p>
            <p className="text-xs text-ink-faint">No active Trail right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkline({ seed }: { seed: string }) {
  const points = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const vals: number[] = [];
    for (let i = 0; i < 12; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      vals.push(6 + (h % 100) / 100 * 18);
    }
    return vals;
  }, [seed]);

  const w = 120;
  const stepX = w / (points.length - 1);
  const path = points
    .map((y, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${(26 - y).toFixed(1)}`)
    .join(" ");

  return (
    <svg width={w} height={28} viewBox={`0 0 ${w} 28`} className="text-accent">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={26 - points[points.length - 1]} r={2.6} fill="currentColor" />
    </svg>
  );
}
