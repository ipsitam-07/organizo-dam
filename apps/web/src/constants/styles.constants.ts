import type { AssetStatus } from "@/types/asset.types";

export const MIME_COLORS: Record<string, string> = {
  Image: "from-violet-900/40 to-violet-950/20 text-violet-300",
  Video: "from-blue-900/40 to-blue-950/20 text-blue-300",
  Audio: "from-pink-900/40 to-pink-950/20 text-pink-300",
  PDF: "from-red-900/40 to-red-950/20 text-red-300",
  Sheet: "from-emerald-900/40 to-emerald-950/20 text-emerald-300",
  Doc: "from-sky-900/40 to-sky-950/20 text-sky-300",
} as const;

export const STATUS_DOT: Record<AssetStatus, string> = {
  ready: "bg-primary",
  processing: "bg-amber-400 animate-pulse",
  queued: "bg-blue-400 animate-pulse",
  failed: "bg-destructive",
} as const;

export const STATUS_STYLE: Record<AssetStatus, string> = {
  ready: "text-primary border-primary/30 bg-primary/10",
  processing: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  queued: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  failed: "text-destructive border-destructive/30 bg-destructive/10",
} as const;
