import { useState } from "react";
import type { Trail } from "../types";
import { ConfidenceDot, WaypointIcon } from "./icons";
import { lifecycleLabel } from "../lib/format";

export function TrailPicker({
  title,
  trails,
  onPick,
  onCreateNew,
  onClose,
}: {
  title: string;
  trails: Trail[];
  onPick: (trailId: string) => void;
  onCreateNew?: (name: string) => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="paper-card w-[340px] rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2 text-ink-soft">
          <WaypointIcon size={14} />
          <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto no-scrollbar">
          {trails.length === 0 && !onCreateNew && (
            <p className="py-3 text-center text-sm text-ink-faint">No other Trails yet.</p>
          )}
          {trails.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-paper-deep"
            >
              <ConfidenceDot confidence={t.confidence} size={7} />
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{t.name}</p>
                <p className="text-xs text-ink-faint">{lifecycleLabel(t.lifecycle)}</p>
              </div>
            </button>
          ))}
        </div>

        {onCreateNew && (
          <div className="mt-2 border-t border-line pt-2">
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
                  className="flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-2.5 py-1.5 text-sm font-medium text-paper-raised hover:bg-accent-deep"
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full rounded-xl px-2.5 py-2 text-left text-sm text-accent-deep hover:bg-paper-deep"
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
