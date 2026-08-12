const { EventEmitter } = require("node:events");

// Single shared bus: watcher/clipboard/clustering emit real events here,
// tray.js and windows.js react to them. Nothing on the UI side is
// timer-faked — the tray pulse and widget refresh are driven by this.
module.exports = new EventEmitter();
