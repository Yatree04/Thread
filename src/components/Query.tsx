import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownAZ, ArrowLeft, Clock, Plus, Search, X } from "lucide-react";
import { useTrailStore, type QueryFilter } from "../store/trailStore";
import { MemberTypeIcon, WaypointIcon } from "./icons";
import { relativeTime } from "../lib/format";
import { TrailPicker } from "./TrailPicker";
import { ContextMenu } from "./ContextMenu";
import { electronAPI, isElectron } from "../lib/electron";
import type { Trail, TrailItem } from "../types";

const C = {
  bg: "#16161b",
  raised: "#1e1e25",
  raised2: "#26262f",
  border: "#2c2c36",
  text: "#f2f2f5",
  soft: "#a7a7b3",
  faint: "#6d6d7a",
  accent: "#7dd3fc",
};

function dotColor(score: number) {
  return score >= 85 ? "#4ade80" : score >= 65 ? "#facc15" : "#5a5a66";
}

const FILTERS: { key: QueryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "idle", label: "Idle" },
  { key: "archived", label: "Archived" },
];

/**
 * Query Surface (reference: QuerySurface.tsx). Merges the old Command
 * Overlay (search-and-jump) and Side Panel (browse/filter/manage) into one
 * dark spotlight-style window: search, proactive resurfacing, all Trails,
 * recently viewed, a detail view per Trail, and the unfiled Inbox.
 */
export function Query() {
  const open = useTrailStore((s) => s.queryOpen);
  const close = useTrailStore((s) => s.closeQuery);
  const detailId = useTrailStore((s) => s.queryDetailTrailId);
  const openDetail = useTrailStore((s) => s.openQueryDetail);
  const closeDetail = useTrailStore((s) => s.closeQueryDetail);
  const trails = useTrailStore((s) => s.trails);
  const filter = useTrailStore((s) => s.queryFilter);
  const setFilter = useTrailStore((s) => s.setQueryFilter);
  const sort = useTrailStore((s) => s.querySort);
  const setSort = useTrailStore((s) => s.setQuerySort);
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const createTrail = useTrailStore((s) => s.createTrail);

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (detailId) {
      setRecentlyViewed((v) => [detailId, ...v.filter((id) => id !== detailId)].slice(0, 5));
    }
  }, [detailId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (detailId) closeDetail();
        else close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, detailId, close, closeDetail]);

  const live = useMemo(() => trails.filter((t) => !t.rejected), [trails]);
  const detailTrail = detailId ? live.find((t) => t.id === detailId) : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-6"
      style={{ background: isElectron ? "transparent" : "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isElectron) close();
      }}
    >
      <div
        className="flex h-[min(calc(100vh-3rem),700px)] w-[600px] flex-col overflow-hidden rounded-3xl shadow-2xl"
        style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
      >
        {detailTrail ? (
          <DetailView trail={detailTrail} onBack={closeDetail} onClose={close} />
        ) : (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3.5" style={{ borderColor: C.border }}>
              <WaypointIcon size={16} className="shrink-0" />
              <Search size={15} style={{ color: C.faint }} className="shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Trails, or type a name to jump in…"
                className="flex-1 bg-transparent text-[14px] outline-none"
                style={{ color: C.text }}
              />
              <button onClick={close} className="shrink-0 rounded-full p-1 hover:opacity-70" style={{ color: C.faint }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: C.border }}>
              <div className="flex gap-1 rounded-full p-0.5" style={{ background: C.raised }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      background: filter === f.key ? C.raised2 : "transparent",
                      color: filter === f.key ? C.text : C.faint,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSort(sort === "recency" ? "name" : "recency")}
                  className="rounded-full p-1.5 hover:opacity-70"
                  style={{ color: C.faint }}
                  title={sort === "recency" ? "Sorted by recency" : "Sorted by name"}
                >
                  {sort === "recency" ? <Clock size={13} /> : <ArrowDownAZ size={13} />}
                </button>
                <button
                  onClick={() => setCreating((v) => !v)}
                  className="rounded-full p-1.5 hover:opacity-70"
                  style={{ color: C.faint }}
                  title="New Trail"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>

            {creating && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newName.trim()) {
                    createTrail(newName.trim());
                    setNewName("");
                    setCreating(false);
                  }
                }}
                className="flex gap-1.5 border-b px-4 py-2.5"
                style={{ borderColor: C.border }}
              >
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name this Trail…"
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-sm outline-none"
                  style={{ background: C.raised, color: C.text, border: `1px solid ${C.border}` }}
                />
                <button type="submit" className="rounded-lg px-2.5 py-1.5 text-sm font-medium" style={{ background: C.accent, color: "#0b1220" }}>
                  Create
                </button>
              </form>
            )}

            <div className="flex-1 overflow-y-auto no-scrollbar px-2 py-2">
              <BrowseBody
                query={query}
                live={live}
                filter={filter}
                sort={sort}
                recentlyViewed={recentlyViewed}
                itemsOf={itemsOf}
                onOpen={(id) => openDetail(id)}
              />
              <InboxSection />
            </div>

            <Footer />
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pb-1.5 pt-3 text-[10px] font-medium uppercase tracking-wide" style={{ color: C.faint }}>
      {children}
    </p>
  );
}

