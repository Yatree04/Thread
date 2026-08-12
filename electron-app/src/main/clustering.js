const db = require("./db");
const { classifyWithAI, hasApiKey } = require("./ai");
const events = require("./events");

const RECENCY_BONUS_MS = 1000 * 60 * 60 * 6; // 6h
const STOPWORDS = new Set(["the", "and", "for", "with", "from", "this", "that", "your", "have"]);

function words(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[._\-/\\]/g, " ")
    .split(/\W+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

// Tier 1: cheap heuristic pre-filter. No API call. Produces a shortlist of
// candidate Threads by keyword overlap + recency — the AI only ever sees
// this shortlist, not every Thread that has ever existed.
function getCandidateThreads(item, { limit = 3 } = {}) {
  const threads = db.getAllThreads().filter((t) => t.state !== "closed");
  const itemWords = new Set([...words(item.name), ...words(item.contentExcerpt)]);

  const scored = threads.map((thread) => {
    const items = db.getThreadItems(thread.id);
    const recentItemNames = items.slice(-5).map((i) => i.path?.split(/[/\\]/).pop() || i.content_excerpt?.slice(0, 40) || i.type);
    const threadWords = new Set([...words(thread.name), ...items.flatMap((i) => words(i.content_excerpt || i.path))]);

    let score = 0;
    for (const w of itemWords) if (threadWords.has(w)) score += 1;
    if (Date.now() - thread.last_touched_at < RECENCY_BONUS_MS) score += 1;

    return { thread, score, recentItemNames };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ thread, recentItemNames }) => ({ id: thread.id, name: thread.name, summary: thread.summary, recentItemNames }));
}

function heuristicOnlyDecision(item, candidates) {
  const suffix = "(no ANTHROPIC_API_KEY set — using basic keyword matching instead of real classification)";
  if (candidates.length > 0) {
    const best = candidates[0];
    return {
      action: "add_to_existing",
      thread_id: best.id,
      confidence: "suggested",
      reason: `Shares a keyword with "${best.name}". ${suffix}`,
    };
  }
  return {
    action: "new_thread",
    new_thread_name: item.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "New Activity",
    confidence: "suggested",
    reason: `New activity just started. ${suffix}`,
  };
}

// The single funnel every new item (watched file, screenshot, clipboard
// snippet) passes through.
async function classifyAndFile(rawItem) {
  const item = db.createItem({
    path: rawItem.path || null,
    type: rawItem.type,
    contentExcerpt: rawItem.contentExcerpt || null,
  });

  const candidates = getCandidateThreads({ name: rawItem.name, contentExcerpt: rawItem.contentExcerpt });

  let decision;
  if (hasApiKey()) {
    try {
      decision = await classifyWithAI({ name: rawItem.name, type: rawItem.type, contentExcerpt: rawItem.contentExcerpt }, candidates);
    } catch (err) {
      console.error("[clustering] Anthropic call failed, falling back to heuristic:", err.message);
    }
  }
  if (!decision) decision = heuristicOnlyDecision({ name: rawItem.name }, candidates);

  let thread = null;
  if (decision.action === "add_to_existing" && candidates.some((c) => c.id === decision.thread_id)) {
    db.addThreadItem({ threadId: decision.thread_id, itemId: item.id, confidence: decision.confidence, reason: decision.reason });
    thread = db.touchThread(decision.thread_id, { reactivate: true });
  } else if (decision.action === "new_thread" && decision.new_thread_name) {
    thread = db.createThread({ name: decision.new_thread_name, state: "forming", summary: decision.summary || null });
    db.addThreadItem({ threadId: thread.id, itemId: item.id, confidence: decision.confidence, reason: decision.reason });
  }
  // action === "ignore" -> item stays in the DB unfiled (still visible/deletable in Settings).

  events.emit("item-classified", { item, decision, thread });
  return { item, decision, thread };
}

module.exports = { classifyAndFile, getCandidateThreads };
