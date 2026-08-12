function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const FILE_SVG = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
const SCREENSHOT_SVG = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>`;

function itemLabel(item) {
  return item.path ? item.path.split(/[/\\]/).pop() : `(${item.type})`;
}

let items = [];
let threads = [];

async function load() {
  const [allItems, allThreads] = await Promise.all([window.thread.getItems(), window.thread.getThreads()]);
  items = allItems.filter((i) => i.type === "file" || i.type === "screenshot");
  threads = allThreads;
  renderGrid();
}

function threadForItem(itemId) {
  return threads.find((t) => t.items.some((i) => i.id === itemId));
}

function renderGrid() {
  const grid = document.getElementById("grid");
  if (!items.length) {
    grid.innerHTML = '<div class="empty-state">No files indexed yet — anything Thread watches will show up here as it appears.</div>';
    return;
  }
  grid.innerHTML = items
    .map((item) => {
      const assigned = threadForItem(item.id);
      return `
      <button class="file-icon-btn" data-item="${item.id}" oncontextmenu="return false;">
        ${item.type === "screenshot" ? SCREENSHOT_SVG : FILE_SVG}
        ${assigned ? '<div class="file-badge"></div>' : ""}
        <span class="file-icon-name">${escapeHtml(itemLabel(item))}</span>
      </button>`;
    })
    .join("");

  grid.querySelectorAll("[data-item]").forEach((btn) => {
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openMenu(Number(btn.dataset.item), e.clientX, e.clientY);
    });
  });
}

// ---- context menu ----

async function openMenu(itemId, x, y) {
  closeMenu();
  const item = items.find((i) => i.id === itemId);
  const assigned = threadForItem(itemId);
  const candidates = await window.thread.getCandidatesForItem(itemId);
  const best = candidates[0];
  const linkedThread = assigned || (best ? threads.find((t) => t.id === best.id) : null);
  const linkedCount = linkedThread ? linkedThread.items.length : 0;

  const menu = document.createElement("div");
  menu.className = "ctx-menu";
  const menuWidth = 250;
  const menuHeight = 320;
  menu.style.left = `${Math.min(x, window.innerWidth - menuWidth - 12)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - menuHeight - 12)}px`;

  menu.innerHTML = `
    <div class="ctx-thread-section">
      <div class="ctx-label">Thread</div>
      ${
        assigned
          ? `<div class="ctx-row native"><span class="dot"></span> Linked to <strong style="color:var(--text-primary)">&nbsp;${escapeHtml(assigned.name)}</strong></div>`
          : best
            ? `<button class="ctx-row" data-add-best="${best.id}"><span class="dot suggested"></span> Add to <strong>&nbsp;${escapeHtml(best.name)}</strong></button>`
            : `<div class="ctx-row native">No confident match yet</div>`
      }
      <div style="position:relative">
        <button class="ctx-row" id="add-to-thread-row">Add to Thread <span class="spacer"></span> ›</button>
        <div id="submenu" class="ctx-submenu" style="display:none"></div>
      </div>
      <button class="ctx-row" id="linked-row" ${linkedCount ? "" : "disabled"}>
        Show what's linked <span class="spacer"></span> <span class="ctx-badge">${linkedCount}</span>
      </button>
      <div id="linked-list" style="display:none;padding:4px 8px 2px"></div>
    </div>
    <button class="ctx-row native" data-open="${item.id}">Open</button>
    <button class="ctx-row native" data-reveal="${item.id}">Reveal in file manager</button>
    <div class="ctx-divider"></div>
    <button class="ctx-row danger" data-trash="${item.id}">Move to Trash</button>
  `;

  document.getElementById("menu-root").appendChild(menu);

  menu.querySelector("#add-to-thread-row").addEventListener("click", () => {
    const sub = menu.querySelector("#submenu");
    const showing = sub.style.display !== "none";
    sub.style.display = showing ? "none" : "block";
    if (!showing) {
      sub.innerHTML =
        threads
          .map((t) => `<button class="ctx-row" data-add-thread="${t.id}">${escapeHtml(t.name)}</button>`)
          .join("") +
        `<div class="ctx-divider"></div>
         <div id="new-thread-form">
           <input class="ctx-new-thread-input" id="new-thread-name" placeholder="Name this Thread…" />
           <button class="ctx-row" id="create-thread-btn" style="color:var(--accent)">+ Create</button>
         </div>`;
    }
  });

  menu.querySelector("#linked-row").addEventListener("click", () => {
    if (!linkedThread) return;
    const list = menu.querySelector("#linked-list");
    const showing = list.style.display !== "none";
    list.style.display = showing ? "none" : "block";
    if (!showing) {
      list.innerHTML = linkedThread.items
        .map((i) => `<div class="ctx-row native" style="padding:4px 4px">${escapeHtml(itemLabel(i))}</div>`)
        .join("");
    }
  });

  menu.addEventListener("click", async (e) => {
    const addBest = e.target.closest("[data-add-best]")?.dataset.addBest;
    const addThread = e.target.closest("[data-add-thread]")?.dataset.addThread;
    const openBtn = e.target.closest("[data-open]")?.dataset.open;
    const revealBtn = e.target.closest("[data-reveal]")?.dataset.reveal;
    const trashBtn = e.target.closest("[data-trash]")?.dataset.trash;

    if (addBest) {
      await window.thread.addItemToThread(itemId, Number(addBest));
      closeMenu();
      load();
    } else if (addThread) {
      await window.thread.addItemToThread(itemId, Number(addThread));
      closeMenu();
      load();
    } else if (e.target.id === "create-thread-btn") {
      const name = document.getElementById("new-thread-name").value.trim();
      if (!name) return;
      const thread = await window.thread.createThread(name);
      await window.thread.addItemToThread(itemId, thread.id);
      closeMenu();
      load();
    } else if (openBtn) {
      window.thread.openItem(item.path);
      closeMenu();
    } else if (revealBtn) {
      window.thread.revealInOS(item.path);
      closeMenu();
    } else if (trashBtn) {
      await window.thread.trashItem(itemId, item.path);
      closeMenu();
      load();
    }
  });

  document.addEventListener("mousedown", onOutsideClick, { capture: true });
  document.addEventListener("keydown", onEscape);
}

function closeMenu() {
  document.getElementById("menu-root").innerHTML = "";
  document.removeEventListener("mousedown", onOutsideClick, { capture: true });
  document.removeEventListener("keydown", onEscape);
}

function onOutsideClick(e) {
  if (!e.target.closest(".ctx-menu")) closeMenu();
}
function onEscape(e) {
  if (e.key === "Escape") closeMenu();
}

window.thread.onUpdate(load);
load();
