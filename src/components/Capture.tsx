import { useRef, useState } from "react";
import { Camera, Check, Image as ImageIcon, Link as LinkIcon, Minus, Send, X } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { MemberTypeIcon, WaypointIcon } from "./icons";
import { TrailPicker } from "./TrailPicker";
import { electronAPI, isElectron } from "../lib/electron";
import type { MemberType } from "../types";

interface Attachment {
  kind: "screenshot" | "image" | "link";
  label: string;
  detail?: string;
}

const TYPE_FOR_ATTACHMENT: Record<Attachment["kind"], MemberType> = {
  screenshot: "screenshot",
  image: "file",
  link: "tab",
};

/**
 * Surface — Capture (reference: CapturePanel.tsx). Quick-capture composer:
 * type a note, attach a real screenshot/image/link, and it's filed through
 * the real clustering pipeline. Ambiguity (low confidence / unfiled) is
 * decided by the real AI classifier, not a fake keyword check — the person
 * is only asked to pick manually when the model genuinely isn't sure.
 */
export function Capture() {
  const trails = useTrailStore((s) => s.trails);
  const items = useTrailStore((s) => s.items);
  const quickCapture = useTrailStore((s) => s.quickCapture);
  const moveMember = useTrailStore((s) => s.moveMember);
  const createTrail = useTrailStore((s) => s.createTrail);

  const [minimized, setMinimized] = useState(false);
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ambiguousFor, setAmbiguousFor] = useState<{ itemId: string; suggestedName?: string } | null>(null);
  const [drafts, setDrafts] = useState<{ itemId: string; text: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 0 || attachment !== null;

  async function handleScreenshot() {
    if (!isElectron || !electronAPI) return;
    const res = await electronAPI.captureScreenshot();
    if (res) setAttachment({ kind: "screenshot", label: `Screenshot — ${new Date().toLocaleTimeString()}`, detail: res.path });
  }

  async function handlePickImage() {
    if (isElectron && electronAPI) {
      const path = await electronAPI.pickImageFile();
      if (path) setAttachment({ kind: "image", label: path.split(/[\\/]/).pop() || "image", detail: path });
      return;
    }
    fileInputRef.current?.click();
  }

  function handleLocalFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment({ kind: "image", label: file.name, detail: `${Math.round(file.size / 1024)}KB` });
    e.target.value = "";
  }

  function confirmLink() {
    if (!linkValue.trim()) return;
    setAttachment({ kind: "link", label: linkValue.trim(), detail: linkValue.trim() });
    setLinkOpen(false);
    setLinkValue("");
  }

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const result = await quickCapture({
      text,
      attachmentType: attachment ? TYPE_FOR_ATTACHMENT[attachment.kind] : undefined,
      attachmentTitle: attachment?.label,
      attachmentDetail: attachment?.detail,
    });
    setSubmitting(false);
    setDrafts((d) => [{ itemId: result.itemId, text: text.trim() || attachment?.label || "" }, ...d].slice(0, 8));

    const confident = result.decision.action !== "unfiled" && (result.decision.confidence ?? 0) >= 65;
    if (!confident) setAmbiguousFor({ itemId: result.itemId, suggestedName: result.decision.name });

    setText("");
    setAttachment(null);
  }

  // Minimized state: a small pull-tab docked at the top of the window, so
  // Capture can be tucked out of the way without losing whatever's half-typed
  // (draft text/attachment stay in state) and without fully closing it.
  if (minimized) {
    const preview = text.trim() || attachment?.label;
    return (
      <div className="flex h-full items-start justify-end p-3">
        <button
          onClick={() => setMinimized(false)}
          className="paper-card trail-texture flex max-w-[220px] items-center gap-2 rounded-full px-3 py-2 shadow-lg hover:brightness-95"
        >
          <WaypointIcon size={13} />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">
            {preview || "Quick Capture"}
          </span>
          {preview && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-ink-soft">
          <WaypointIcon size={15} />
          <span className="text-xs font-medium tracking-wide uppercase">Quick Capture</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setMinimized(true)}
            className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
            aria-label="Minimize"
            title="Minimize (keeps your draft)"
          >
            <Minus size={14} />
          </button>
          {isElectron && (
            <button
              onClick={() => electronAPI!.hideCapture()}
              className="rounded-full p-1.5 text-ink-faint hover:bg-paper-deep hover:text-ink"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="paper-card trail-texture flex flex-1 flex-col overflow-hidden rounded-3xl">
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a note, paste a link, or attach something…"
            rows={4}
            className="w-full resize-none rounded-2xl border border-line bg-paper-raised p-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {attachment && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-paper-deep/50 px-3 py-2">
              <MemberTypeIcon type={TYPE_FOR_ATTACHMENT[attachment.kind]} size={14} className="text-ink-faint" />
              <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">{attachment.label}</span>
              <button onClick={() => setAttachment(null)} className="shrink-0 text-ink-faint hover:text-ink">
                <X size={12} />
              </button>
            </div>
          )}

          {linkOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmLink();
              }}
              className="mt-2 flex gap-1.5"
            >
              <input
                autoFocus
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-lg border border-line bg-paper-raised px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button type="submit" className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-paper-raised">
                Add
              </button>
            </form>
          )}

          <div className="mt-2 flex items-center gap-1.5">
            <AttachButton icon={<Camera size={13} />} label="Screenshot" onClick={handleScreenshot} disabled={!isElectron} />
            <AttachButton icon={<ImageIcon size={13} />} label="Image" onClick={handlePickImage} />
            <AttachButton icon={<LinkIcon size={13} />} label="Link" onClick={() => setLinkOpen((v) => !v)} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocalFile} />
          </div>

          {ambiguousFor && (
            <div className="mt-3 rounded-2xl border border-amber/40 bg-paper-deep/40 p-3">
              <p className="mb-2 text-xs font-medium text-ink">
                Not sure where this goes{ambiguousFor.suggestedName ? ` — maybe "${ambiguousFor.suggestedName}"?` : ""}. Pick a Trail:
              </p>
              <TrailPicker
                title="File this capture under…"
                trails={trails.filter((t) => !t.rejected)}
                onPick={(trailId) => {
                  moveMember(ambiguousFor.itemId, trailId);
                  setAmbiguousFor(null);
                }}
                onCreateNew={(name) => {
                  createTrail(name, [ambiguousFor.itemId]);
                  setAmbiguousFor(null);
                }}
                onClose={() => setAmbiguousFor(null)}
              />
            </div>
          )}

          {drafts.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">Recent captures</p>
              <div className="space-y-1">
                {drafts.map((d) => {
                  const liveItem = items.find((i) => i.id === d.itemId);
                  const trail = liveItem?.trailId ? trails.find((t) => t.id === liveItem.trailId) : null;
                  return (
                    <div key={d.itemId} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs">
                      {trail ? (
                        <Check size={12} className="shrink-0 text-good" />
                      ) : (
                        <span className="h-3 w-3 shrink-0 rounded-full border border-line" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-ink-soft">{d.text}</span>
                      <span className="shrink-0 text-[10px] text-ink-faint">{trail ? trail.name : "unfiled"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-2.5 text-sm font-medium text-paper disabled:opacity-40"
          >
            <Send size={14} />
            {submitting ? "Filing…" : "Capture"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttachButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} (desktop app only)` : label}
      className="flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:border-accent-soft disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}
