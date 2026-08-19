// Reports the active tab's title + URL to the local Trails app whenever it
// changes. This is the only way a desktop app can see real browser tabs
// without deep OS-level integration — the extension is the "browser tab
// watcher" from the system spec (section 0.1).
const BRIDGE_URL = 'http://127.0.0.1:8934/tab-event';

let lastSent = '';

function report(tab) {
  if (!tab || !tab.url || !tab.title) return;
  if (!/^https?:\/\//i.test(tab.url)) return; // skip chrome://, file://, etc.

  const key = `${tab.title}::${tab.url}`;
  if (key === lastSent) return;
  lastSent = key;

  fetch(BRIDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: tab.title, url: tab.url }),
  }).catch(() => {
    // Trails app probably isn't running — that's fine, just drop it.
  });
}

function reportActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => report(tab));
}

chrome.tabs.onActivated.addListener(reportActiveTab);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) report(tab);
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) reportActiveTab();
});
