import type { TrailItem } from "../types";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export interface StreakDay {
  label: string;
  active: boolean;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Real rolling 7-day activity streak for a Trail, derived from actual item
 * timestamps — never simulated. Index 0 is 6 days ago, index 6 is today. */
export function computeStreak(items: TrailItem[], trailId: string, now = new Date()): StreakDay[] {
  const activeDayKeys = new Set(
    items.filter((i) => i.trailId === trailId).map((i) => dayKey(new Date(i.addedAt)))
  );
  const days: StreakDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ label: DAY_LETTERS[d.getDay()], active: activeDayKeys.has(dayKey(d)) });
  }
  return days;
}

/** e.g. "3 days running" / "today" / "dormant" — the current unbroken streak ending today. */
export function describeStreak(days: StreakDay[]): string {
  let run = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].active) run++;
    else break;
  }
  if (run === 0) return "dormant";
  if (run === 1) return "today";
  return `${run} days running`;
}
