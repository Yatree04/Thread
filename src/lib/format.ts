export function relativeTime(timestamp: number, from: number = Date.now()): string {
  const diffMs = Math.max(0, from - timestamp);
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function confidenceLabel(confidence: "high" | "medium" | "low"): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence — tap to confirm";
  }
}

export function lifecycleLabel(lifecycle: "forming" | "active" | "idle" | "archived"): string {
  switch (lifecycle) {
    case "forming":
      return "Forming";
    case "active":
      return "Active";
    case "idle":
      return "Idle";
    case "archived":
      return "Archived";
  }
}
