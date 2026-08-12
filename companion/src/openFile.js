import open from "open";

// Companion runs with real desktop access, so — unlike the browser extension —
// it can actually open local files in their default app. This is what makes
// "Continue" on a file item real instead of just a list entry.
export async function openItem(item) {
  if (item.path) return open(item.path);
  if (item.url) return open(item.url);
  return null;
}
