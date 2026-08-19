import { useTrailStore } from "../store/trailStore";
import { MemberTypeIcon, ConfidenceDot } from "./icons";

/**
 * A minimal mock "desktop" of files/screenshots/tabs/clipboard items so the
 * right-click Context Menu (Surface 4) has real, live items to operate on.
 * In the real product these tiles would be actual OS files/windows; here
 * they're stand-ins driven by the same Trail Store every other surface reads.
 */
export function Desktop() {
  const items = useTrailStore((s) => s.items);
  const trails = useTrailStore((s) => s.trails);
  const openContextMenu = useTrailStore((s) => s.openContextMenu);

  return (
    <div className="relative z-0 grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-4 p-8 pb-40">
      {items.map((item) => {
        const trail = item.trailId ? trails.find((t) => t.id === item.trailId) : null;
        return (
          <button
            key={item.id}
            onContextMenu={(e) => {
              e.preventDefault();
              openContextMenu(item.id, e.clientX, e.clientY);
            }}
            onClick={(e) => {
              // Left-click also surfaces the menu — convenient for trackpads/touch.
              e.preventDefault();
              openContextMenu(item.id, e.clientX, e.clientY);
            }}
            className="group flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center hover:bg-paper-deep/60"
            title="Right-click for options"
          >
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-paper-raised text-ink-soft shadow-sm">
              <MemberTypeIcon type={item.type} size={20} />
              {trail && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-paper p-[3px] shadow">
                  <ConfidenceDot confidence={trail.confidence} size={7} />
                </span>
              )}
            </span>
            <span className="line-clamp-2 max-w-[112px] text-[11px] leading-tight text-ink-soft">
              {item.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
