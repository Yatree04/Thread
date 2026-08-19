// Local HTTP bridge (127.0.0.1 only) that the companion browser extension
// posts real active-tab changes to — this is how "browser tab watcher" (0.1)
// gets real data without Electron reaching into the browser itself.
const http = require('http');

const PORT = 8934;

/**
 * @param {(tab: {title: string, detail: string}) => void} onNewTab
 * @returns {() => void} stop function
 */
function startBridgeServer(onNewTab) {
  let lastKey = '';

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method !== 'POST' || req.url !== '/tab-event') {
      res.writeHead(404);
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 20_000) req.destroy(); // guard against abuse
    });
    req.on('end', () => {
      try {
        const { title, url } = JSON.parse(body || '{}');
        if (!title || !url) throw new Error('missing title/url');
        const key = `${title}::${url}`;
        if (key !== lastKey) {
          lastKey = key;
          onNewTab({ title, detail: url });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
      }
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[trails] browser bridge listening on http://127.0.0.1:${PORT}`);
  });
  server.on('error', (err) => console.error('[trails] bridge server error:', err));

  return () => server.close();
}

module.exports = { startBridgeServer, PORT };
