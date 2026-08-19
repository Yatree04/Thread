// User-editable settings: the Anthropic API key and extra watched folders.
// Kept separate from store.cjs (Trail data) since these are app config, not
// Trail Store content, and the API key file deliberately lives outside the
// app package (see main.cjs) so it never ends up bundled into a distributable.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const Store = require('electron-store');

const settingsStore = new Store({ name: 'trails-settings', defaults: { extraFolders: [] } });

function userEnvPath() {
  return path.join(app.getPath('userData'), '.env');
}

function saveApiKey(key) {
  const trimmed = (key || '').trim();
  const p = userEnvPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `ANTHROPIC_API_KEY=${trimmed}\n`);
  process.env.ANTHROPIC_API_KEY = trimmed;
  return trimmed;
}

function getExtraFolders() {
  return settingsStore.get('extraFolders');
}

function addExtraFolder(folderPath) {
  const list = getExtraFolders();
  if (folderPath && !list.includes(folderPath)) {
    list.push(folderPath);
    settingsStore.set('extraFolders', list);
  }
  return getExtraFolders();
}

function removeExtraFolder(folderPath) {
  settingsStore.set(
    'extraFolders',
    getExtraFolders().filter((f) => f !== folderPath)
  );
  return getExtraFolders();
}

module.exports = { userEnvPath, saveApiKey, getExtraFolders, addExtraFolder, removeExtraFolder };
