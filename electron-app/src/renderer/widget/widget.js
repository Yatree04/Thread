const TIERS = ["small", "medium", "large"];

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function timeAgo(ms) {
  const sec = Math.round(Math.max(0, Date.now() - ms) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  return `${hr}h ago`;
}

let tier = "small";
const content = document.getElementById("content");

async function render() {
  const [threads, needsReview] = await Promise.all([window.thread.getThreads(), window.thread.getNeedsReview()]);
  const active = threads.filter((t) => t.state === "active" || t.state === "forming").sort((a, b) => b.last_touched_at - a.last_touched_at);
  const unsortedItems = (await window.thread.getItems()).filter((i) => !threads.some((t) => t.items.some((ti) => ti.id === i.id)));

  if (tier === "small") {
    content.innerHTML = `
      <div class="pill-row">
        <span class="dot ${needsReview.length ? "pulse" : ""}"></span>
        <span class="pill-text">${needsReview.length ? `<span class="pill-count">${needsReview.length}</span> waiting on you` : "All caught up"}</span>
      </div>`;
    return;
  }

  if (tier === "medium") {
    const t = active[0];
    content.innerHTML = t
      ? `
      <div class="card">
        <div class="card-eyebrow">Most recent</div>
        <div class="card-title">${escapeHtml(t.name)}${t.state === "forming" ? '<span class="badge-forming">Forming</span>' : ""}</div>
        <div class="card-summary">${escapeHtml(t.summary || "Thread will summarize this once it learns more.")}</div>
        <div class="card-actions">
          <button class="btn-primary" data-continue="${t.id}">Continue</button>
          <button class="btn-ghost" id="open-palette">Browse</button>
        </div>
      </div>`
      : `<div class="card"><div class="card-eyebrow">Thread</div><div class="empty" style="margin-top:8px">Nothing active yet — it'll show up here.</div></div>`;
  }

  if (tier === "large") {
    content.innerHTML = `
      <div class="large-header">Threads</div>
      <div class="large-list">
        ${
          active.length
            ? active
                .slice(0, 8)
                .map(
                  (t) => `
          <div class="thread-item-row">
            <span class="dot ${t.items.some((i) => i.confidence === "suggested") ? "suggested" : ""}"></span>
            <span class="thread-item-name">${escapeHtml(t.name)}</span>
            <span class="mono" style="color:var(--text-faint);font-size:10.5px">${timeAgo(t.last_touched_at)}</span>
          </div>`
                )
                .join("")
            : '<div class="empty">Nothing active yet.</div>'
        }
        <div class="unsorted-row">
          <span>${unsortedItems.length} unsorted item${unsortedItems.length === 1 ? "" : "s"}</span>
          <button class="btn-ghost no-drag" id="sort-btn" ${unsortedItems.length ? "" : "disabled"}>Sort</button>
        </div>
      </div>`;
  }
}

document.getElementById("cycle-btn").addEventListener("click", async () => {
  tier = TIERS[(TIERS.indexOf(tier) + 1) % TIERS.length];
  await window.thread.setWidgetTier(tier);
  render();
});

content.addEventListener("click", (e) => {
  const continueId = e.target.closest("[data-continue]")?.dataset.continue;
  if (continueId) {
    window.thread.continueThread(Number(continueId));
    return;
  }
  if (e.target.id === "open-palette" || e.target.id === "sort-btn") {
    window.thread.openPalette();
  }
});

window.thread.getSettings().then((s) => {
  tier = s.widgetTier || "small";
  render();
});
window.thread.onUpdate(render);
setInterval(render, 20000);
