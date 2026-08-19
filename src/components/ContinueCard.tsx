import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTrailStore } from "../store/trailStore";
import { getContinueCardData } from "../store/selectors";
import { ConfidenceDot, MemberTypeIcon, WaypointIcon } from "./icons";
import { confidenceLabel, relativeTime } from "../lib/format";
import type { Trail } from "../types";

/** Surface 1 — Continue Card. Answers "What was I doing?" */
export function ContinueCard() {
  const trails = useTrailStore((s) => s.trails);
  const wakeMode = useTrailStore((s) => s.wakeMode);
  const continueCardResolved = useTrailStore((s) => s.continueCardResolved);
  const dismissContinueCard = useTrailStore((s) => s.dismissContinueCard);
  const [chooserPickedId, setChooserPickedId] = useState<string | null>(null);

  const data = getContinueCardData(trails, wakeMode, continueCardResolved);

  useEffect(() => {
    setChooserPickedId(null);
  }, [data.mode, data.trails.map((t) => t.id).join(",")]);

  // 1.8.3 — no recent Trail: card does not appear at all (silent).
  if (data.mode === "none") return null;

  if (data.mode === "chooser" && !chooserPickedId) {
    return (
      <Chrome onDismiss={dismissContinueCard}>
        <Chooser trails={data.trails} onPick={setChooserPickedId} />
      </Chrome>
    );
  }

  const trail = chooserPickedId
    ? data.trails.find((t) => t.id === chooserPickedId) ?? data.trails[0]
    : data.trails[0];

  return (
    <Chrome onDismiss={dismissContinueCard}>
      <SingleCard trail={trail} />
    </Chrome>
  );
}

function Chrome({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  // Auto-dismiss after a short idle period if untouched (1.9)
  useEffect(() => {
    const t = setTimeout(onDismiss, 20000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] flex justify-center pt-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="paper-card trail-texture w-[420px] rounded-3xl p-5"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-ink-soft">
        <WaypointIcon size={15} />
        <span className="text-xs font-medium tracking-wide uppercase">Welcome back</span>
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="rounded-full p-1 text-ink-faint hover:bg-paper-deep hover:text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function Chooser({
  trails,
  onPick,
}: {
  trails: Trail[];
  onPick: (id: string) => void;
}) {
  const dismissContinueCard = useTrailStore((s) => s.dismissContinueCard);
  return (
    <div>
      <Header onClose={dismissContinueCard} />
      <p className="mb-3 font-serif-display text-lg text-ink">Pick up where you left off</p>
      <div className="space-y-2">
        {trails.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-paper-raised px-3.5 py-2.5 text-left hover:border-accent-soft hover:bg-paper"
          >
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-faint">
                <ConfidenceDot confidence={t.confidence} size={6} />
                {confidenceLabel(t.confidence)}
              </div>
              <p className="font-medium text-ink">{t.name}</p>
            </div>
            <span className="text-xs text-ink-faint">{relativeTime(t.lastActiveAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SingleCard({ trail }: { trail: Trail }) {
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const resumeTrail = useTrailStore((s) => s.resumeTrail);
  const notATrail = useTrailStore((s) => s.notATrail);
  const confirmLowConfidence = useTrailStore((s) => s.confirmLowConfidence);
  const openSidePanel = useTrailStore((s) => s.openSidePanel);
  const dismissContinueCard = useTrailStore((s) => s.dismissContinueCard);

  const members = itemsOf(trail.id);
  const preview = members.slice(0, 4);
  const overflow = members.length - preview.length;
  const isLow = trail.confidence === "low";

  return (
    <div>
      <Header onClose={dismissContinueCard} />

      <div className="mb-3">
        <p className="font-serif-display text-2xl leading-tight text-ink">{trail.name}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <ConfidenceDot confidence={trail.confidence} size={8} />
          <span>{confidenceLabel(trail.confidence)}</span>
        </div>
      </div>

      <div className="mb-3 space-y-1.5 rounded-2xl bg-paper-deep/60 p-2.5">
        {preview.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper-raised text-ink-soft">
              <MemberTypeIcon type={m.type} size={13} />
            </span>
            <span className="truncate text-ink-soft">{m.title}</span>
          </div>
        ))}
        {overflow > 0 && (
          <p className="px-1.5 pt-0.5 text-xs text-ink-faint">+{overflow} more</p>
        )}
      </div>

      <p className="mb-4 text-xs text-ink-faint">
        Last active {relativeTime(trail.lastActiveAt)} · {members.length} items
      </p>

      {isLow ? (
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Looks right?</p>
          <div className="flex gap-2">
            <button
              onClick={() => confirmLowConfidence(trail.id)}
              className="flex-1 rounded-full bg-ink py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
            >
              Yes
            </button>
            <button
              onClick={() => notATrail(trail.id)}
              className="flex-1 rounded-full border border-line py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-deep"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => resumeTrail(trail.id)}
          className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-paper-raised hover:bg-accent-deep"
        >
          Resume
        </button>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <button
          onClick={() => {
            dismissContinueCard();
            openSidePanel();
          }}
          className="text-ink-soft hover:text-ink hover:underline"
        >
          Not this one? See all Trails
        </button>
        {!isLow && (
          <button
            onClick={() => notATrail(trail.id)}
            className="text-ink-faint hover:text-ink hover:underline"
          >
            Not a Trail
          </button>
        )}
      </div>
    </div>
  );
}
