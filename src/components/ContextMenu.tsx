import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { ConfidenceDot, WaypointIcon } from "./icons";
import { TrailPicker } from "./TrailPicker";

const DARK = {
  bg: "#1e1e25",
  bgHover: "#26262f",
  border: "#2c2c36",
  text: "#f2f2f5",
  faint: "#8b8b97",
  accent: "#7dd3fc",
};

/** Surface 4 — Right-click Context Menu. Answers "What does this one thing belong to?"
 * `dark` renders it for the Query Surface's dark theme instead of the paper theme. */
export function ContextMenu({ dark = false }: { dark?: boolean } = {}) {
  const contextMenu = useTrailStore((s) => s.contextMenu);
  const close = useTrailStore((s) => s.closeContextMenu);
  const items = useTrailStore((s) => s.items);
  const trails = useTrailStore((s) => s.trails);
  const openQuery = useTrailStore((s) => s.openQuery);
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

  const MENU_WIDTH = 240;
  const SUBMENU_WIDTH = 240;
  const GAP = 4;
  const left = Math.min(contextMenu.x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(contextMenu.y, window.innerHeight - 260);
  // Position the submenu in absolute viewport space (not a CSS left-full/
  // right-full flip) so it's always fully on-screen — including inside the
  // desktop app's own narrow Query window, narrower than menu+submenu.
  let submenuLeft = left + MENU_WIDTH + GAP;
  if (submenuLeft + SUBMENU_WIDTH > window.innerWidth - 8) {
    submenuLeft = left - SUBMENU_WIDTH - GAP;
  }
  submenuLeft = Math.max(8, Math.min(submenuLeft, window.innerWidth - SUBMENU_WIDTH - 8));
  const submenuOffset = submenuLeft - left; // relative to the menu's own left edge

  const menuBoxProps = dark
    ? { style: { background: DARK.bg, borderColor: DARK.border, color: DARK.text } }
    : {};
  const menuBoxClass = `w-60 rounded-xl border py-1.5 shadow-2xl ${dark ? "" : "border-line bg-paper-raised"}`;
  const rowClass = `flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
    dark ? "" : "text-ink hover:bg-paper-deep"
  }`;
  const rowProps = dark
    ? {
        style: { color: DARK.text },
        onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = DARK.bgHover),
        onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = "transparent"),
      }
    : {};

  return (
    <>
      <div
        ref={ref}
        style={{ left, top, ...(menuBoxProps.style || {}) }}
        className={`fixed z-[100] ${menuBoxClass}`}
      >
        <MenuItem dark={dark} disabled label="Copy" />
        <MenuItem dark={dark} disabled label="Rename" />
        <MenuItem dark={dark} disabled label="Move to Trash" />
        <div className="my-1 border-t" style={dark ? { borderColor: DARK.border } : undefined} />

        {trail ? (
          <div className="relative">
            <button onMouseEnter={() => setSubmenuOpen(true)} onClick={() => setSubmenuOpen((v) => !v)} className={rowClass} {...rowProps}>
              <span className="flex items-center gap-2 truncate">
                <span className="relative flex items-center">
                  <WaypointIcon size={13} />
                  <ConfidenceDot
                    confidence={trail.confidence}
                    size={6}
                    className="absolute -bottom-0.5 -right-0.5 ring-2"
                    style={dark ? { boxShadow: `0 0 0 2px ${DARK.bg}` } : undefined}
                  />
                </span>
                <span className="truncate">Part of '{trail.name}'</span>
              </span>
              <ChevronRight size={14} className="shrink-0" style={dark ? { color: DARK.faint } : undefined} />
            </button>

            {submenuOpen && (
              <div
                onMouseLeave={() => setSubmenuOpen(false)}
                style={{ left: submenuOffset, ...(menuBoxProps.style || {}) }}
                className={`absolute top-0 ${menuBoxClass.replace("w-60", "w-56")}`}
              >
                <MenuItem
                  dark={dark}
                  label="Open Trail"
                  onClick={() => {
                    openQuery(trail.id);
                    close();
                  }}
                />
                <MenuItem
                  dark={dark}
                  label="Remove from this Trail"
                  onClick={() => {
                    removeMember(item.id);
                    showToast(`Removed from "${trail.name}"`);
                    close();
                  }}
                />
                <MenuItem dark={dark} label="Move to another Trail…" onClick={() => setMovePickerOpen(true)} />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <button onMouseEnter={() => setSubmenuOpen(true)} onClick={() => setSubmenuOpen((v) => !v)} className={rowClass} {...rowProps}>
              <span className="flex items-center gap-2 truncate">
                <WaypointIcon variant="outline" size={13} />
                <span>Add to a Trail</span>
              </span>
              <ChevronRight size={14} className="shrink-0" style={dark ? { color: DARK.faint } : undefined} />
            </button>

            {submenuOpen && (
              <div
                onMouseLeave={() => setSubmenuOpen(false)}
                style={{ left: submenuOffset, ...(menuBoxProps.style || {}) }}
                className={menuBoxClass.replace("w-60", "absolute top-0 w-60")}
              >
                {recentTrails.length === 0 && !creatingNew && (
                  <p className="px-3 py-1.5 text-xs" style={dark ? { color: DARK.faint } : { color: "var(--color-ink-faint)" }}>
                    No Trails yet.
                  </p>
                )}
                {recentTrails.map((t) => (
                  <MenuItem
                    dark={dark}
                    key={t.id}
                    label={t.name}
                    dot={t.confidence}
                    onClick={() => {
                      moveMember(item.id, t.id);
                      close();
                    }}
                  />
                ))}
                <div className="my-1 border-t" style={dark ? { borderColor: DARK.border } : undefined} />
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
                      className={`flex-1 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent ${
                        dark ? "" : "border-line bg-paper"
                      }`}
                      style={dark ? { background: DARK.bgHover, borderColor: DARK.border, color: DARK.text } : undefined}
                    />
                    <button
                      type="submit"
                      className={`rounded-lg px-2 py-1 text-xs font-medium ${dark ? "" : "bg-accent text-paper-raised hover:bg-accent-deep"}`}
                      style={dark ? { background: DARK.accent, color: "#0b1220" } : undefined}
                    >
                      Add
                    </button>
                  </form>
                ) : (
                  <MenuItem dark={dark} label="New Trail…" accent onClick={() => setCreatingNew(true)} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {movePickerOpen && (
        <TrailPicker
          dark={dark}
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
  dark,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: boolean;
  dot?: number;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = DARK.bgHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
        style={{ color: disabled ? DARK.faint : accent ? DARK.accent : DARK.text, cursor: disabled ? "default" : "pointer" }}
      >
        {dot !== undefined && <ConfidenceDot confidence={dot} size={6} />}
        <span className="truncate">{label}</span>
      </button>
    );
  }
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
      {dot !== undefined && <ConfidenceDot confidence={dot} size={6} />}
      <span className="truncate">{label}</span>
    </button>
  );
}
