import { File, Image, Globe, Clipboard, type LucideProps } from "lucide-react";
import type { Confidence, MemberType } from "../types";

/** Bespoke waypoint-pin brand mark — filled (active/branding) or outline (empty/inactive). */
export function WaypointIcon({
  variant = "filled",
  className,
  size = 18,
}: {
  variant?: "filled" | "outline";
  className?: string;
  size?: number;
}) {
  if (variant === "outline") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden
      >
        <path
          d="M12 3C8.5 3 5.5 5.8 5.5 9.4C5.5 14 12 21 12 21C12 21 18.5 14 18.5 9.4C18.5 5.8 15.5 3 12 3Z"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth={1.6} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3C8.5 3 5.5 5.8 5.5 9.4C5.5 14 12 21 12 21C12 21 18.5 14 18.5 9.4C18.5 5.8 15.5 3 12 3Z"
        fill="currentColor"
      />
      <circle cx="12" cy="9.5" r="2.4" fill="var(--color-paper)" />
    </svg>
  );
}

export function ConfidenceDot({
  confidence,
  size = 8,
  className = "",
  style: extraStyle,
}: {
  confidence: Confidence;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const style = { width: size, height: size, ...extraStyle };
  if (confidence >= 85) {
    return (
      <span
        className={`inline-block rounded-full bg-accent ${className}`}
        style={style}
        title={`${confidence}% — high confidence`}
      />
    );
  }
  if (confidence >= 65) {
    return (
      <span
        className={`inline-block rounded-full bg-amber ${className}`}
        style={style}
        title={`${confidence}% — medium confidence`}
      />
    );
  }
  return (
    <span
      className={`inline-block rounded-full border-[1.5px] border-ink-faint bg-transparent ${className}`}
      style={style}
      title={`${confidence}% — low confidence`}
    />
  );
}

const memberIconMap: Record<MemberType, React.ComponentType<LucideProps>> = {
  file: File,
  screenshot: Image,
  tab: Globe,
  clipboard: Clipboard,
};

export function MemberTypeIcon({
  type,
  size = 15,
  className = "",
}: {
  type: MemberType;
  size?: number;
  className?: string;
}) {
  const Icon = memberIconMap[type];
  return <Icon size={size} className={className} strokeWidth={1.8} />;
}
