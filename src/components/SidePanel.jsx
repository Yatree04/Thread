import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import ConfidenceDot from "./ConfidenceDot";
import { ItemTypeIcon, typeBreakdown } from "./itemIcons";
import { timeAgo } from "../utils/time";

function Switch({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: 34,
        height: 19,
        background: checked ? "var(--color-accent-dim)" : "var(--color-surface-elevated-2)",
        border: `1px solid ${checked ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-[1.5px] rounded-full"
        style={{
          width: 14,
          height: 14,
          left: checked ? 16 : 2,
          background: checked ? "var(--color-accent)" : "var(--color-text-faint)",
        }}
      />
    </button>
  );
}

function ThreadMini({ thread, faded }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-md px-2.5 py-2"
      style={{ opacity: faded ? 0.55 : 1 }}
    >
      <ConfidenceDot confidence={thread.items.some((i) => i.confidence === "suggested") ? "suggested" : "confirmed"} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
          {thread.name}
          {thread.state === "forming" && (
            <span
              className="ml-2 rounded-full px-1.5 py-[1px] text-[9px] align-middle uppercase tracking-wide"
              style={{ background: "var(--color-accent-wash)", color: "var(--color-accent)" }}
            >
              Forming
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5" style={{ color: "var(--color-text-faint)" }}>
          {Object.keys(typeBreakdown(thread.items)).map((type) => (
            <ItemTypeIcon key={type} type={type} size={11} />
          ))}
          <span className="text-[10.5px]" style={{ fontFamily: "var(--font-mono)" }}>
            · {timeAgo(thread.lastTouched)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SidePanel({
  threads,
  needsReview,
  onAccept,
  onReject,
  watchedLocations,
  onToggleLocation,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeThreads = threads
    .filter((t) => t.state === "active" || t.state === "forming")
    .sort((a, b) => b.lastTouched - a.lastTouched);
  const dormantThreads = threads
    .filter((t) => t.state === "dormant")
    .sort((a, b) => b.lastTouched - a.lastTouched);

  return (
    <aside
      className="flex h-full w-[340px] shrink-0 flex-col"
      style={{ background: "var(--color-surface)", borderLeft: "1px solid var(--color-border-soft)" }}
    >
      <div className="px-4 pt-4 pb-2">
        <div
          className="text-[13px] font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
        >
          Threads
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="mb-3">
          <div
            className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-wider"
            style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            Active · {activeThreads.length}
          </div>
          {activeThreads.map((t) => (
            <ThreadMini key={t.id} thread={t} />
          ))}
        </div>

        <div className="mb-3">
          <div
            className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-wider"
            style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            Needs Review · {needsReview.length}
          </div>
          <AnimatePresence initial={false}>
            {needsReview.map(({ thread, item }) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
                  <ItemTypeIcon type={item.type} size={14} className="shrink-0" style={{ color: "var(--color-text-dim)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] truncate" style={{ color: "var(--color-text-primary)" }}>
                      {item.name}
                    </div>
                    <div className="text-[10.5px] truncate" style={{ color: "var(--color-text-faint)" }}>
                      → {thread.name}
                    </div>
                  </div>
                  <button
                    onClick={() => onReject(thread.id, item.id)}
                    aria-label="Reject"
                    className="rounded-md p-1 transition-colors hover:bg-white/5"
                    style={{ color: "var(--color-danger)" }}
                  >
                    <X size={14} />
                  </button>
                  <button
                    onClick={() => onAccept(thread.id, item.id)}
                    aria-label="Accept"
                    className="rounded-md p-1 transition-colors hover:bg-white/5"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {needsReview.length === 0 && (
            <div className="px-2.5 py-2 text-[12px]" style={{ color: "var(--color-text-faint)" }}>
              Nothing waiting on you.
            </div>
          )}
        </div>

        <div className="mb-3">
          <div
            className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-wider"
            style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            Dormant · {dormantThreads.length}
          </div>
          {dormantThreads.map((t) => (
            <ThreadMini key={t.id} thread={t} faded />
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--color-border-soft)" }}>
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-[12.5px]"
          style={{ color: "var(--color-text-dim)" }}
        >
          <span>Watched locations</span>
          <ChevronDown
            size={14}
            style={{ transform: drawerOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </button>
        <AnimatePresence initial={false}>
          {drawerOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3.5 flex flex-col gap-2.5">
                {watchedLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between">
                    <span className="text-[12.5px]" style={{ color: "var(--color-text-dim)" }}>
                      {loc.label}
                    </span>
                    <Switch checked={loc.enabled} onChange={() => onToggleLocation(loc.id)} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
