import Anthropic from "@anthropic-ai/sdk";
import { config, hasAnthropicKey } from "./config.js";
import { timeAgo } from "./util.js";

const client = hasAnthropicKey() ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

const TOOL = {
  name: "classify_item",
  description:
    "Decide how a newly-seen item (a file, browser tab, screenshot, or chat message) relates to the person's existing Threads — auto-named groups of related activity.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add_to_existing", "new_thread", "ignore"],
        description:
          "add_to_existing only if there's a real topical or temporal connection to one listed Thread. new_thread if it looks like the start of a distinct activity. ignore for something too generic to categorize (e.g. a stray unrelated download).",
      },
      thread_id: { type: "string", description: "Required if action is add_to_existing — must be one of the listed ids." },
      new_thread_name: {
        type: "string",
        description: "Required if action is new_thread. 2-4 words, Title Case, specific to the activity (e.g. 'Packaging Redesign'), never generic (never 'Files' or 'Misc').",
      },
      confidence: {
        type: "string",
        enum: ["confirmed", "suggested"],
        description: "confirmed only when the connection is obvious and strong. suggested otherwise — this is the default.",
      },
      why_grouped: {
        type: "string",
        description: "One short, plain sentence a person would actually say, explaining the grouping. E.g. \"Shared keywords 'packaging', 'supplier' · touched within 2 hours\".",
      },
      summary: {
        type: "string",
        description: "One-line, present-tense summary of what the person seems to be doing in this Thread overall. Calm, plain language, not corporate.",
      },
      is_todo: { type: "boolean", description: "True if this item reads like an actionable task the person still needs to do." },
      todo_text: { type: "string", description: "If is_todo, a short imperative task description, e.g. 'Send die-line to Priya'." },
      due_iso: {
        type: "string",
        description:
          "If is_todo and a due date/time is inferable from the item (e.g. mentions 'Friday', 'tomorrow 3pm'), the concrete ISO 8601 datetime computed relative to the current date/time given in the prompt. Empty string if no due date is inferable.",
      },
      due_text: { type: "string", description: "Short human-readable version of due_iso for display, e.g. 'Friday, 3:00 PM'. Empty string if none." },
    },
    required: ["action", "confidence", "why_grouped", "is_todo"],
  },
};

const SYSTEM = `You are the classification engine behind Thread, a calm background agent that groups a person's files, tabs, screenshots, and chats into activity-based "Threads" (never call them folders or projects). Keep decisions conservative: don't force a connection that isn't there — "new_thread" or "ignore" beats a wrong "add_to_existing". Copy should be plain, specific, and never sound like a productivity app nagging the user.`;

function buildUserMessage(item, threads) {
  const threadList = threads
    .map((t) => {
      const recent = t.items
        .slice(-5)
        .map((i) => i.name)
        .join(", ");
      return `- id: ${t.id} | name: "${t.name}" | last touched ${timeAgo(t.lastTouched)} | summary: ${t.summary} | recent items: ${recent}`;
    })
    .join("\n");

  const now = new Date();

  return `Current date/time: ${now.toISOString()} (${now.toLocaleDateString(undefined, { weekday: "long" })})

New item just seen:
- type: ${item.type}
- name: "${item.name}"
- source: ${item.source}
${item.context ? `- context: ${item.context}` : ""}

Existing Threads (empty list means there are none yet — you must use new_thread):
${threadList || "(none)"}

Classify this item.`;
}

function heuristicFallback(item, threads) {
  // No API key configured — degrade to simple keyword overlap so the system
  // still works, just without real language understanding.
  const words = item.name.toLowerCase().replace(/[._-]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  let best = null;
  let bestScore = 0;
  for (const t of threads) {
    const haystack = (t.name + " " + t.items.map((i) => i.name).join(" ")).toLowerCase();
    const score = words.filter((w) => haystack.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  if (best && bestScore > 0) {
    return {
      action: "add_to_existing",
      thread_id: best.id,
      confidence: "suggested",
      why_grouped: `Filename shares a keyword with "${best.name}" (no ANTHROPIC_API_KEY set — using basic matching).`,
      is_todo: false,
    };
  }
  return {
    action: "new_thread",
    new_thread_name: item.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 40),
    confidence: "suggested",
    why_grouped: "New activity just started (no ANTHROPIC_API_KEY set — using basic matching).",
    is_todo: false,
  };
}

export async function classifyItem(item, threads) {
  if (!client) return heuristicFallback(item, threads);

  try {
    const resp = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 512,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "classify_item" },
      messages: [{ role: "user", content: buildUserMessage(item, threads) }],
    });

    const toolUse = resp.content.find((b) => b.type === "tool_use");
    if (!toolUse) return heuristicFallback(item, threads);
    return toolUse.input;
  } catch (err) {
    console.error("[classify] Anthropic call failed, falling back to heuristic:", err.message);
    return heuristicFallback(item, threads);
  }
}
