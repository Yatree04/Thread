// Real AI-assisted grouping (spec 0.2), backed by the Anthropic API.
// Given a newly-detected item and the current Trails, asks Claude whether it
// belongs to an existing Trail, should start a new one, or stays unfiled.
let Anthropic = null;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  // dependency not installed yet — classifyItem() below degrades gracefully
}

let client = Anthropic && process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

/** Called after the user saves a new key via Settings, so it takes effect immediately — no restart needed. */
function setApiKey(key) {
  process.env.ANTHROPIC_API_KEY = key;
  client = Anthropic && key ? new Anthropic({ apiKey: key }) : null;
  warnedOnce = false;
}

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
{"action": "add" | "new" | "unfiled", "trailId": "<id, only if action=add>", "name": "<name, only if action=new>", "confidence": <integer 0-100, your genuine certainty>, "evidence": "<short reason, e.g. 'Included: matched by content'>"}`;

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

function relativeTimeServer(ts) {
  const diffMs = Math.max(0, Date.now() - ts);
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/** Honest, non-AI fallback built only from real captured data — used when there's
 * no API key, or if the model call fails. Never invents an insight. */
function fallbackContext({ trail, items, focusItem }) {
  if (focusItem) {
    return `"${focusItem.title}" was added ${relativeTimeServer(focusItem.addedAt)}. ${items.length} item${items.length === 1 ? '' : 's'} total in "${trail.name}".`;
  }
  if (items.length === 0) return `No items captured yet in "${trail.name}".`;
  const last = items[items.length - 1];
  return `${items.length} item${items.length === 1 ? '' : 's'} captured in "${trail.name}". Most recent: "${last.title}", ${relativeTimeServer(last.addedAt)}.`;
}

const CONTEXT_SYSTEM_PROMPT = `You write short, honest status blurbs (2-3 sentences, no fluff, no markdown) describing what's really going on inside one "Trail" (a bundle of a person's files/clipboard snippets/tabs), based only on the titles and details given — never invent specifics you weren't given.`;

/** Real AI-generated (cached by the caller) "what's going on here" summary for
 * the Contextualise mode — either for the whole Trail, or focused on one item. */
async function summarizeContext({ trail, items, focusItem }) {
  if (!client) return fallbackContext({ trail, items, focusItem });

  const itemLines = items
    .slice(-10)
    .map((i) => `- [${i.type}] "${i.title}"${i.detail ? `: ${String(i.detail).slice(0, 200)}` : ''} (${relativeTimeServer(i.addedAt)})`)
    .join('\n');

  const userPrompt = focusItem
    ? `Trail: "${trail.name}"\nAll items:\n${itemLines || '(none)'}\n\nFocus specifically on this one item and what it tells us:\n- "${focusItem.title}"${focusItem.detail ? `: ${String(focusItem.detail).slice(0, 300)}` : ''}`
    : `Trail: "${trail.name}"\nItems:\n${itemLines || '(none)'}\n\nSummarize what's actively going on in this Trail.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 200,
      system: CONTEXT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();
    return text || fallbackContext({ trail, items, focusItem });
  } catch (err) {
    console.error('[trails] context summary call failed:', err.message || err);
    return fallbackContext({ trail, items, focusItem });
  }
}

module.exports = { classifyItem, summarizeContext, setApiKey, hasApiKey: () => Boolean(client) };
