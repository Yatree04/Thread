import { useEffect, useState } from "react";
import { formatDuration, secondsAgo } from "../utils/time";

export default function TrayIndicator({ lastActivity }) {
  const [, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = secondsAgo(lastActivity);

  return (
    <div
      className="fixed bottom-4 left-4 z-40 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <div
          className="mb-2 rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
          style={{
            background: "var(--color-surface-elevated-2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-dim)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Last updated {formatDuration(elapsed)}
        </div>
      )}
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1.5 shadow-lg"
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border-soft)",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full rounded-full animate-pulse-dot"
            style={{ background: "var(--color-accent)" }}
          />
        </span>
        <span
          className="text-xs tracking-wide"
          style={{ color: "var(--color-text-dim)", fontFamily: "var(--font-body)" }}
        >
          Thread — running
        </span>
      </div>
    </div>
  );
}
