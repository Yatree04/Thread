import { useState } from "react";
import type { Trail } from "../types";
import { ConfidenceDot, WaypointIcon } from "./icons";
import { lifecycleLabel } from "../lib/format";

const DARK = {
  bg: "#1e1e25",
  bgHover: "#26262f",
  border: "#2c2c36",
  text: "#f2f2f5",
  faint: "#8b8b97",
  accent: "#7dd3fc",
};

export function TrailPicker({
  title,
  trails,
  onPick,
  onCreateNew,
  onClose,
  dark = false,
}: {
  title: string;
  trails: Trail[];
  onPick: (trailId: string) => void;
  onCreateNew?: (name: string) => void;
  onClose: () => void;
  dark?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center"
      style={{ background: dark ? "rgba(0,0,0,0.5)" : undefined }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-[340px] rounded-2xl p-4 ${dark ? "" : "paper-card"}`}
        style={dark ? { background: DARK.bg, border: `1px solid ${DARK.border}`, color: DARK.text } : undefined}
      >
        <div className="mb-3 flex items-center gap-2" style={dark ? { color: DARK.faint } : undefined}>
          <WaypointIcon size={14} className={dark ? "" : "text-ink-soft"} />
          <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto no-scrollbar">
          {trails.length === 0 && !onCreateNew && (
            <p className="py-3 text-center text-sm" style={dark ? { color: DARK.faint } : undefined}>
              No other Trails yet.
            </p>
          )}
          {trails.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              onMouseEnter={(e) => dark && (e.currentTarget.style.background = DARK.bgHover)}
              onMouseLeave={(e) => dark && (e.currentTarget.style.background = "transparent")}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${dark ? "" : "hover:bg-paper-deep"}`}
            >
              <ConfidenceDot confidence={t.confidence} size={7} />
              <div className="min-w-0">
                <p className="truncate text-sm" style={dark ? { color: DARK.text } : { color: "var(--color-ink)" }}>
                  {t.name}
                </p>
                <p className="text-xs" style={dark ? { color: DARK.faint } : undefined}>
                  {lifecycleLabel(t.lifecycle)}
                </p>
              </div>
            </button>
          ))}
        </div>

        {onCreateNew && (
          <div className="mt-2 border-t pt-2" style={dark ? { borderColor: DARK.border } : undefined}>
            {creating ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) onCreateNew(name.trim());
                }}
                className="flex gap-1.5"
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New Trail name…"
                  className={`flex-1 rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent ${
                    dark ? "" : "border-line bg-paper"
                  }`}
                  style={dark ? { background: DARK.bgHover, borderColor: DARK.border, color: DARK.text } : undefined}
                />
                <button
                  type="submit"
                  className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${dark ? "" : "bg-accent text-paper-raised hover:bg-accent-deep"}`}
                  style={dark ? { background: DARK.accent, color: "#0b1220" } : undefined}
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className={`w-full rounded-xl px-2.5 py-2 text-left text-sm ${dark ? "" : "text-accent-deep hover:bg-paper-deep"}`}
                style={dark ? { color: DARK.accent } : undefined}
              >
                New Trail…
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
