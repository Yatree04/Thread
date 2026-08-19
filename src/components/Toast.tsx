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
      className="fixed bottom-8 left-1/2 z-[80] animate-toast-in"
      role="status"
    >
      <div className="paper-card flex items-center gap-3 rounded-full px-4 py-2.5 text-sm">
        <span className="text-ink">{toast.message}</span>
        {toast.actionLabel && (
          <button
            onClick={() => {
              toast.onAction?.();
            }}
            className="font-medium text-accent-deep hover:underline"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          onClick={clearToast}
          className="text-ink-faint hover:text-ink"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
