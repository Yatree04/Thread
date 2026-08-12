const Anthropic = require("@anthropic-ai/sdk");

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const TOOL = {
  name: "classify_item",
  description:
    "Decide how a newly-seen item (a file, screenshot, or clipboard snippet) relates to the person's existing Threads — auto-named groups of related activity.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add_to_existing", "new_thread", "ignore"],
        description:
          "add_to_existing only if there is a real topical or temporal connection to one of the candidate Threads listed. new_thread if this looks like the start of a distinct activity. ignore if it's too generic to categorize meaningfully.",
      },
      thread_id: { type: "integer", description: "Required if action is add_to_existing — must be one of the candidate ids listed." },
      new_thread_name: {
        type: "string",
        description: "Required if action is new_thread. 2-4 words, Title Case, specific to the activity, never generic ('Files', 'Misc').",
      },
      summary: { type: "string", description: "If action is new_thread: one-line present-tense summary of what the person seems to be doing." },
      confidence: {
        type: "string",
        enum: ["confirmed", "suggested"],
        description: "confirmed only when the connection is obvious and strong. suggested otherwise — this is the default.",
      },
      reason: {
        type: "string",
        description:
          "One short, plain sentence a person would actually say, explaining the grouping decision — this is shown verbatim in the UI as \"why grouped\". E.g. \"Shared keywords 'packaging', 'supplier' and touched within 2 hours\".",
      },
    },
    required: ["action", "confidence", "reason"],
  },
};

const SYSTEM = `You are the classification engine behind Thread, a calm background agent that groups a person's files, screenshots, and clipboard snippets into activity-based "Threads" (never call them folders or projects). Keep decisions conservative: don't force a connection that isn't there — "new_thread" or "ignore" beats a wrong "add_to_existing". Copy should be plain, specific, and never sound like a productivity app nagging the user. You only ever receive filenames, short excerpts, and metadata — never full file contents.`;

function buildUserMessage(item, candidates) {
  const list = candidates
    .map((c) => `- id: ${c.id} | name: "${c.name}" | summary: ${c.summary || "(none yet)"} | recent items: ${c.recentItemNames.join(", ") || "(none)"}`)
    .join("\n");

  return `New item just seen:
- type: ${item.type}
- name: "${item.name}"
${item.contentExcerpt ? `- excerpt: "${item.contentExcerpt.slice(0, 300)}"` : ""}

Candidate Threads (from a cheap keyword/recency pre-filter — empty means none matched, you must use new_thread or ignore):
${list || "(none)"}

Classify this item.`;
}

async function classifyWithAI(item, candidates) {
  const c = getClient();
  if (!c) return null;

  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "classify_item" },
    messages: [{ role: "user", content: buildUserMessage(item, candidates) }],
  });

  const toolUse = resp.content.find((b) => b.type === "tool_use");
  return toolUse ? toolUse.input : null;
}

module.exports = { classifyWithAI, hasApiKey };
