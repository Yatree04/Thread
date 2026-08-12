import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, X } from "lucide-react";

const AUTO_FADE_MS = 5000;

function pad(n) {
  return String(n).padStart(2, "0");
}

function screenshotName() {
  const d = new Date();
  return `Screenshot ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}.${pad(d.getMinutes())}.png`;
}

export default function ScreenshotTriageBar({ activeThreads, onAccept }) {
  const [flash, setFlash] = useState(false);
  const [triage, setTriage] = useState(null);
  const rotateRef = useRef(0);
  const timeoutRef = useRef(null);

  const takeScreenshot = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 160);

    const pool = activeThreads.length > 0 ? activeThreads : [];
    const thread = pool.length > 0 ? pool[rotateRef.current % pool.length] : null;
    rotateRef.current += 1;

    const next = { id: Date.now(), name: screenshotName(), thread };
    setTriage(next);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTriage((t) => (t?.id === next.id ? null : t)), AUTO_FADE_MS);
  };

  const clear = () => {
    clearTimeout(timeoutRef.current);
    setTriage(null);
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-6">
      <AnimatePresence>
        {flash && (
          <motion.div
            className="fixed inset-0 z-50 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          />
        )}
      </AnimatePresence>

      <div className="text-center">
        <div
          className="text-[13px]"
          style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
        >
          Demo trigger — real Thread reacts to your OS's actual screenshot shortcut
        </div>
        <button
          onClick={takeScreenshot}
          className="mt-4 flex items-center gap-2.5 rounded-[10px] px-5 py-3 text-[14px] font-medium shadow-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
        >
          <Camera size={16} style={{ color: "var(--color-accent)" }} />
          Take Screenshot
          <kbd
            className="ml-1 text-[11px] rounded px-1.5 py-0.5"
            style={{ color: "var(--color-text-faint)", border: "1px solid var(--color-border-soft)", fontFamily: "var(--font-mono)" }}
          >
            ⌘⇧4
          </kbd>
        </button>
      </div>

      <AnimatePresence>
        {triage && (
          <motion.div
            key={triage.id}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-8 left-1/2 z-40 w-[380px] -translate-x-1/2 overflow-hidden rounded-[12px] shadow-2xl"
            style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-soft)" }}
          >
            <div className="flex items-center gap-3 px-3.5 py-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                style={{ background: "var(--color-surface-elevated-2)" }}
              >
                <Camera size={16} style={{ color: "var(--color-text-dim)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px]" style={{ color: "var(--color-text-primary)" }}>
                  {triage.thread ? (
                    <>
                      Add to <span className="font-semibold">{triage.thread.name}</span>?
                    </>
                  ) : (
                    "Save this screenshot?"
                  )}
                </div>
                <div className="truncate text-[11px]" style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                  {triage.name}
                </div>
              </div>
              {triage.thread && (
                <button
                  onClick={() => {
                    onAccept(triage.thread.id, triage.name);
                    clear();
                  }}
                  aria-label="Add"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90"
                  style={{ background: "var(--color-accent)", color: "#0F1512" }}
                >
                  <Check size={15} />
                </button>
              )}
              <button
                onClick={clear}
                aria-label="Dismiss"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-faint)" }}
              >
                <X size={15} />
              </button>
            </div>
            <motion.div
              key={`bar-${triage.id}`}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: AUTO_FADE_MS / 1000, ease: "linear" }}
              style={{ transformOrigin: "left", height: 2, background: "var(--color-accent-dim)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
