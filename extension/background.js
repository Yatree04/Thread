import { api } from "./lib/api.js";

const TRACKABLE_URL = /^https?:\/\//;

async function getSeenTabs() {
  const { seenTabs } = await chrome.storage.session.get("seenTabs");
  return seenTabs || {};
}

async function setSeenTabs(seenTabs) {
  await chrome.storage.session.set({ seenTabs });
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url || !TRACKABLE_URL.test(tab.url)) return;

  const seenTabs = await getSeenTabs();
  if (seenTabs[tabId] === tab.url) return; // same page, not a new navigation
  seenTabs[tabId] = tab.url;
  await setSeenTabs(seenTabs);

  try {
    await api.postItem({ type: "tab", name: tab.title || tab.url, url: tab.url, context: "open browser tab" });
    refreshBadge();
  } catch (err) {
    // Companion app probably isn't running — fail quietly, this fires a lot.
    console.debug("[thread] companion unreachable:", err.message);
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const seenTabs = await getSeenTabs();
  delete seenTabs[tabId];
  await setSeenTabs(seenTabs);
});

chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current !== "complete") return;
  try {
    const [item] = await chrome.downloads.search({ id: delta.id });
    if (!item?.filename) return;
    const name = item.filename.split(/[\\/]/).pop();
    await api.postItem({ type: "file", name, path: item.filename, context: "download" });
    refreshBadge();
  } catch (err) {
    console.debug("[thread] companion unreachable:", err.message);
  }
});

async function refreshBadge() {
  try {
    const needsReview = await api.needsReview();
    const count = needsReview.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#5FCBC2" });
  } catch {
    chrome.action.setBadgeText({ text: "" });
  }
}

chrome.alarms.create("refresh-badge", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refresh-badge") refreshBadge();
});

refreshBadge();
