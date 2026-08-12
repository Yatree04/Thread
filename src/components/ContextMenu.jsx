import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Link2,
  Plus,
} from "lucide-react";
import ConfidenceDot from "./ConfidenceDot";
import { ItemTypeIcon } from "./itemIcons";

const KIND_ICON = { ai: FileImage, pdf: FileText, xlsx: FileSpreadsheet, docx: FileText };

const NATIVE_ITEMS = ["Open", "Get Info", "Rename", "Duplicate", "Move to Trash"];

function threadConfidence(thread) {
  return thread.items.some((i) => i.confidence === "suggested") ? "suggested" : "confirmed";
}

function AddToThreadSubmenu({ threads, onPick, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 10);
  }, [creating]);

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) onCreate(trimmed);
  };

  return (
    <div
      className="absolute left-full top-0 ml-1 w-[220px] rounded-[10px] py-1.5 shadow-2xl"
      style={{ background: "var(--color-surface-elevated-2)", border: "1px solid var(--color-border)" }}
    >
      {!creating ? (
        <>
          <div
            className="px-3 pb-1 pt-0.5 text-[10px] uppercase tracking-wider"
            style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            All Threads
          </div>
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/5"
              style={{ color: "var(--color-text-primary)" }}
            >
              <ConfidenceDot confidence={threadConfidence(t)} />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
          <div className="my-1" style={{ borderTop: "1px solid var(--color-border-soft)" }} />
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/5"
            style={{ color: "var(--color-accent)" }}
          >
            <Plus size={13} />
            New Thread
          </button>
        </>
      ) : (
        <div className="px-2.5 py-1.5">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Name this Thread…"
            className="w-full rounded-md px-2 py-1.5 text-[12.5px] outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
          />
          <button
            onClick={submit}
            className="mt-1.5 w-full rounded-md py-1.5 text-[12px] font-medium"
            style={{ background: "var(--color-accent)", color: "#0F1512" }}
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
}

function FileMenu({ file, guess, assignedThread, threads, position, onClose, onAdd, onCreateThread }) {
  const [addOpen, setAddOpen] = useState(false);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const linkedThread = assignedThread || (guess.guessThreadId ? threads.find((t) => t.id === guess.guessThreadId) : null);
  const linkedItems = linkedThread ? linkedThread.items : [];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-[248px] rounded-[12px] py-1.5 shadow-2xl"
      style={{ left: position.x, top: position.y, background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)" }}
    >
      {/* Thread section — visually set apart from native OS items below */}
      <div className="rounded-[9px] mx-1.5 mb-1.5 py-1" style={{ background: "var(--color-accent-wash)" }}>
        <div
          className="px-2.5 pt-0.5 pb-1 text-[10px] uppercase tracking-wider"
          style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}
        >
          Thread
        </div>

        {assignedThread ? (
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px]" style={{ color: "var(--color-text-dim)" }}>
            <ConfidenceDot confidence="confirmed" />
            Linked to <span style={{ color: "var(--color-text-primary)" }}>{assignedThread.name}</span>
          </div>
        ) : guess.guessThreadId ? (
          <button
            onClick={() => {
              onAdd(guess.guessThreadId);
              onClose();
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/5 rounded-md"
            style={{ color: "var(--color-text-primary)" }}
          >
            <ConfidenceDot confidence={guess.guessConfidence} />
            <span className="truncate">
              Add to <span style={{ fontWeight: 600 }}>{threads.find((t) => t.id === guess.guessThreadId)?.name}</span>
            </span>
          </button>
        ) : (
          <div className="px-2.5 py-1.5 text-[12.5px]" style={{ color: "var(--color-text-faint)" }}>
            No confident match yet
          </div>
        )}

        <div
          className="relative"
          onMouseEnter={() => setAddOpen(true)}
          onMouseLeave={() => setAddOpen(false)}
        >
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/5 rounded-md"
            style={{ color: "var(--color-text-dim)" }}
          >
            <span>Add to Thread</span>
            <ChevronRight size={13} />
          </button>
          {addOpen && (
            <AddToThreadSubmenu
              threads={threads}
              onPick={(threadId) => {
                onAdd(threadId);
                onClose();
              }}
              onCreate={(name) => {
                onCreateThread(name);
                onClose();
              }}
            />
          )}
        </div>

        <button
          onClick={() => linkedItems.length > 0 && setLinkedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/5 rounded-md"
          style={{ color: "var(--color-text-dim)", opacity: linkedItems.length === 0 ? 0.5 : 1, cursor: linkedItems.length === 0 ? "default" : "pointer" }}
          disabled={linkedItems.length === 0}
        >
          <span className="flex items-center gap-1.5">
            <Link2 size={12.5} />
            Show what's linked to this file
          </span>
          <span
            className="rounded-full px-1.5 text-[10.5px]"
            style={{ background: "var(--color-surface-elevated-2)", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            {linkedItems.length}
          </span>
        </button>
        {linkedOpen && linkedItems.length > 0 && (
          <div className="mx-2.5 mb-1 mt-0.5 flex flex-col gap-1 rounded-md p-1.5" style={{ background: "var(--color-surface)" }}>
            {linkedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--color-text-dim)" }}>
                <ItemTypeIcon type={item.type} size={11} />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Native OS items — plain, unstyled, no accent tinting */}
      {NATIVE_ITEMS.map((label) => (
        <button
          key={label}
          onClick={onClose}
          className="flex w-full items-center px-3 py-1.5 text-left text-[12.5px] transition-colors hover:bg-white/5"
          style={{ color: label === "Move to Trash" ? "var(--color-danger)" : "var(--color-text-dim)" }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function ContextMenu({ files, threads, fileAssignments, onAdd, onCreateThread }) {
  const [menu, setMenu] = useState(null); // { file, guess, position }

  const openMenu = (e, file, guess) => {
    e.preventDefault();
    const menuWidth = 248;
    const menuHeight = 340;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);
    setMenu({ file, guess, position: { x: Math.max(12, x), y: Math.max(12, y) } });
  };

  return (
    <div className="w-full h-full">
      <div
        className="mx-auto mt-6 w-[560px] max-w-[92vw] rounded-[12px] overflow-hidden shadow-2xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border-soft)" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5 text-[12.5px]"
          style={{ background: "var(--color-surface-elevated)", color: "var(--color-text-dim)", borderBottom: "1px solid var(--color-border-soft)" }}
        >
          Documents
          <span style={{ color: "var(--color-text-faint)" }}>— right-click a file</span>
        </div>
        <div className="grid grid-cols-4 gap-4 p-6">
          {files.map((file) => {
            const Icon = KIND_ICON[file.kind] ?? File;
            const assignedThreadId = fileAssignments[file.id];
            const assignedThread = assignedThreadId ? threads.find((t) => t.id === assignedThreadId) : null;
            return (
              <button
                key={file.id}
                onContextMenu={(e) => openMenu(e, file, file)}
                onClick={(e) => e.preventDefault()}
                className="flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition-colors hover:bg-white/5"
              >
                <div className="relative">
                  <Icon size={30} strokeWidth={1.4} style={{ color: "var(--color-text-dim)" }} />
                  {assignedThread && (
                    <span
                      className="absolute -right-1 -bottom-1 rounded-full"
                      style={{ width: 8, height: 8, background: "var(--color-accent)", border: "2px solid var(--color-surface)" }}
                    />
                  )}
                </div>
                <span className="text-[11px] leading-tight break-all" style={{ color: "var(--color-text-dim)" }}>
                  {file.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {menu && (
        <FileMenu
          file={menu.file}
          guess={menu.guess}
          assignedThread={fileAssignments[menu.file.id] ? threads.find((t) => t.id === fileAssignments[menu.file.id]) : null}
          threads={threads}
          position={menu.position}
          onClose={() => setMenu(null)}
          onAdd={(threadId) => onAdd(menu.file.id, menu.file.name, threadId)}
          onCreateThread={(name) => onCreateThread(menu.file.id, menu.file.name, name)}
        />
      )}
    </div>
  );
}
