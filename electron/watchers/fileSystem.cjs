// Real filesystem watcher (spec 0.1) — watches the user's Desktop and
// Downloads folders (top-level only) for new files using chokidar.
const path = require('path');
const chokidar = require('chokidar');

const IGNORE_PATTERNS = [/\.tmp$/i, /\.crdownload$/i, /\.part$/i, /^desktop\.ini$/i, /^thumbs\.db$/i, /^\.ds_store$/i, /^\.~lock/i];

function shouldIgnore(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith('~$')) return true;
  return IGNORE_PATTERNS.some((re) => re.test(base));
}

/**
 * @param {string[]} folders absolute paths to watch (top-level files only)
 * @param {(file: {title: string, detail: string}) => void} onNewFile
 * @returns {() => void} stop function
 */
function watchFileSystem(folders, onNewFile) {
  const watcher = chokidar.watch(folders, {
    depth: 0,
    ignoreInitial: true,
    ignored: (p, stats) => (stats && stats.isFile() ? shouldIgnore(p) : false),
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 200 },
  });

  watcher.on('add', (filePath) => {
    if (shouldIgnore(filePath)) return;
    onNewFile({ title: path.basename(filePath), detail: filePath });
  });

  watcher.on('error', (err) => console.error('[trails] filesystem watcher error:', err));

  return () => watcher.close();
}

module.exports = { watchFileSystem };
