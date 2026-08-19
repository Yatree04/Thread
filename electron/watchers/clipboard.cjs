// Real clipboard watcher (spec 0.1) — polls the OS clipboard for changes.
// Electron has no clipboard change *event*, so polling is the standard approach.
const { clipboard } = require('electron');

/**
 * @param {(clip: {title: string, detail: string}) => void} onNewClip
 * @param {number} intervalMs
 * @returns {() => void} stop function
 */
function watchClipboard(onNewClip, intervalMs = 2500) {
  let last = clipboard.readText();

  const timer = setInterval(() => {
    let text;
    try {
      text = clipboard.readText();
    } catch {
      return;
    }
    if (!text || text === last) return;
    last = text;
    if (text.trim().length < 3 || text.length > 4000) return;

    const title = text.length > 60 ? `“${text.slice(0, 60).trim()}…”` : `“${text.trim()}”`;
    onNewClip({ title, detail: text });
  }, intervalMs);

  return () => clearInterval(timer);
}

module.exports = { watchClipboard };
