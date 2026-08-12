function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function itemLabel(item) {
  if (item.type === "clipboard") return item.content_excerpt?.slice(0, 60) || "Clipboard snippet";
  return item.path ? item.path.split(/[/\\]/).pop() : `(${item.type})`;
}

let frLocations = { downloads: true, desktop: true, screenshots: true };
let frClipboard = true;

async function boot() {
  const settings = await window.thread.getSettings();
  if (!settings.firstRunComplete) {
    showFirstRun(settings);
  } else {
    showMain(settings);
  }
}

// ---- first run ----

function showFirstRun(settings) {
  document.getElementById("first-run").classList.remove("hidden");
  document.getElementById("fr-locations").innerHTML = settings.locations
    .map(
      (loc) => `
    <div class="fr-row">
      <span>${escapeHtml(loc.label)}${loc.exists ? "" : ' <span style="color:var(--text-faint)">(not found)</span>'}</span>
      <button class="switch on" data-fr-loc="${loc.id}"><span class="knob"></span></button>
    </div>`
    )
    .join("");

  document.getElementById("fr-locations").addEventListener("click", (e) => {
    const id = e.target.closest("[data-fr-loc]")?.dataset.frLoc;
    if (!id) return;
    frLocations[id] = !frLocations[id];
    e.target.closest(".switch").classList.toggle("on", frLocations[id]);
  });

  document.getElementById("fr-clipboard").addEventListener("click", (e) => {
    frClipboard = !frClipboard;
    e.currentTarget.classList.toggle("on", frClipboard);
  });

  document.getElementById("fr-start").addEventListener("click", async () => {
    await window.thread.completeFirstRun(frLocations);
    await window.thread.setClipboardEnabled(frClipboard);
    document.getElementById("first-run").classList.add("hidden");
    showMain(await window.thread.getSettings());
  });
}

// ---- main settings ----

function showMain(settings) {
  document.getElementById("main").classList.remove("hidden");
  renderWatching(settings);
  renderItems();
  renderPrivacy(settings);
}

async function renderWatching(settings) {
  const s = settings || (await window.thread.getSettings());
  document.getElementById("locations-list").innerHTML = s.locations
    .map(
      (loc) => `
    <div class="row">
      <div>
        <div>${escapeHtml(loc.label)}${loc.exists ? "" : ' <span style="color:var(--text-faint)">(folder not found)</span>'}</div>
        <div class="location-path">${escapeHtml(loc.path)}</div>
      </div>
      <button class="switch ${loc.enabled ? "on" : ""}" data-loc="${loc.id}"><span class="knob"></span></button>
    </div>`
    )
    .join("");
  const clipSwitch = document.getElementById("clipboard-switch");
  clipSwitch.classList.toggle("on", s.watchClipboard);
}

async function renderItems() {
  const items = await window.thread.getItems();
  document.getElementById("items-count").textContent = `· ${items.length}`;
  document.getElementById("items-list").innerHTML = items.length
    ? items
        .map(
          (item) => `
    <div class="item-row" data-item="${item.id}">
      <div class="item-main">
        <div class="item-name">${escapeHtml(itemLabel(item))}</div>
        <div class="item-meta">${item.type} · ${new Date(item.created_at).toLocaleString()}</div>
      </div>
      <button class="trash-btn" data-trash="${item.id}" data-path="${item.path ? escapeHtml(item.path) : ""}">Delete</button>
    </div>`
        )
        .join("")
    : '<div style="color:var(--text-faint);font-size:12.5px">Nothing indexed yet.</div>';
}

function renderPrivacy(settings) {
  const el = document.getElementById("api-status");
  el.className = `api-status ${settings.hasApiKey ? "on" : "off"}`;
  el.textContent = settings.hasApiKey
    ? "Real classification is on — Claude is deciding groupings."
    : "No ANTHROPIC_API_KEY set — Thread is using basic keyword matching instead of real classification. Set it as an environment variable before launching to turn this on.";
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
  });
});

document.getElementById("locations-list").addEventListener("click", async (e) => {
  const id = e.target.closest("[data-loc]")?.dataset.loc;
  if (!id) return;
  const sw = e.target.closest(".switch");
  const nowOn = !sw.classList.contains("on");
  await window.thread.setLocationEnabled(id, nowOn);
  sw.classList.toggle("on", nowOn);
});

document.getElementById("clipboard-switch").addEventListener("click", async (e) => {
  const nowOn = !e.currentTarget.classList.contains("on");
  await window.thread.setClipboardEnabled(nowOn);
  e.currentTarget.classList.toggle("on", nowOn);
});

document.getElementById("items-list").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-trash]");
  if (!btn) return;
  await window.thread.trashItem(Number(btn.dataset.trash), btn.dataset.path || null);
  renderItems();
});

window.thread.onUpdate(() => {
  if (!document.getElementById("main").classList.contains("hidden")) {
    renderWatching();
    renderItems();
  }
});

boot();
