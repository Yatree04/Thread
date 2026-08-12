function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function timeAgo(ms) {
  const sec = Math.round(Math.max(0, Date.now() - ms) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function itemLabel(item) {
  if (item.type === "clipboard") return item.content_excerpt?.slice(0, 50) || "Clipboard snippet";
  return item.path ? item.path.split(/[/\\]/).pop() : `(${item.type})`;
}

function threadConfidence(thread) {
  return thread.items.some((i) => i.confidence === "suggested") ? "suggested" : "confirmed";
}

let state = { threads: [], items: [], query: "", expanded: new Set() };

async function load() {
  const [threads, items] = await Promise.all([window.thread.getThreads(), window.thread.getItems()]);
  state.threads = threads;
  state.items = items;
  render();
}

function matches(thread, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return thread.name.toLowerCase().includes(needle) || thread.items.some((i) => itemLabel(i).toLowerCase().includes(needle));
}

function threadRowHtml(thread) {
  const open = state.expanded.has(thread.id);
  return `
    <div class="thread-row" data-thread-id="${thread.id}">
      <div class="thread-row-head" data-toggle="${thread.id}">
        <span class="dot ${threadConfidence(thread)}"></span>
        <div class="thread-main">
          <div class="thread-name">${escapeHtml(thread.name)}${thread.state === "forming" ? '<span class="badge-forming">Forming</span>' : ""}</div>
          <div class="thread-meta">${thread.items.length} item${thread.items.length === 1 ? "" : "s"}</div>
        </div>
        <span class="thread-time mono">${timeAgo(thread.last_touched_at)}</span>
        <span class="chev ${open ? "open" : ""}">›</span>
      </div>
      ${
        open
          ? `<div class="thread-detail">
              ${thread.items
                .map(
                  (item) => `
                <div class="item-row">
                  <span class="dot ${item.confidence}"></span>
                  <div>
                    <div class="item-name">${escapeHtml(itemLabel(item))}</div>
                    ${item.reason ? `<div class="item-reason">${escapeHtml(item.reason)}</div>` : ""}
                  </div>
                  ${
                    item.confidence === "suggested"
                      ? `<div class="item-actions">
                          <button class="icon-btn reject" data-reject="${thread.id}:${item.id}" title="Reject">✕</button>
                          <button class="icon-btn accept" data-accept="${thread.id}:${item.id}" title="Accept">✓</button>
                        </div>`
                      : ""
                  }
                </div>`
                )
                .join("")}
              <button class="icon-btn" style="align-self:flex-start;color:var(--accent)" data-continue="${thread.id}">↻ Continue this Thread</button>
            </div>`
          : ""
      }
    </div>`;
}

function render() {
  const q = state.query;
  const filed = new Set(state.threads.flatMap((t) => t.items.map((i) => i.id)));
  const unsorted = state.items.filter((i) => !filed.has(i.id));

  const active = state.threads.filter((t) => (t.state === "active" || t.state === "forming") && matches(t, q)).sort((a, b) => b.last_touched_at - a.last_touched_at);
  const dormant = state.threads.filter((t) => t.state === "dormant" && matches(t, q)).sort((a, b) => b.last_touched_at - a.last_touched_at);

  const body = document.getElementById("body");
  body.innerHTML = `
    ${
      unsorted.length && !q
        ? `<div class="section-label">Unsorted · ${unsorted.length}</div>
           ${unsorted
             .slice(0, 5)
             .map(
               (item) => `
             <div class="unsorted-row">
               <span class="dot suggested"></span>
               <span class="item-name">${escapeHtml(itemLabel(item))}</span>
             </div>`
             )
             .join("")}`
        : ""
    }
    <div class="section-label">Active</div>
    ${active.length ? active.map(threadRowHtml).join("") : '<div class="empty">Nothing active yet.</div>'}
    <div class="section-label">Dormant</div>
    ${dormant.length ? dormant.map(threadRowHtml).join("") : '<div class="empty">Nothing dormant.</div>'}
  `;
}

document.getElementById("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

document.getElementById("body").addEventListener("click", async (e) => {
  const toggleId = e.target.closest("[data-toggle]")?.dataset.toggle;
  if (toggleId) {
    const id = Number(toggleId);
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    render();
    return;
  }

  const acceptKey = e.target.closest("[data-accept]")?.dataset.accept;
  if (acceptKey) {
    const [threadId, itemId] = acceptKey.split(":").map(Number);
    await window.thread.accept(threadId, itemId);
    await load();
    return;
  }

  const rejectKey = e.target.closest("[data-reject]")?.dataset.reject;
  if (rejectKey) {
    const [threadId, itemId] = rejectKey.split(":").map(Number);
    await window.thread.reject(threadId, itemId);
    await load();
    return;
  }

  const continueId = e.target.closest("[data-continue]")?.dataset.continue;
  if (continueId) {
    await window.thread.continueThread(Number(continueId));
    window.thread.hidePalette();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.thread.hidePalette();
});

window.thread.onUpdate(load);
load();
document.getElementById("search").focus();
