import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  PanelRightClose,
  Search,
  X,
} from "lucide-react";
import { useTrailStore, type SidePanelFilter } from "../store/trailStore";
import { ConfidenceDot, MemberTypeIcon, WaypointIcon } from "./icons";
import { lifecycleLabel, relativeTime } from "../lib/format";
import { TrailPicker } from "./TrailPicker";
import type { Trail, TrailItem } from "../types";

const FILTERS: { key: SidePanelFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "idle", label: "Idle" },
  { key: "archived", label: "Archived" },
];

/** Surface 3 — Side Panel. Answers "Show me everything I have going on." */
export function SidePanel() {
  const open = useTrailStore((s) => s.sidePanelOpen);
  const close = useTrailStore((s) => s.closeSidePanel);
  const trails = useTrailStore((s) => s.trails);
  const filter = useTrailStore((s) => s.sidePanelFilter);
  const setFilter = useTrailStore((s) => s.setSidePanelFilter);
  const sort = useTrailStore((s) => s.sidePanelSort);
  const setSort = useTrailStore((s) => s.setSidePanelSort);
  const createTrail = useTrailStore((s) => s.createTrail);

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const visible = useMemo(() => {
    let list = trails.filter((t) => !t.rejected);
    if (filter !== "all") {
      list = list.filter((t) =>
        filter === "active" ? t.lifecycle === "active" || t.lifecycle === "forming" : t.lifecycle === filter
      );
    }
    if (search.trim()) {
      list = list.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    }
    return [...list].sort((a, b) =>
      sort === "recency" ? b.lastActiveAt - a.lastActiveAt : a.name.localeCompare(b.name)
    );
  }, [trails, filter, search, sort]);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[60] flex w-[380px] flex-col border-l border-line bg-paper shadow-2xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <div className="flex items-center gap-2">
          <WaypointIcon size={17} />
          <h2 className="font-serif-display text-lg text-ink">Trails</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCreating((v) => !v)}
            className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="New Trail"
            title="New Trail"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={close}
            className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="Collapse panel"
            title="Collapse"
          >
            <PanelRightClose size={16} />
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
          className="flex gap-1.5 border-b border-line px-4 py-3"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name this Trail…"
            className="flex-1 rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-2.5 py-1.5 text-sm font-medium text-paper-raised hover:bg-accent-deep"
          >
            Create
          </button>
        </form>
      )}

      <div className="border-b border-line px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-full bg-paper-deep p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === f.key ? "bg-paper-raised text-ink shadow-sm" : "text-ink-faint hover:text-ink-soft"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              aria-label="Search within Trails"
              title="Search within"
            >
              <Search size={14} />
            </button>
            <button
              onClick={() => setSort(sort === "recency" ? "name" : "recency")}
              className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              aria-label="Toggle sort"
              title={sort === "recency" ? "Sorted by recency" : "Sorted by name"}
            >
              {sort === "recency" ? <Clock size={14} /> : <ArrowDownAZ size={14} />}
            </button>
          </div>
        </div>
        {searchOpen && (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter visible Trails…"
            className="mt-2 w-full rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2">
        {trails.filter((t) => !t.rejected).length === 0 ? (
          <EmptyState
            icon
            text="Nothing here yet. Trails builds up as you work."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            text={`No ${filter === "all" ? "" : FILTERS.find((f) => f.key === filter)?.label + " "}Trails right now`}
          />
        ) : (
          <ul className="space-y-2 py-1">
            {visible.map((t) => (
              <TrailRow key={t.id} trail={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <WaypointIcon variant="outline" size={icon ? 30 : 22} className="text-ink-faint" />
      <p className="text-sm text-ink-soft">{text}</p>
    </div>
  );
}

function TrailRow({ trail }: { trail: Trail }) {
  const expandedTrailId = useTrailStore((s) => s.expandedTrailId);
  const toggleExpanded = useTrailStore((s) => s.toggleExpanded);
  const itemsOf = useTrailStore((s) => s.itemsOf);
  const expanded = expandedTrailId === trail.id;
  const members = itemsOf(trail.id);

  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-paper-raised">
      <button
        onClick={() => toggleExpanded(trail.id)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
      >
        <ConfidenceDot confidence={trail.confidence} size={7} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{trail.name}</p>
          <p className="text-xs text-ink-faint">
            {lifecycleLabel(trail.lifecycle)} · {members.length} items
          </p>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-ink-faint" />
        ) : (
          <ChevronRight size={16} className="text-ink-faint" />
        )}
      </button>
      {expanded && <ExpandedTrail trail={trail} members={members} />}
    </li>
  );
}

function ExpandedTrail({
  trail,
  members,
}: {
  trail: Trail;
  members: TrailItem[];
}) {
  const renameTrail = useTrailStore((s) => s.renameTrail);
  const archiveTrail = useTrailStore((s) => s.archiveTrail);
  const removeMember = useTrailStore((s) => s.removeMember);
  const startMerge = useTrailStore((s) => s.startMerge);
  const completeMerge = useTrailStore((s) => s.completeMerge);
  const cancelMerge = useTrailStore((s) => s.cancelMerge);
  const pendingMerge = useTrailStore((s) => s.pendingMerge);
  const trails = useTrailStore((s) => s.trails);
  const [name, setName] = useState(trail.name);

  const mergeTargets = trails.filter((t) => !t.rejected && t.id !== trail.id);

  return (
    <div className="border-t border-line px-3.5 py-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== trail.name && renameTrail(trail.id, name.trim())}
        className="mb-2.5 w-full rounded-lg border border-transparent bg-transparent px-1 py-1 text-sm font-medium text-ink hover:border-line focus:border-accent focus:bg-paper focus:outline-none"
      />

      <div className="mb-3 space-y-1">
        {members.length === 0 && (
          <p className="py-2 text-xs text-ink-faint">No items in this Trail.</p>
        )}
        {members.map((m) => (
          <div
            key={m.id}
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-paper-deep/60"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper-deep text-ink-soft">
              <MemberTypeIcon type={m.type} size={12} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ink">{m.title}</p>
              <p className="truncate text-[11px] text-ink-faint">{m.evidence}</p>
            </div>
            <button
              onClick={() => removeMember(m.id)}
              className="shrink-0 rounded-full p-1 text-ink-faint opacity-0 group-hover:opacity-100 hover:bg-paper-raised hover:text-ink"
              aria-label="Remove from Trail"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => archiveTrail(trail.id)}
          className="flex-1 rounded-full border border-line py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-deep"
        >
          Archive Trail
        </button>
        <button
          onClick={() => startMerge(trail.id)}
          className="flex-1 rounded-full border border-line py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-deep"
        >
          Merge with another Trail
        </button>
      </div>

      {pendingMerge?.sourceId === trail.id && (
        <TrailPicker
          title={`Merge "${trail.name}" into…`}
          trails={mergeTargets}
          onPick={completeMerge}
          onClose={cancelMerge}
        />
      )}
    </div>
  );
}
