import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { ConfidenceDot, WaypointIcon } from "./icons";
import { TrailPicker } from "./TrailPicker";

/** Surface 4 — Right-click Context Menu. Answers "What does this one thing belong to?" */
export function ContextMenu() {
  const contextMenu = useTrailStore((s) => s.contextMenu);
  const close = useTrailStore((s) => s.closeContextMenu);
  const items = useTrailStore((s) => s.items);
  const trails = useTrailStore((s) => s.trails);
  const openSidePanel = useTrailStore((s) => s.openSidePanel);
  const removeMember = useTrailStore((s) => s.removeMember);
  const moveMember = useTrailStore((s) => s.moveMember);
  const showToast = useTrailStore((s) => s.showToast);

  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [contextMenu, close]);

  useEffect(() => {
    setSubmenuOpen(false);
    setMovePickerOpen(false);
    setCreatingNew(false);
    setNewName("");
  }, [contextMenu?.itemId]);

  if (!contextMenu) return null;

  const item = items.find((i) => i.id === contextMenu.itemId);
  if (!item) return null;

  const trail = item.trailId ? trails.find((t) => t.id === item.trailId) : null;
  const recentTrails = trails
    .filter((t) => !t.rejected && t.id !== item.trailId)
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
    .slice(0, 5);

  const left = Math.min(contextMenu.x, window.innerWidth - 280);
  const top = Math.min(contextMenu.y, window.innerHeight - 260);

  return (
    <>
      <div
        ref={ref}
        style={{ left, top }}
        className="fixed z-[100] w-60 rounded-xl border border-line bg-paper-raised py-1.5 shadow-2xl"
      >
        <MenuItem disabled label="Copy" />
        <MenuItem disabled label="Rename" />
        <MenuItem disabled label="Move to Trash" />
        <div className="my-1 border-t border-line" />

        {trail ? (
          <div className="relative">
            <button
              onMouseEnter={() => setSubmenuOpen(true)}
              onClick={() => setSubmenuOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-paper-deep"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="relative flex items-center">
                  <WaypointIcon size={13} />
                  <ConfidenceDot
                    confidence={trail.confidence}
                    size={6}
                    className="absolute -bottom-0.5 -right-0.5 ring-2 ring-paper-raised"
                  />
                </span>
                <span className="truncate">Part of '{trail.name}'</span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-ink-faint" />
            </button>

            {submenuOpen && (
              <div
                onMouseLeave={() => setSubmenuOpen(false)}
                className="absolute left-full top-0 ml-1 w-56 rounded-xl border border-line bg-paper-raised py-1.5 shadow-2xl"
              >
                <MenuItem
                  label="Open Trail"
                  onClick={() => {
                    openSidePanel(trail.id);
                    close();
                  }}
                />
                <MenuItem
                  label="Remove from this Trail"
                  onClick={() => {
                    removeMember(item.id);
                    showToast(`Removed from "${trail.name}"`);
                    close();
                  }}
                />
                <MenuItem label="Move to another Trail…" onClick={() => setMovePickerOpen(true)} />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              onMouseEnter={() => setSubmenuOpen(true)}
              onClick={() => setSubmenuOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-paper-deep"
            >
              <span className="flex items-center gap-2 truncate">
                <WaypointIcon variant="outline" size={13} />
                <span>Add to a Trail</span>
              </span>
              <ChevronRight size={14} className="shrink-0 text-ink-faint" />
            </button>

            {submenuOpen && (
              <div
                onMouseLeave={() => setSubmenuOpen(false)}
                className="absolute left-full top-0 ml-1 w-60 rounded-xl border border-line bg-paper-raised py-1.5 shadow-2xl"
              >
                {recentTrails.length === 0 && !creatingNew && (
                  <p className="px-3 py-1.5 text-xs text-ink-faint">No Trails yet.</p>
                )}
                {recentTrails.map((t) => (
                  <MenuItem
                    key={t.id}
                    label={t.name}
                    dot={t.confidence}
                    onClick={() => {
                      moveMember(item.id, t.id);
                      close();
                    }}
                  />
                ))}
                <div className="my-1 border-t border-line" />
                {creatingNew ? (
                  <form
                    className="flex gap-1 px-2 py-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newName.trim()) return;
                      const id = useTrailStore.getState().createTrail(newName.trim(), [item.id]);
                      showToast(`Added to "${useTrailStore.getState().trails.find((t) => t.id === id)?.name}"`);
                      close();
                    }}
                  >
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Trail name…"
                      className="flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-paper-raised hover:bg-accent-deep"
                    >
                      Add
                    </button>
                  </form>
                ) : (
                  <MenuItem label="New Trail…" accent onClick={() => setCreatingNew(true)} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {movePickerOpen && (
        <TrailPicker
          title={`Move "${item.title}" to…`}
          trails={recentTrails}
          onPick={(id) => {
            moveMember(item.id, id);
            setMovePickerOpen(false);
            close();
          }}
          onClose={() => setMovePickerOpen(false)}
        />
      )}
    </>
  );
}

function MenuItem({
  label,
  onClick,
  disabled,
  accent,
  dot,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: boolean;
  dot?: "high" | "medium" | "low";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
        disabled
          ? "cursor-default text-ink-faint/70"
          : accent
          ? "text-accent-deep hover:bg-paper-deep"
          : "text-ink hover:bg-paper-deep"
      }`}
    >
      {dot && <ConfidenceDot confidence={dot} size={6} />}
      <span className="truncate">{label}</span>
    </button>
  );
}
