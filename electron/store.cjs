// Main-process Trail Store — the real single source of truth (spec section 0.3).
// Persisted to disk via electron-store; every renderer window is a thin mirror
// that dispatches actions here and receives the authoritative state back.
const crypto = require('crypto');
const Store = require('electron-store');

const disk = new Store({
  name: 'trails-data',
  defaults: { trails: [], items: [] },
});

let trails = disk.get('trails');
let items = disk.get('items');
const archiveMemory = {};

function persist() {
  disk.set('trails', trails);
  disk.set('items', items);
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function itemsOf(trailId) {
  return items.filter((i) => i.trailId === trailId);
}

function getState() {
  return { trails, items };
}

function getTrail(trailId) {
  return trails.find((t) => t.id === trailId);
}

/** Cached AI (or honest fallback) context blurb — key is "all" or an item id. */
function getCachedContext(trailId, key) {
  const trail = getTrail(trailId);
  return (trail && trail.context && trail.context[key]) || null;
}

function setCachedContext(trailId, key, text) {
  const trail = getTrail(trailId);
  if (!trail) return;
  trail.context = trail.context || {};
  trail.context[key] = { text, at: Date.now() };
  persist();
}

/** Applies one dispatched action, mutates + persists, returns an optional toast. */
function dispatch(type, payload = {}) {
  let toast = null;

  switch (type) {
    case 'resumeTrail': {
      const trail = trails.find((t) => t.id === payload.trailId);
      if (trail) {
        trail.lastActiveAt = Date.now();
        const count = itemsOf(trail.id).length;
        toast = { message: `Reopening ${count} item${count === 1 ? '' : 's'} from "${trail.name}"…` };
      }
      break;
    }
    case 'notATrail': {
      const trail = trails.find((t) => t.id === payload.trailId);
      if (trail) {
        trail.rejected = true;
        items.forEach((i) => {
          if (i.trailId === trail.id) {
            i.trailId = null;
            i.evidence = 'Not yet grouped';
          }
        });
        toast = { message: `"${trail.name}" dismissed. Its items are available to sort manually.` };
      }
      break;
    }
    case 'confirmLowConfidence': {
      const trail = trails.find((t) => t.id === payload.trailId);
      if (trail) {
        trail.confidence = 90;
        trail.lifecycle = 'active';
        toast = { message: 'Confirmed — confidence updated.' };
      }
      break;
    }
    case 'archiveTrail': {
      const trail = trails.find((t) => t.id === payload.trailId);
      if (trail) {
        archiveMemory[trail.id] = trail.lifecycle;
        trail.lifecycle = 'archived';
        toast = { message: 'Trail archived', actionLabel: 'Undo', undoType: 'archiveTrail', undoTrailId: trail.id };
      }
      break;
    }
    case 'undoArchive': {
      const trail = trails.find((t) => t.id === payload.trailId);
      if (trail) trail.lifecycle = archiveMemory[trail.id] || 'active';
      break;
    }
    case 'renameTrail': {
      const trail = trails.find((t) => t.id === payload.trailId);
      if (trail && payload.name) trail.name = payload.name;
      break;
    }
    case 'completeMerge': {
      const source = trails.find((t) => t.id === payload.sourceId);
      const target = trails.find((t) => t.id === payload.targetId);
      if (source && target && source.id !== target.id) {
        items.forEach((i) => {
          if (i.trailId === source.id) i.trailId = target.id;
        });
        trails = trails.filter((t) => t.id !== source.id);
        target.lastActiveAt = Date.now();
        toast = { message: `Merged "${source.name}" into "${target.name}"` };
      }
      break;
    }
    case 'createTrail': {
      const id = makeId('trail');
      trails.unshift({
        id,
        name: payload.name,
        confidence: 90,
        lifecycle: 'forming',
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      (payload.itemIds || []).forEach((itemId) => {
        const item = items.find((i) => i.id === itemId);
        if (item) {
          item.trailId = id;
          item.evidence = 'Included: added manually';
        }
      });
      toast = { message: `Created "${payload.name}"` };
      break;
    }
    case 'removeMember': {
      const item = items.find((i) => i.id === payload.itemId);
      if (item) {
        item.trailId = null;
        item.evidence = 'Not yet grouped';
      }
      break;
    }
    case 'moveMember': {
      const item = items.find((i) => i.id === payload.itemId);
      const trail = trails.find((t) => t.id === payload.trailId);
      if (item && trail) {
        item.trailId = trail.id;
        item.evidence = 'Included: added manually';
        trail.lastActiveAt = Date.now();
        toast = { message: `Added to "${trail.name}"` };
      }
      break;
    }
    default:
      break;
  }

  persist();
  return toast;
}

/** Called by watchers (real filesystem/clipboard/tab events) after clustering has decided where the item goes. */
function ingestItem({ type, title, detail, evidence, decision }) {
  const id = makeId('item');
  let trailId = null;
  let toastMessage = null;

  if (decision && decision.action === 'add' && decision.trailId && trails.some((t) => t.id === decision.trailId)) {
    trailId = decision.trailId;
    const trail = trails.find((t) => t.id === trailId);
    trail.lastActiveAt = Date.now();
    toastMessage = `New activity added to "${trail.name}"`;
  } else if (decision && decision.action === 'new' && decision.name) {
    trailId = makeId('trail');
    trails.unshift({
      id: trailId,
      name: decision.name,
      confidence: typeof decision.confidence === 'number' ? decision.confidence : 70,
      lifecycle: 'forming',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
    toastMessage = `New Trail detected: "${decision.name}"`;
  } else {
    toastMessage = 'New item detected — not yet grouped into a Trail';
  }

  items.push({
    id,
    trailId,
    type,
    title,
    detail,
    evidence: (decision && decision.evidence) || evidence || (trailId ? 'Included: matched by content' : 'Not yet grouped'),
    addedAt: Date.now(),
  });

  persist();
  return { message: toastMessage, itemId: id, trailId };
}

module.exports = { getState, dispatch, ingestItem, itemsOf, getTrail, getCachedContext, setCachedContext };
