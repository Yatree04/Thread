import { useEffect, useMemo, useRef, useState } from "react";
import {
  File as FileIcon,
  Image as ImageIcon,
  Keyboard,
  MousePointerClick,
  PanelRight,
  Sparkles,
  SquareDashedMousePointer,
} from "lucide-react";
import ContinueCard from "./components/ContinueCard";
import CommandOverlay from "./components/CommandOverlay";
import SidePanel from "./components/SidePanel";
import ContextMenu from "./components/ContextMenu";
import ScreenshotTriageBar from "./components/ScreenshotTriageBar";
import TrayIndicator from "./components/TrayIndicator";
import Toast from "./components/Toast";
import { initialThreads, initialWatchedLocations, mockFiles, nextId } from "./data/mockThreads";

const VIEWS = [
  { id: "continue", label: "Continue Card", icon: Sparkles },
  { id: "command", label: "Command Overlay", icon: Keyboard },
  { id: "panel", label: "Side Panel", icon: PanelRight },
  { id: "context", label: "Context Menu", icon: MousePointerClick },
  { id: "screenshot", label: "Screenshot Triage", icon: ImageIcon },
];

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function DesktopBackdrop() {
  const icons = [
    { Icon: FileIcon, top: "14%", left: "8%" },
    { Icon: ImageIcon, top: "68%", left: "12%" },
    { Icon: FileIcon, top: "22%", left: "90%" },
    { Icon: ImageIcon, top: "78%", left: "86%" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(95,203,194,0.06), transparent), radial-gradient(40% 40% at 90% 100%, rgba(95,203,194,0.04), transparent)",
        }}
      />
      {icons.map(({ Icon, top, left }, i) => (
        <div key={i} className="absolute flex flex-col items-center gap-1" style={{ top, left, opacity: 0.06 }}>
          <Icon size={34} style={{ color: "var(--color-text-primary)" }} />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [threads, setThreads] = useState(initialThreads);
  const [activeView, setActiveView] = useState("continue");
  const [commandOpen, setCommandOpen] = useState(false);
  const [continueVisible, setContinueVisible] = useState(false);
  const [watchedLocations, setWatchedLocations] = useState(initialWatchedLocations);
  const [fileAssignments, setFileAssignments] = useState({});
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  const bump = () => setLastActivity(Date.now());

  const showToast = (msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  };

  // The Continue Card appears unprompted a few seconds after load — never on command.
  useEffect(() => {
    const t = setTimeout(() => setContinueVisible(true), 2200);
    return () => clearTimeout(t);
  }, []);

  // Global hotkey: Cmd/Ctrl+K opens the Command Overlay from any view.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const needsReview = useMemo(
    () =>
      threads.flatMap((thread) =>
        thread.items.filter((i) => i.confidence === "suggested").map((item) => ({ thread, item }))
      ),
    [threads]
  );

  const currentThread = useMemo(() => {
    const candidates = threads.filter((t) => t.state === "active" || t.state === "forming");
    return candidates.sort((a, b) => b.lastTouched - a.lastTouched)[0] ?? null;
  }, [threads]);

  const activeThreads = useMemo(
    () => threads.filter((t) => t.state === "active" || t.state === "forming"),
    [threads]
  );

  function handleAccept(threadId, itemId) {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, lastTouched: Date.now(), items: t.items.map((i) => (i.id === itemId ? { ...i, confidence: "confirmed" } : i)) }
          : t
      )
    );
    bump();
    showToast("Confirmed — thanks, that helps Thread group better.");
  }

  function handleReject(threadId, itemId) {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t))
    );
    bump();
    showToast("Removed — Thread will learn from this.");
  }

  function handleContinue() {
    if (!currentThread) return;
    setThreads((prev) => prev.map((t) => (t.id === currentThread.id ? { ...t, lastTouched: Date.now() } : t)));
    setContinueVisible(false);
    bump();
    showToast(`Reopened ${currentThread.items.length} items from ${currentThread.name}.`);
  }

  function handleToggleLocation(id) {
    setWatchedLocations((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
    bump();
  }

  function handleAddFileToThread(fileId, fileName, threadId) {
    let threadName = "";
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        threadName = t.name;
        if (t.items.some((i) => i.type === "file" && i.name === fileName)) return { ...t, lastTouched: Date.now() };
        return {
          ...t,
          lastTouched: Date.now(),
          state: t.state === "dormant" ? "active" : t.state,
          items: [...t.items, { id: nextId(), type: "file", name: fileName, confidence: "confirmed" }],
        };
      })
    );
    setFileAssignments((prev) => ({ ...prev, [fileId]: threadId }));
    bump();
    showToast(`Added to ${threadName}.`);
  }

  function handleCreateThreadFromFile(fileId, fileName, newName) {
    const id = `${slugify(newName)}-${nextId()}`;
    const newThread = {
      id,
      name: newName,
      state: "forming",
      lastTouched: Date.now(),
      summary: "Just started — Thread will learn more as you add items.",
      whyGrouped: `You started this Thread manually by adding "${fileName}".`,
      items: [{ id: nextId(), type: "file", name: fileName, confidence: "confirmed" }],
    };
    setThreads((prev) => [newThread, ...prev]);
    setFileAssignments((prev) => ({ ...prev, [fileId]: id }));
    bump();
    showToast(`Created "${newName}".`);
  }

  function handleScreenshotAccept(threadId, screenshotName) {
    let threadName = "";
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        threadName = t.name;
        return {
          ...t,
          lastTouched: Date.now(),
          state: t.state === "dormant" ? "active" : t.state,
          items: [...t.items, { id: nextId(), type: "screenshot", name: screenshotName, confidence: "confirmed" }],
        };
      })
    );
    bump();
    showToast(`Added to ${threadName}.`);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <nav
        className="flex shrink-0 items-center gap-1 px-3 py-2.5"
        style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border-soft)" }}
      >
        <div className="flex items-center gap-1.5 pr-3">
          <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--color-accent)" }} />
          <span className="text-[14px] font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--color-text-primary)" }}>
            Thread
          </span>
        </div>

        <div className="h-4 w-px mx-1" style={{ background: "var(--color-border)" }} />

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const isActive = activeView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors"
                style={{
                  background: isActive ? "var(--color-accent-wash)" : "transparent",
                  color: isActive ? "var(--color-accent)" : "var(--color-text-dim)",
                }}
              >
                <Icon size={13} />
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]"
            style={{ border: "1px solid var(--color-border-soft)", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            <SquareDashedMousePointer size={12} />
            ⌘K
          </button>
          <span
            className="hidden lg:inline text-[10.5px]"
            style={{ color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}
          >
            prototype navigation — not part of the product
          </span>
        </div>
      </nav>

      <main className="relative flex-1 overflow-hidden">
        {activeView === "continue" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <DesktopBackdrop />
            <div className="relative z-10 max-w-sm text-center">
              <div className="text-[13.5px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                The Continue Card appears on its own
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
                It showed up automatically a couple seconds after this page loaded — bottom right, like Thread
                would when you sit back down at your desk. Dismiss it and bring it back below.
              </p>
              <button
                onClick={() => setContinueVisible(true)}
                className="mt-4 rounded-full px-4 py-1.5 text-[12.5px]"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-dim)" }}
              >
                Show it again
              </button>
            </div>
          </div>
        )}

        {activeView === "command" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <DesktopBackdrop />
            <div className="relative z-10 max-w-sm text-center">
              <div className="text-[13.5px] font-medium" style={{ color: "var(--color-text-primary)" }}>
                Press <span style={{ color: "var(--color-accent)" }}>⌘K</span> or{" "}
                <span style={{ color: "var(--color-accent)" }}>Ctrl+K</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
                Works from anywhere in this prototype, not just this tab. Search Threads, expand a row to see why
                it was grouped.
              </p>
              <button
                onClick={() => setCommandOpen(true)}
                className="mt-4 rounded-full px-4 py-1.5 text-[12.5px]"
                style={{ background: "var(--color-accent)", color: "#0F1512" }}
              >
                Open Command Overlay
              </button>
            </div>
          </div>
        )}

        {activeView === "panel" && (
          <div className="absolute inset-0 flex">
            <div className="relative flex-1">
              <DesktopBackdrop />
              <div className="absolute inset-0 z-10 flex items-center justify-center px-8">
                <p className="max-w-xs text-center text-[12.5px] leading-relaxed" style={{ color: "var(--color-text-faint)" }}>
                  In the real product this panel is docked inside your file manager. Here it's shown standalone,
                  on the right.
                </p>
              </div>
            </div>
            <SidePanel
              threads={threads}
              needsReview={needsReview}
              onAccept={handleAccept}
              onReject={handleReject}
              watchedLocations={watchedLocations}
              onToggleLocation={handleToggleLocation}
            />
          </div>
        )}

        {activeView === "context" && (
          <div className="absolute inset-0 overflow-y-auto">
            <DesktopBackdrop />
            <div className="relative z-10 px-6 py-8">
              <ContextMenu
                files={mockFiles}
                threads={threads}
                fileAssignments={fileAssignments}
                onAdd={handleAddFileToThread}
                onCreateThread={handleCreateThreadFromFile}
              />
            </div>
          </div>
        )}

        {activeView === "screenshot" && (
          <div className="absolute inset-0">
            <DesktopBackdrop />
            <div className="relative z-10 h-full">
              <ScreenshotTriageBar activeThreads={activeThreads} onAccept={handleScreenshotAccept} />
            </div>
          </div>
        )}
      </main>

      <ContinueCard
        thread={currentThread}
        visible={continueVisible}
        onContinue={handleContinue}
        onDismiss={() => setContinueVisible(false)}
      />
      <CommandOverlay open={commandOpen} threads={threads} onClose={() => setCommandOpen(false)} />
      <TrayIndicator lastActivity={lastActivity} />
      <Toast message={toastMsg} />
    </div>
  );
}
