import { useEffect, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { getContinueCardData } from "../store/selectors";
import { ConfidenceDot, MemberTypeIcon } from "./icons";
import { relativeTime } from "../lib/format";
import { computeStreak, describeStreak } from "../lib/streak";
import { electronAPI, isElectron } from "../lib/electron";
import type { Trail } from "../types";

/**
 * Surface 0/1 — Widget + Continue Card, merged. Glance card for "what was I
 * doing": the real wake-triggered continuity popup (real 7-day streak,
 * low-confidence confirm, multi-trail chooser), a row of the Trail's items
 * you can tap to focus the AI context blurb on, and two actions — Revive
 * workspace and capture.
 */
export function Widget() {
  const trails = useTrailStore((s) => s.trails);
  const allItems = useTrailStore((s) => s.items);
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const wakeMode = useTrailStore((s) => s.wakeMode);
  const continueCardResolved = useTrailStore((s) => s.continueCardResolved);
  const dismissContinueCard = useTrailStore((s) => s.dismissContinueCard);
  const resumeTrail = useTrailStore((s) => s.resumeTrail);
  const notATrail = useTrailStore((s) => s.notATrail);
  const confirmLowConfidence = useTrailStore((s) => s.confirmLowConfidence);
  const expandCapture = useTrailStore((s) => s.expandCapture);

  const [contextExpanded, setContextExpanded] = useState(false);
  const [revived, setRevived] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [popupCollapsed, setPopupCollapsed] = useState(false);

  const live = trails.filter((t) => !t.rejected && t.lifecycle !== "archived");
  const continueData = useMemo(
    () => getContinueCardData(trails, wakeMode, continueCardResolved),
    [trails, wakeMode, continueCardResolved]
  );
  const wakeActive = continueData.mode !== "none";

  useEffect(() => {
    setPickedId(null);
    setPopupCollapsed(false);
    setFocusedIdx(null);
  }, [continueData.mode, continueData.trails.map((t) => t.id).join(",")]);

  const mostRecent = [...live].sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  const wakeTrail = pickedId
    ? continueData.trails.find((t) => t.id === pickedId) ?? continueData.trails[0]
    : continueData.trails[0];

  const currentTrail: Trail | undefined = wakeActive && !continueCardResolved ? wakeTrail : mostRecent;

  const showPopup = wakeActive && !continueCardResolved && !popupCollapsed;
  const showChooser = continueData.mode === "chooser" && !pickedId && !continueCardResolved;
  const isLow = currentTrail ? currentTrail.confidence < 65 && wakeActive && !continueCardResolved : false;

  const streak = currentTrail ? computeStreak(allItems, currentTrail.id) : [];

  const handleCapture = () => (isElectron ? electronAPI!.expandCapture() : expandCapture());

  const handleRevive = () => {
    if (!currentTrail) return;
    setRevived(true);
    resumeTrail(currentTrail.id);
    setTimeout(() => setRevived(false), 2200);
  };

  return (
    <div className="flex h-full flex-col items-center gap-2 p-2.5">
      {showChooser ? (
        <Chooser trails={continueData.trails} onPick={setPickedId} onDismiss={dismissContinueCard} />
      ) : !currentTrail ? (
        <div className="paper-card trail-texture w-full rounded-3xl p-5 text-center">
          <p className="text-sm text-ink-soft">You're all caught up.</p>
          <p className="text-xs text-ink-faint">No active Trail right now.</p>
        </div>
      ) : (
        <>
          {showPopup && (
            <div className="paper-card trail-texture relative w-full rounded-2xl px-4 pt-6 pb-3">
              <div className="absolute left-1/2 -top-3 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-paper-raised bg-paper-deep shadow-sm" />
              <p className="mb-2 text-center text-[12px] leading-snug text-ink-soft">
                <span className="font-semibold text-ink">"{currentTrail.name}"</span> has been active{" "}
                {describeStreak(streak)}
              </p>
              <div className="mb-2 flex items-center justify-between">
                {streak.map((day, i) => (
                  <div
                    key={i}
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                      day.active ? "bg-accent-soft text-accent-deep" : "border border-line text-ink-faint"
                    }`}
                  >
                    {day.label}
                  </div>
                ))}
              </div>
              {isLow ? (
                <div>
                  <p className="mb-1 text-center text-[11px] font-medium text-ink">Looks right?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => confirmLowConfidence(currentTrail.id)}
                      className="flex-1 rounded-xl bg-ink py-1.5 text-[11px] font-semibold text-paper hover:bg-ink/90"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => notATrail(currentTrail.id)}
                      className="flex-1 rounded-xl border border-line py-1.5 text-[11px] font-semibold text-ink-soft hover:bg-paper-deep"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setContextExpanded(true)}
                  className="w-full rounded-xl bg-accent-soft py-1.5 text-[11px] font-semibold text-accent-deep hover:brightness-95"
                >
                  View context
                </button>
              )}
              <button
                onClick={() => setPopupCollapsed(true)}
                className="absolute bottom-1.5 right-3 text-ink-faint hover:text-ink"
                aria-label="Collapse"
              >
                <ChevronDown size={12} />
              </button>
            </div>
          )}

          <div className="paper-card trail-texture w-full flex-1 overflow-y-auto no-scrollbar rounded-2xl">
            <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-1">
              <div className="min-w-0">
                <h2 className="font-serif-display text-[15px] leading-tight text-ink">Where you left off…</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-faint">
                  Trail since {new Date(currentTrail.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  <ConfidenceDot confidence={currentTrail.confidence} size={5} />
                  {currentTrail.confidence}%
                </p>
              </div>
              <button
                onClick={() => (isElectron ? electronAPI!.requestOpenSettings() : undefined)}
                className="h-7 w-7 shrink-0 rounded-full border border-line bg-paper-deep/60 hover:border-accent-soft"
                aria-label="Settings"
                title="Settings"
              />
            </div>

            <div className="relative px-3.5 pb-1.5 pt-1.5">
              <div className="flex gap-1.5 overflow-x-auto pr-6 no-scrollbar">
                <button
                  onClick={() => setFocusedIdx(null)}
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-medium ${
                    focusedIdx === null ? "bg-ink text-paper" : "border border-line bg-paper-deep/50 text-ink-soft"
                  }`}
                >
                  All
                </button>
                {itemsOf(currentTrail.id).map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setFocusedIdx(i === focusedIdx ? null : i)}
                    className={`flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 ${
                      focusedIdx === i ? "bg-ink text-paper" : "border border-line bg-paper-deep/50 text-ink-soft"
                    }`}
                  >
                    <MemberTypeIcon type={item.type} size={10} className={focusedIdx === i ? "text-paper" : "text-ink-faint"} />
                    <span className="whitespace-nowrap text-[10px] font-medium">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center pb-1">
              <button
                onClick={() => setContextExpanded((v) => !v)}
                className="text-ink-faint hover:text-ink"
                aria-label={contextExpanded ? "Hide context" : "Show context"}
              >
                <ChevronDown size={13} className={`transition-transform ${contextExpanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {contextExpanded && (
              <ContextualiseBody trail={currentTrail} focusedIdx={focusedIdx} />
            )}

            <div className="px-2.5 pb-2 pt-1">
              <div className="flex gap-1.5">
                <button
                  onClick={handleRevive}
                  className="flex-1 rounded-lg bg-ink py-1.5 text-[11px] font-medium text-paper hover:bg-ink/90"
                >
                  {revived ? "Reviving…" : "Revive workspace"}
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-1 rounded-lg border border-line py-1.5 text-[11px] font-medium text-ink-soft hover:bg-paper-deep"
                >
                  capture
                </button>
              </div>
              <button
                onClick={() => notATrail(currentTrail.id)}
                className="mt-1.5 w-full text-center text-[10px] text-ink-faint hover:text-ink hover:underline"
              >
                Not this trail?
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Chooser({
  trails,
  onPick,
  onDismiss,
}: {
  trails: Trail[];
  onPick: (id: string) => void;
  onDismiss: () => void;
}) {
  return (
    <div className="paper-card trail-texture w-full rounded-3xl p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-serif-display text-base text-ink">Pick up where you left off</p>
        <button onClick={onDismiss} className="rounded-full p-1 text-ink-faint hover:bg-paper-deep hover:text-ink">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-1.5">
        {trails.map((t) => (
          <button
            key={t.id}
            onClick={() => onPick(t.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-paper-raised px-3 py-2 text-left hover:border-accent-soft"
          >
            <div className="flex items-center gap-2">
              <ConfidenceDot confidence={t.confidence} size={6} />
              <span className="text-xs font-medium text-ink">{t.name}</span>
            </div>
            <span className="text-[10px] text-ink-faint">{relativeTime(t.lastActiveAt)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The AI (or honestly-derived) context blurb, shown under the item tabs
 * once expanded — focused on whichever tab (item) is selected, or the whole
 * Trail when "All" is selected. */
function ContextualiseBody({ trail, focusedIdx }: { trail: Trail; focusedIdx: number | null }) {
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const items = itemsOf(trail.id);
  const focusItem = focusedIdx !== null ? items[focusedIdx] : undefined;
  const [summary, setSummary] = useState<string>("Loading…");

  useEffect(() => {
    let cancelled = false;
    setSummary("Loading…");
    (async () => {
      if (isElectron && electronAPI) {
        const res = await electronAPI.getContextSummary(trail.id, focusItem?.id);
        if (!cancelled) setSummary(res.text);
        return;
      }
      // Browser demo: no real backend AI — an honest summary built from real local data.
      if (focusItem) {
        setSummary(`"${focusItem.title}" was added ${relativeTime(focusItem.addedAt)}. ${items.length} items total in "${trail.name}".`);
      } else if (items.length === 0) {
        setSummary(`No items captured yet in "${trail.name}".`);
      } else {
        const last = items[items.length - 1];
        setSummary(`${items.length} items captured in "${trail.name}". Most recent: "${last.title}", ${relativeTime(last.addedAt)}.`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trail.id, focusItem?.id]);

  return (
    <div className="px-3.5 pb-2">
      <p className="text-[11px] leading-relaxed text-ink-soft">{summary}</p>
    </div>
  );
}
