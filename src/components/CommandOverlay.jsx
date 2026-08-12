import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Search } from "lucide-react";
import ConfidenceDot from "./ConfidenceDot";
import { ItemTypeIcon, typeBreakdown } from "./itemIcons";
import { timeAgo } from "../utils/time";

function threadConfidence(thread) {
  return thread.items.some((i) => i.confidence === "suggested") ? "suggested" : "confirmed";
}

function breakdownLabel(items) {
  const counts = typeBreakdown(items);
  return Object.entries(counts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");
}

function ThreadRow({ thread, expanded, onToggle }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-surface-elevated-2)]"
      >
        <ConfidenceDot confidence={threadConfidence(thread)} />
        <div className="flex-1 min-w-0">
          <div
            className="text-[13.5px] font-medium truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {thread.name}
            {thread.state === "forming" && (
              <span
                className="ml-2 rounded-full px-1.5 py-[1px] text-[9.5px] align-middle uppercase tracking-wide"
                style={{ background: "var(--color-accent-wash)", color: "var(--color-accent)" }}
              >
                Forming
              </span>
            )}
          </div>
          <div
            className="text-[11.5px] truncate"
            style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            {thread.items.length} items · {breakdownLabel(thread.items)}
          </div>
        </div>
        <span
          className="text-[11px] shrink-0"
          style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
        >
          {timeAgo(thread.lastTouched)}
        </span>
        <ChevronRight
          size={14}
          className="shrink-0 transition-transform"
          style={{
            color: "var(--color-text-faint)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="mx-3 mb-2 mt-0.5 rounded-md px-3 py-2 text-[12.5px] leading-snug"
              style={{ background: "var(--color-accent-wash)", color: "var(--color-text-dim)" }}
            >
              <span style={{ color: "var(--color-accent)" }}>Why grouped — </span>
              {thread.whyGrouped}
            </div>
            <div className="mx-3 mb-2.5 flex flex-wrap gap-1.5">
              {thread.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-soft)" }}
                >
                  <ItemTypeIcon type={item.type} size={12} className="opacity-70" />
                  <span className="text-[11.5px] truncate max-w-[180px]" style={{ color: "var(--color-text-dim)" }}>
                    {item.name}
                  </span>
                  <ConfidenceDot confidence={item.confidence} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CommandOverlay({ open, threads, onClose }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setExpandedId(null);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [threads, query]);

  const active = filtered
    .filter((t) => t.state === "active" || t.state === "forming")
    .sort((a, b) => b.lastTouched - a.lastTouched);
  const dormant = filtered
    .filter((t) => t.state === "dormant")
    .sort((a, b) => b.lastTouched - a.lastTouched);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-center pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10,11,13,0.6)", backdropFilter: "blur(2px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-[560px] max-w-[90vw] max-h-[70vh] flex flex-col rounded-[14px] shadow-2xl overflow-hidden"
            style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--color-border-soft)" }}>
              <Search size={16} style={{ color: "var(--color-text-faint)" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Threads…"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: "var(--color-text-primary)" }}
              />
              <kbd
                className="text-[10.5px] rounded px-1.5 py-0.5"
                style={{ color: "var(--color-text-faint)", border: "1px solid var(--color-border-soft)", fontFamily: "var(--font-mono)" }}
              >
                esc
              </kbd>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {active.length > 0 && (
                <div className="mb-1">
                  <div
                    className="px-2.5 pt-1.5 pb-1 text-[10.5px] uppercase tracking-wider"
                    style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
                  >
                    Active
                  </div>
                  {active.map((t) => (
                    <ThreadRow
                      key={t.id}
                      thread={t}
                      expanded={expandedId === t.id}
                      onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    />
                  ))}
                </div>
              )}

              {dormant.length > 0 && (
                <div className="mb-1 opacity-80">
                  <div
                    className="px-2.5 pt-2 pb-1 text-[10.5px] uppercase tracking-wider"
                    style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
                  >
                    Dormant
                  </div>
                  {dormant.map((t) => (
                    <ThreadRow
                      key={t.id}
                      thread={t}
                      expanded={expandedId === t.id}
                      onToggle={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    />
                  ))}
                </div>
              )}

              {filtered.length === 0 && (
                <div className="px-3 py-8 text-center text-[13px]" style={{ color: "var(--color-text-faint)" }}>
                  No Threads match "{query}"
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
