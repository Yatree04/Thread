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

export function confidenceBucket(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 65) return "medium";
  return "low";
}

export function confidenceLabel(score: number): string {
  switch (confidenceBucket(score)) {
    case "high":
      return `${score}% confidence`;
    case "medium":
      return `${score}% confidence`;
    case "low":
      return `${score}% confidence — tap to confirm`;
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
