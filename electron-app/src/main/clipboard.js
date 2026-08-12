const { clipboard } = require("electron");
const { getSetting } = require("./db");
const { classifyAndFile } = require("./clustering");
const events = require("./events");

const POLL_MS = 1500;
const MIN_LEN = 8;
const MAX_LEN = 4000; // guard against pasting huge blobs

let lastText = "";

function safeReadText() {
  try {
    return clipboard.readText() || "";
  } catch {
    return "";
  }
}

function startClipboardWatcher() {
  lastText = safeReadText();
  setInterval(async () => {
    if (getSetting("watchClipboard", true) === false) return;

    const text = safeReadText();
    if (!text || text === lastText) return;
    lastText = text;
    if (text.trim().length < MIN_LEN || text.length > MAX_LEN) return;

    events.emit("watcher:new-item", { type: "clipboard" });

    try {
      await classifyAndFile({
        type: "clipboard",
        name: text.trim().slice(0, 60).replace(/\s+/g, " "),
        contentExcerpt: text.trim().slice(0, 300),
      });
    } catch (err) {
      console.error("[clipboard] classify failed:", err.message);
    }
  }, POLL_MS);
}

module.exports = { startClipboardWatcher };
