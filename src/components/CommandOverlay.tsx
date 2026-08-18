import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { ConfidenceDot, WaypointIcon } from "./icons";
import { lifecycleLabel, relativeTime } from "../lib/format";
import type { Trail } from "../types";

/** Surface 2 — Command Overlay. Answers "Where is the thing I need, right now?" */
export function CommandOverlay() {
  const open = useTrailStore((s) => s.commandOverlayOpen);
  const close = useTrailStore((s) => s.closeCommandOverlay);
  const trails = useTrailStore((s) => s.trails);
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const openSidePanel = useTrailStore((s) => s.openSidePanel);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  const visible = useMemo(
    () => trails.filter((t) => !t.rejected).sort((a, b) => b.lastActiveAt - a.lastActiveAt),
    [trails]
  );

  const results = useMemo(() => {
    if (!query.trim()) return visible.slice(0, 5);
    const q = query.toLowerCase();
    return visible.filter((t) => t.name.toLowerCase().includes(q));
  }, [query, visible]);

  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const t = results[selected];
        if (t) {
          openSidePanel(t.id);
          close();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, selected, close, openSidePanel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/30 pt-[14vh] backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="paper-card w-[560px] overflow-hidden rounded-2xl"
        >
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <WaypointIcon size={16} className="text-ink-faint" />
            <Search size={16} className="text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search what you were doing…"
              className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto no-scrollbar py-2">
            {!query.trim() && (
              <p className="px-4 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                Recent Trails
              </p>
            )}
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <WaypointIcon variant="outline" size={26} className="text-ink-faint" />
                <p className="text-sm text-ink-soft">No Trails match '{query}'</p>
              </div>
            ) : (
              results.map((t, i) => (
                <ResultRow
                  key={t.id}
                  trail={t}
                  query={query}
                  active={i === selected}
                  memberCount={itemsOf(t.id).length}
                  onClick={() => {
                    openSidePanel(t.id);
                    close();
                  }}
                  onHover={() => setSelected(i)}
                />
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[11px] text-ink-faint">
            <span>↑↓ to navigate</span>
            <span>Enter to open</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-accent-soft text-ink">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function ResultRow({
  trail,
  query,
  active,
  memberCount,
  onClick,
  onHover,
}: {
  trail: Trail;
  query: string;
  active: boolean;
  memberCount: number;
  onClick: () => void;
  onHover: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onHover}
      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${
        active ? "bg-paper-deep" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <ConfidenceDot confidence={trail.confidence} size={7} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{highlight(trail.name, query)}</p>
          <p className="text-xs text-ink-faint">
            {memberCount} items · {lifecycleLabel(trail.lifecycle)}
          </p>
        </div>
      </div>
      <span className="shrink-0 text-xs text-ink-faint">{relativeTime(trail.lastActiveAt)}</span>
    </button>
  );
}
