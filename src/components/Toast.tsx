import { useEffect } from "react";
import { useTrailStore } from "../store/trailStore";

export function ToastHost() {
  const toast = useTrailStore((s) => s.toast);
  const clearToast = useTrailStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => clearToast(), 5000);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-8 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-toast-in"
      role="status"
    >
      <div className="paper-card mx-auto flex w-fit max-w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm">
        <span className="text-ink">{toast.message}</span>
        {toast.actionLabel && (
          <button
            onClick={() => {
              toast.onAction?.();
            }}
            className="shrink-0 font-medium text-accent-deep hover:underline"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          onClick={clearToast}
          className="shrink-0 text-ink-faint hover:text-ink"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
