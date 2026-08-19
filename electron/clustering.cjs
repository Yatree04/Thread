// Real AI-assisted grouping (spec 0.2), backed by the Anthropic API.
// Given a newly-detected item and the current Trails, asks Claude whether it
// belongs to an existing Trail, should start a new one, or stays unfiled.
let Anthropic = null;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  // dependency not installed yet — classifyItem() below degrades gracefully
}

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = Anthropic && apiKey ? new Anthropic({ apiKey }) : null;

let warnedOnce = false;

function summarizeTrails(trails, itemsOf) {
  return trails
    .filter((t) => !t.rejected && t.lifecycle !== 'archived')
    .slice(0, 12)
    .map((t) => {
      const members = itemsOf(t.id)
        .slice(-4)
        .map((i) => i.title)
        .join('; ');
      return `- id: ${t.id} | name: "${t.name}" | confidence: ${t.confidence} | recent items: ${members || '(none)'}`;
    })
    .join('\n');
}

const SYSTEM_PROMPT = `You are the clustering engine inside Trails, a desktop app that groups a person's files, clipboard snippets, and browser tabs into named "Trails" (bundles of related activity), the way someone might file related items into a folder — except automatic.

You will be given the current list of open Trails and one newly-detected item (a file, clipboard snippet, or browser tab). Decide:
1. "add" — the item clearly continues an existing Trail. Return its id.
2. "new" — the item looks like the start of a new, nameable body of work. Propose a short, specific, human-sounding Trail name (like "Pricing Page Redesign", not "Misc Files").
3. "unfiled" — there's not enough signal yet to group it confidently.

Respond with ONLY a single JSON object, no markdown fences, no commentary:
{"action": "add" | "new" | "unfiled", "trailId": "<id, only if action=add>", "name": "<name, only if action=new>", "confidence": "high" | "medium" | "low", "evidence": "<short reason, e.g. 'Included: matched by content'>"}`;

async function classifyItem({ item, trails, itemsOf }) {
  if (!client) {
    if (!warnedOnce) {
      console.warn(
        '[trails] ANTHROPIC_API_KEY not set (or @anthropic-ai/sdk missing) — new items will land unfiled until you add a key to .env'
      );
      warnedOnce = true;
    }
    return { action: 'unfiled' };
  }

  const userPrompt = `Current Trails:\n${summarizeTrails(trails, itemsOf) || '(none yet)'}\n\nNew item:\n- type: ${item.type}\n- title: "${item.title}"\n${item.detail ? `- detail: ${String(item.detail).slice(0, 300)}\n` : ''}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()
      .replace(/^```(json)?/i, '')
      .replace(/```$/, '')
      .trim();
    const parsed = JSON.parse(text);
    if (!['add', 'new', 'unfiled'].includes(parsed.action)) return { action: 'unfiled' };
    return parsed;
  } catch (err) {
    console.error('[trails] clustering call failed:', err.message || err);
    return { action: 'unfiled' };
  }
}

module.exports = { classifyItem, hasApiKey: Boolean(client) };
