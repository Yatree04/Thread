import { File, Globe, Image, MessageSquare } from "lucide-react";

export const ITEM_TYPE_META = {
  file: { icon: File, label: "file" },
  tab: { icon: Globe, label: "tab" },
  screenshot: { icon: Image, label: "screenshot" },
  chat: { icon: MessageSquare, label: "chat" },
};

export function ItemTypeIcon({ type, size = 13, className = "", style }) {
  const Icon = ITEM_TYPE_META[type]?.icon ?? File;
  return <Icon size={size} className={className} style={style} strokeWidth={1.75} />;
}

export function typeBreakdown(items) {
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] || 0) + 1;
  return counts;
}
