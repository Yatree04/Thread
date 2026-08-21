import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Settings, X } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { getContinueCardData } from "../store/selectors";
import { ConfidenceDot, MemberTypeIcon, WaypointIcon } from "./icons";
import { relativeTime } from "../lib/format";
import { computeStreak, describeStreak } from "../lib/streak";
import { electronAPI, isElectron } from "../lib/electron";
import type { Trail } from "../types";

/**
 * Surface 0/1 — Widget + Continue Card, merged (reference: Widget.tsx). Glance
 * card for "what was I doing", the real wake-triggered continuity popup (with
 * a real 7-day streak and the low-confidence/multi-trail chooser variants),
 * an inline trail switcher, and Revive/Contextualise modes.
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
  const openQuery = useTrailStore((s) => s.openQuery);
  const openCapture = useTrailStore((s) => s.openCapture);

  const [mode, setMode] = useState<"revive" | "contextualise">("revive");
  const [revived, setRevived] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [popupCollapsed, setPopupCollapsed] = useState(false);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [showTrailPicker, setShowTrailPicker] = useState(false);

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

  const currentTrail: Trail | undefined =
    (selectedTrailId && live.find((t) => t.id === selectedTrailId)) ||
    (wakeActive && !continueCardResolved ? wakeTrail : mostRecent);

  const showPopup = wakeActive && !continueCardResolved && !popupCollapsed && !selectedTrailId;
  const showChooser = continueData.mode === "chooser" && !pickedId && !continueCardResolved;
  const isLow = currentTrail ? currentTrail.confidence < 65 && wakeActive && !continueCardResolved : false;

  const memberCount = currentTrail ? itemsOf(currentTrail.id).length : 0;
  const streak = currentTrail ? computeStreak(allItems, currentTrail.id) : [];

  // Query has exactly one entry point by design — the real Win+K global
  // hotkey — so "See all Trails" below is the only in-app link to it, kept
  // as a contextual deep-link rather than a redundant "open search" button.
  const goQuery = (trailId?: string) => (isElectron ? electronAPI!.requestOpenQuery(trailId) : openQuery(trailId));

  const handleRevive = () => {
    if (!currentTrail) return;
    setRevived(true);
    resumeTrail(currentTrail.id);
    setTimeout(() => setRevived(false), 2200);
  };

  return (
    <div className="flex h-full flex-col items-center gap-2 p-2.5">
      <div className="flex w-full items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-ink-soft">
          <WaypointIcon size={13} />
          <span className="text-[11px] font-medium tracking-wide uppercase">Trails</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => (isElectron ? electronAPI!.requestOpenCapture() : openCapture())}
            className="rounded-full p-1 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="Quick capture"
            title="Quick capture"
          >
            <span className="block text-[14px] leading-none">+</span>
          </button>
          <button
            onClick={() => (isElectron ? electronAPI!.requestOpenSettings() : undefined)}
            className="rounded-full p-1 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

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
                  onClick={() => setMode("contextualise")}
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
            <div className="px-3.5 pt-3 pb-2">
              <h2 className="font-serif-display text-[15px] leading-tight text-ink">Where you left off…</h2>
            </div>

            <div className="px-3.5 pb-2">
              <button
                onClick={() => setShowTrailPicker((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper-deep/50 px-2.5 py-1.5 text-left"
              >
                <ConfidenceDot confidence={currentTrail.confidence} size={6} />
                <span className="flex-1 truncate text-[11px] font-medium text-ink">{currentTrail.name}</span>
                <ChevronDown size={12} className={`text-ink-faint transition-transform ${showTrailPicker ? "rotate-180" : ""}`} />
              </button>
              {showTrailPicker && (
                <div className="mt-1.5 max-h-40 overflow-y-auto no-scrollbar rounded-2xl border border-line bg-paper-raised">
                  {live.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTrailId(t.id);
                        setShowTrailPicker(false);
                        setFocusedIdx(null);
                      }}
                      className={`flex w-full items-center gap-2 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-paper-deep ${
                        t.id === currentTrail.id ? "bg-paper-deep/60" : ""
                      }`}
                    >
                      <ConfidenceDot confidence={t.confidence} size={6} />
                      <span className="flex-1 truncate text-xs text-ink">{t.name}</span>
                      <span className="font-mono text-[10px] text-ink-faint">{t.confidence}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {mode === "revive" ? (
              <div className="relative px-3.5 pb-2">
                <div className="flex gap-1.5 overflow-x-auto pr-6 no-scrollbar">
                  {itemsOf(currentTrail.id).map((item) => (
                    <div
                      key={item.id}
                      className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-paper-deep/50 px-2 py-1"
                    >
                      <MemberTypeIcon type={item.type} size={10} className="text-ink-faint" />
                      <span className="whitespace-nowrap text-[10px] font-medium text-ink-soft">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ContextualiseBody trail={currentTrail} focusedIdx={focusedIdx} onFocus={setFocusedIdx} />
            )}

            <div className="flex items-center gap-2 px-3.5 pb-2 text-[10px] text-ink-faint">
              <span>
                <span className="font-mono text-ink-soft">{memberCount}</span> items
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <ConfidenceDot confidence={currentTrail.confidence} size={6} />
                {currentTrail.confidence}%
              </span>
            </div>

            <div className="px-2.5 pb-2">
              <div className="flex rounded-xl bg-paper-deep/60 p-1">
                <button
                  onClick={handleRevive}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                    mode === "revive" ? "bg-ink text-paper shadow" : "text-ink-faint"
                  }`}
                >
                  {revived ? "Reviving…" : "Revive"}
                </button>
                <button
                  onClick={() => setMode("contextualise")}
                  className={`flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all ${
                    mode === "contextualise" ? "bg-ink text-paper shadow" : "text-ink-faint"
                  }`}
                >
                  Contextualise
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-3.5 pb-2.5 text-[10px]">
              <button onClick={() => goQuery()} className="text-ink-soft hover:text-ink hover:underline">
                See all Trails
              </button>
              <button onClick={() => notATrail(currentTrail.id)} className="text-ink-faint hover:text-ink hover:underline">
                Not a Trail
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

function ContextualiseBody({
  trail,
  focusedIdx,
  onFocus,
}: {
  trail: Trail;
  focusedIdx: number | null;
  onFocus: (i: number | null) => void;
}) {
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
    <div className="px-4 pb-3">
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        <button
          onClick={() => onFocus(null)}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            focusedIdx === null ? "bg-ink text-paper" : "bg-paper-deep text-ink-faint"
          }`}
        >
          All
        </button>
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => onFocus(i === focusedIdx ? null : i)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              focusedIdx === i ? "bg-ink text-paper" : "bg-paper-deep text-ink-faint"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-ink-soft">{summary}</p>
    </div>
  );
}
