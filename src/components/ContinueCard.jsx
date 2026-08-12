import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { ItemTypeIcon, typeBreakdown } from "./itemIcons";
import { timeAgo } from "../utils/time";

export default function ContinueCard({ thread, visible, onContinue, onDismiss }) {
  return (
    <AnimatePresence>
      {visible && thread && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 right-5 z-40 w-[336px] rounded-[14px] p-4 shadow-2xl"
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border-soft)",
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div
              className="text-[11px] uppercase tracking-wider"
              style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
            >
              Welcome back
            </div>
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="rounded-md p-1 -m-1 transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-faint)" }}
            >
              <X size={14} />
            </button>
          </div>

          <div
            className="mt-1.5 text-[15px] font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}
          >
            {thread.name}
          </div>
          <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--color-text-dim)" }}>
            {thread.summary}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Object.entries(typeBreakdown(thread.items)).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-1"
                  style={{ color: "var(--color-text-faint)" }}
                >
                  <ItemTypeIcon type={type} size={13} />
                  <span className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
            <span
              className="text-[11px]"
              style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
            >
              {timeAgo(thread.lastTouched)}
            </span>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              onClick={onContinue}
              className="flex-1 rounded-[8px] py-2 text-[13px] font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--color-accent)", color: "#0F1512" }}
            >
              Continue
            </button>
            <button
              onClick={onDismiss}
              className="rounded-[8px] px-3 py-2 text-[13px] transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-dim)", border: "1px solid var(--color-border-soft)" }}
            >
              Not now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
