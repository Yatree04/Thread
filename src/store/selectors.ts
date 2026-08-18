import type { Trail } from "../types";
import type { WakeMode } from "./trailStore";

export interface ContinueCardData {
  mode: "single" | "chooser" | "none";
  trails: Trail[];
}

/** Section 1.8 — Continue Card states, driven by wakeMode + trail recency.
 * The card is resolved (resumed/rejected/dismissed/confirmed) once per wake —
 * resolving one Trail's card does not cascade into showing the next one. */
export function getContinueCardData(
  trails: Trail[],
  wakeMode: WakeMode,
  continueCardResolved: boolean
): ContinueCardData {
  if (wakeMode === "none" || continueCardResolved) return { mode: "none", trails: [] };

  const eligible = trails
    .filter((t) => !t.rejected && t.lifecycle !== "archived")
    .sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  if (wakeMode === "low") {
    const low = eligible.find((t) => t.confidence === "low") ?? eligible[0];
    return low ? { mode: "single", trails: [low] } : { mode: "none", trails: [] };
  }

  if (wakeMode === "multiple") {
    const top = eligible.slice(0, 3);
    return top.length > 1
      ? { mode: "chooser", trails: top }
      : top.length === 1
      ? { mode: "single", trails: top }
      : { mode: "none", trails: [] };
  }

  // auto
  if (eligible.length === 0) return { mode: "none", trails: [] };
  return { mode: "single", trails: [eligible[0]] };
}
