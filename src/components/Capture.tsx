import { useEffect, useRef, useState } from "react";
import { Camera, Check, Image as ImageIcon, Link as LinkIcon, Minus, Send, X } from "lucide-react";
import { useTrailStore } from "../store/trailStore";
import { ConfidenceDot, MemberTypeIcon, WaypointIcon } from "./icons";
import { electronAPI, isElectron } from "../lib/electron";
import type { MemberType, Trail } from "../types";

interface Attachment {
  kind: "screenshot" | "image" | "link";
  label: string;
  detail?: string;
}

interface ThreadMessage {
  itemId: string;
  text: string;
  ambiguous: boolean;
  suggestedName?: string;
}

const TYPE_FOR_ATTACHMENT: Record<Attachment["kind"], MemberType> = {
  screenshot: "screenshot",
  image: "file",
  link: "tab",
};

/**
 * Surface — Capture (reference: CapturePanel.tsx). A conversational quick-
 * capture composer: what you type appears as your own message, and the app
 * "replies" underneath with where it actually landed — filed under a Trail,
 * or a real pick-a-Trail prompt when the AI classifier genuinely isn't sure
 * (never a fake keyword guess).
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
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.length]);

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

    const confident = result.decision.action !== "unfiled" && (result.decision.confidence ?? 0) >= 65;
    setThread((t) => [
      ...t,
      {
        itemId: result.itemId,
        text: text.trim() || attachment?.label || "",
        ambiguous: !confident,
        suggestedName: result.decision.name,
      },
    ]);

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
        <div className="flex-1 overflow-y-auto no-scrollbar p-3">
          {thread.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-xs leading-relaxed text-ink-faint">
                Type a note, paste a link, or attach something below — it's filed
                automatically as you go.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {thread.map((m) => (
                <ThreadBubble
                  key={m.itemId}
                  message={m}
                  trails={trails}
                  items={items}
                  onPick={(trailId) => moveMember(m.itemId, trailId)}
                  onCreateNew={(name) => createTrail(name, [m.itemId])}
                />
              ))}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-line p-3">
          {attachment && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-paper-deep/50 px-3 py-2">
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
              className="mb-2 flex gap-1.5"
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

          <div className="flex items-end gap-1.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type a note, paste a link, or attach something…"
              rows={2}
              className="flex-1 resize-none rounded-2xl border border-line bg-paper-raised p-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              aria-label="Capture"
              title="Capture"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <AttachButton icon={<Camera size={13} />} label="Screenshot" onClick={handleScreenshot} disabled={!isElectron} />
            <AttachButton icon={<ImageIcon size={13} />} label="Image" onClick={handlePickImage} />
            <AttachButton icon={<LinkIcon size={13} />} label="Link" onClick={() => setLinkOpen((v) => !v)} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLocalFile} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** One turn of the conversation: your capture as an outgoing bubble, with the
 * app's real filing outcome as a reply underneath — live (reads the current
 * store), not a snapshot, so it stays correct if you later resolve it manually. */
function ThreadBubble({
  message,
  trails,
  items,
  onPick,
  onCreateNew,
}: {
  message: ThreadMessage;
  trails: Trail[];
  items: { id: string; trailId: string | null }[];
  onPick: (trailId: string) => void;
  onCreateNew: (name: string) => void;
}) {
  const liveItem = items.find((i) => i.id === message.itemId);
  const trail = liveItem?.trailId ? trails.find((t) => t.id === liveItem.trailId) : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-ink px-3 py-1.5 text-[12px] text-paper">
        {message.text}
      </div>
      {trail ? (
        <div className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-md bg-paper-deep/70 px-2.5 py-1.5 text-[11px] text-ink-soft">
          <Check size={11} className="shrink-0 text-good" />
          Filed under <span className="font-medium text-ink">{trail.name}</span>
        </div>
      ) : message.ambiguous ? (
        <div className="w-[88%] self-start rounded-2xl rounded-bl-md bg-paper-deep/70 p-2.5">
          <p className="mb-1.5 text-[11px] text-ink-soft">
            Not sure where this goes{message.suggestedName ? ` — maybe "${message.suggestedName}"?` : ""}
          </p>
          <InlineTrailPicker
            trails={trails.filter((t) => !t.rejected)}
            suggestedName={message.suggestedName}
            onPick={onPick}
            onCreateNew={onCreateNew}
          />
        </div>
      ) : (
        <div className="self-start rounded-2xl rounded-bl-md bg-paper-deep/70 px-2.5 py-1.5 text-[11px] text-ink-faint">
          Not yet grouped
        </div>
      )}
    </div>
  );
}

function InlineTrailPicker({
  trails,
  suggestedName,
  onPick,
  onCreateNew,
}: {
  trails: Trail[];
  suggestedName?: string;
  onPick: (trailId: string) => void;
  onCreateNew: (name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(suggestedName ?? "");
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  return (
    <div className="space-y-1">
      {trails.slice(0, 4).map((t) => (
        <button
          key={t.id}
          onClick={() => {
            onPick(t.id);
            setResolved(true);
          }}
          className="flex w-full items-center gap-1.5 rounded-lg bg-paper-raised px-2 py-1 text-left hover:brightness-95"
        >
          <ConfidenceDot confidence={t.confidence} size={5} />
          <span className="truncate text-[11px] text-ink">{t.name}</span>
        </button>
      ))}
      {creating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onCreateNew(name.trim());
            setResolved(true);
          }}
          className="flex gap-1"
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trail name…"
            className="flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button type="submit" className="rounded-lg bg-accent px-2 py-1 text-[11px] font-medium text-paper-raised">
            Add
          </button>
        </form>
      ) : (
        <button onClick={() => setCreating(true)} className="text-[11px] font-medium text-accent-deep hover:underline">
          + New Trail…
        </button>
      )}
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
