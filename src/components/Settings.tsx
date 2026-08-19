import { useEffect, useState } from "react";
import { CheckCircle2, FolderPlus, X } from "lucide-react";
import { electronAPI, type ElectronSettings } from "../lib/electron";
import { WaypointIcon, MemberTypeIcon } from "./icons";

/** Real settings for the desktop app: the Anthropic API key and which
 * folders the file watcher looks at — nothing here exists in the browser demo. */
export function Settings() {
  const api = electronAPI!;
  const [settings, setSettings] = useState<ElectronSettings | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, [api]);

  async function refresh() {
    setSettings(await api.getSettings());
  }

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setSaving(true);
    await api.saveApiKey(keyInput.trim());
    setSaving(false);
    setSaved(true);
    setKeyInput("");
    await refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleAddFolder() {
    const folder = await api.pickFolder();
    if (!folder) return;
    await api.addWatchFolder(folder);
    await refresh();
  }

  async function handleRemoveFolder(folder: string) {
    await api.removeWatchFolder(folder);
    await refresh();
  }

  return (
    <div className="trail-texture flex h-screen w-screen flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <WaypointIcon size={16} />
          <h1 className="font-serif-display text-lg text-ink">Settings</h1>
        </div>
        <button
          onClick={() => window.close()}
          className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-5">
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-medium text-ink">AI clustering</h2>
          <p className="mb-3 text-xs text-ink-faint">
            Trails uses the Anthropic API to decide which Trail a new item belongs to.
            Without a key, detected items still show up — they just land unfiled.
          </p>

          {settings?.hasApiKey ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-paper-raised px-3 py-2.5 text-sm text-good">
              <CheckCircle2 size={16} />
              Connected
            </div>
          ) : (
            <form onSubmit={handleSaveKey} className="space-y-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-…"
                className="w-full rounded-xl border border-line bg-paper-raised px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving || !keyInput.trim()}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-paper-raised hover:bg-accent-deep disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save key"}
                </button>
                {saved && <span className="text-xs text-good">Saved — connected.</span>}
              </div>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs text-accent-deep hover:underline"
              >
                Get a key from console.anthropic.com →
              </a>
            </form>
          )}
        </section>

        <section>
          <h2 className="mb-1 text-sm font-medium text-ink">Watched folders</h2>
          <p className="mb-3 text-xs text-ink-faint">
            Trails watches these folders (top level only) for new files in real time.
          </p>

          <div className="mb-2 space-y-1.5">
            {settings?.defaultFolders.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 rounded-lg bg-paper-deep/60 px-2.5 py-2 text-xs text-ink-soft"
              >
                <MemberTypeIcon type="file" size={13} />
                <span className="truncate">{f}</span>
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-ink-faint">
                  default
                </span>
              </div>
            ))}
            {settings?.extraFolders.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 rounded-lg border border-line bg-paper-raised px-2.5 py-2 text-xs text-ink-soft"
              >
                <MemberTypeIcon type="file" size={13} />
                <span className="truncate">{f}</span>
                <button
                  onClick={() => handleRemoveFolder(f)}
                  className="ml-auto shrink-0 rounded-full p-0.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
                  aria-label="Stop watching this folder"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddFolder}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-paper-deep"
          >
            <FolderPlus size={13} />
            Add a folder…
          </button>
        </section>
      </div>
    </div>
  );
}