function BrowseBody({
  query,
  live,
  filter,
  sort,
  recentlyViewed,
  itemsOf,
  onOpen,
}: {
  query: string;
  live: Trail[];
  filter: QueryFilter;
  sort: "recency" | "name";
  recentlyViewed: string[];
  itemsOf: (id: string) => TrailItem[];
  onOpen: (id: string) => void;
}) {
  if (query.trim()) {
    const q = query.toLowerCase();
    const results = live.filter((t) => t.name.toLowerCase().includes(q));
    return (
      <div>
        <SectionLabel>{results.length} match{results.length === 1 ? "" : "es"}</SectionLabel>
        {results.length === 0 ? (
          <EmptyRow text={`No Trails match "${query}"`} />
        ) : (
          results.map((t) => <TrailRow key={t.id} trail={t} query={query} memberCount={itemsOf(t.id).length} onClick={() => onOpen(t.id)} />)
        )}
      </div>
    );
  }

  let filtered = live;
  if (filter !== "all") {
    filtered = filtered.filter((t) => (filter === "active" ? t.lifecycle === "active" || t.lifecycle === "forming" : t.lifecycle === filter));
  }
  const sorted = [...filtered].sort((a, b) => (sort === "recency" ? b.lastActiveAt - a.lastActiveAt : a.name.localeCompare(b.name)));

  const resurfacing = filter === "all" ? sorted.filter((t) => t.lifecycle !== "archived").slice(0, 2) : [];
  const resurfacingIds = new Set(resurfacing.map((t) => t.id));
  const rest = sorted.filter((t) => !resurfacingIds.has(t.id));
  const recent = recentlyViewed.map((id) => live.find((t) => t.id === id)).filter((t): t is Trail => Boolean(t));

  return (
    <div>
      {live.length === 0 ? (
        <EmptyRow text="Nothing here yet. Trails builds up as you work." big />
      ) : (
        <>
          {resurfacing.length > 0 && (
            <div>
              <SectionLabel>Proactive resurfacing</SectionLabel>
              {resurfacing.map((t) => (
                <TrailRow key={t.id} trail={t} memberCount={itemsOf(t.id).length} onClick={() => onOpen(t.id)} highlight />
              ))}
            </div>
          )}
          {(rest.length > 0 || resurfacing.length === 0) && (
            <div>
              <SectionLabel>{filter === "all" ? "All Trails" : `${FILTERS.find((f) => f.key === filter)?.label} Trails`}</SectionLabel>
              {rest.length === 0 ? (
                <EmptyRow text="No Trails in this filter" />
              ) : (
                rest.map((t) => <TrailRow key={t.id} trail={t} memberCount={itemsOf(t.id).length} onClick={() => onOpen(t.id)} />)
              )}
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <SectionLabel>Recently viewed</SectionLabel>
              {recent.map((t) => (
                <TrailRow key={t.id} trail={t} memberCount={itemsOf(t.id).length} onClick={() => onOpen(t.id)} compact />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyRow({ text, big }: { text: string; big?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <WaypointIcon variant="outline" size={big ? 26 : 18} className="opacity-40" />
      <p className="text-sm" style={{ color: C.soft }}>
        {text}
      </p>
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
      <mark style={{ background: "rgba(125,211,252,0.25)", color: C.text }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function TrailRow({
  trail,
  query = "",
  memberCount,
  onClick,
  highlight: isHighlight,
  compact,
}: {
  trail: Trail;
  query?: string;
  memberCount: number;
  onClick: () => void;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 text-left hover:opacity-90"
      style={{ background: isHighlight ? C.raised : "transparent" }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: dotColor(trail.confidence) }} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium">{highlight(trail.name, query)}</p>
          {!compact && (
            <p className="text-[11px]" style={{ color: C.faint }}>
              {memberCount} items · {trail.confidence}% confidence
            </p>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[11px]" style={{ color: C.faint }}>
        {relativeTime(trail.lastActiveAt)}
      </span>
    </button>
  );
}

function InboxSection() {
  const items = useTrailStore((s) => s.items);
  const openContextMenu = useTrailStore((s) => s.openContextMenu);
  const unfiled = useMemo(() => items.filter((i) => i.trailId === null), [items]);
  if (unfiled.length === 0) return null;

  return (
    <div>
      <SectionLabel>Inbox — {unfiled.length} unfiled</SectionLabel>
      {unfiled.map((item) => (
        <button
          key={item.id}
          onContextMenu={(e) => {
            e.preventDefault();
            openContextMenu(item.id, e.clientX, e.clientY);
          }}
          onClick={(e) => openContextMenu(item.id, e.clientX, e.clientY)}
          title="Right-click for options"
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:opacity-90"
        >
          <span style={{ color: C.faint }}>
            <MemberTypeIcon type={item.type} size={13} />
          </span>
          <span className="truncate text-[12px]" style={{ color: C.soft }}>
            {item.title}
          </span>
        </button>
      ))}
      <ContextMenu dark />
    </div>
  );
}

function Footer() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  useEffect(() => {
    if (isElectron && electronAPI) electronAPI.getSettings().then((s) => setHasApiKey(s.hasApiKey));
  }, []);
  return (
    <div className="flex items-center justify-between border-t px-4 py-2.5 text-[11px]" style={{ borderColor: C.border, color: C.faint }}>
      <span>↑↓ navigate · Enter open · Esc close</span>
      {isElectron && (
        <span className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: hasApiKey ? "#4ade80" : "#5a5a66" }}
          />
          {hasApiKey ? "AI clustering active" : "tray active"}
        </span>
      )}
    </div>
  );
}

function DetailView({ trail, onBack, onClose }: { trail: Trail; onBack: () => void; onClose: () => void }) {
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const removeMember = useTrailStore((s) => s.removeMember);
  const renameTrail = useTrailStore((s) => s.renameTrail);
  const archiveTrail = useTrailStore((s) => s.archiveTrail);
  const resumeTrail = useTrailStore((s) => s.resumeTrail);
  const startMerge = useTrailStore((s) => s.startMerge);
  const completeMerge = useTrailStore((s) => s.completeMerge);
  const cancelMerge = useTrailStore((s) => s.cancelMerge);
  const pendingMerge = useTrailStore((s) => s.pendingMerge);
  const trails = useTrailStore((s) => s.trails);
  const members = itemsOf(trail.id);

  const [name, setName] = useState(trail.name);
  const [summary, setSummary] = useState("Loading…");
  const [noteText, setNoteText] = useState("");
  const quickCapture = useTrailStore((s) => s.quickCapture);
  const moveMember = useTrailStore((s) => s.moveMember);

  useEffect(() => setName(trail.name), [trail.id, trail.name]);

  useEffect(() => {
    let cancelled = false;
    setSummary("Loading…");
    (async () => {
      if (isElectron && electronAPI) {
        const res = await electronAPI.getContextSummary(trail.id);
        if (!cancelled) setSummary(res.text);
        return;
      }
      if (members.length === 0) {
        setSummary(`No items captured yet in "${trail.name}".`);
      } else {
        const last = members[members.length - 1];
        setSummary(`${members.length} items captured in "${trail.name}". Most recent: "${last.title}", ${relativeTime(last.addedAt)}.`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trail.id]);

  const mergeTargets = trails.filter((t) => !t.rejected && t.id !== trail.id);

  async function addQuickNote() {
    if (!noteText.trim()) return;
    const result = await quickCapture({ text: noteText.trim() });
    moveMember(result.itemId, trail.id);
    setNoteText("");
  }

  return (
    <div className="flex max-h-[90vh] flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3.5" style={{ borderColor: C.border }}>
        <button onClick={onBack} className="rounded-full p-1 hover:opacity-70" style={{ color: C.faint }}>
          <ArrowLeft size={16} />
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== trail.name && renameTrail(trail.id, name.trim())}
          className="flex-1 bg-transparent text-[15px] font-medium outline-none"
          style={{ color: C.text }}
        />
        <button onClick={onClose} className="rounded-full p-1 hover:opacity-70" style={{ color: C.faint }}>
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="mb-3 flex items-center gap-2 text-[12px]" style={{ color: C.soft }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: dotColor(trail.confidence) }} />
          {trail.confidence}% confidence · {members.length} items · {relativeTime(trail.lastActiveAt)}
        </div>

        <div className="mb-4 rounded-2xl p-3" style={{ background: C.raised }}>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{ color: C.faint }}>
            Context
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: C.soft }}>
            {summary}
          </p>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => resumeTrail(trail.id)}
            className="flex-1 rounded-xl py-2 text-[12px] font-semibold"
            style={{ background: C.accent, color: "#0b1220" }}
          >
            Revive workspace
          </button>
          <button
            onClick={() => archiveTrail(trail.id)}
            className="flex-1 rounded-xl py-2 text-[12px] font-medium"
            style={{ border: `1px solid ${C.border}`, color: C.soft }}
          >
            Archive
          </button>
          <button
            onClick={() => startMerge(trail.id)}
            className="flex-1 rounded-xl py-2 text-[12px] font-medium"
            style={{ border: `1px solid ${C.border}`, color: C.soft }}
          >
            Merge…
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addQuickNote();
          }}
          className="mb-4 flex gap-1.5"
        >
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a quick note to this Trail…"
            className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            style={{ background: C.raised, color: C.text, border: `1px solid ${C.border}` }}
          />
          <button type="submit" className="rounded-lg px-2.5 py-1.5 text-xs font-medium" style={{ background: C.accent, color: "#0b1220" }}>
            Add
          </button>
        </form>

        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: C.faint }}>
          Items
        </p>
        <div className="space-y-1">
          {members.length === 0 && (
            <p className="py-3 text-xs" style={{ color: C.faint }}>
              No items in this Trail.
            </p>
          )}
          {members.map((m) => (
            <div key={m.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: C.raised }}>
              <span style={{ color: C.faint }}>
                <MemberTypeIcon type={m.type} size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">{m.title}</p>
                <p className="truncate text-[10px]" style={{ color: C.faint }}>
                  {m.evidence}
                </p>
              </div>
              <button
                onClick={() => removeMember(m.id)}
                className="shrink-0 rounded-full p-1 opacity-0 group-hover:opacity-100 hover:opacity-70"
                style={{ color: C.faint }}
                aria-label="Remove from Trail"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {pendingMerge?.sourceId === trail.id && (
        <TrailPicker
          dark
          title={`Merge "${trail.name}" into…`}
          trails={mergeTargets}
          onPick={completeMerge}
          onClose={cancelMerge}
        />
      )}
    </div>
  );
}
