import { useState } from "react";
import { MoreHorizontal, Download, Share2, Trash2, Eye } from "lucide-react";
import { cn, formatBytes, formatDate, mimeLabel, fileExt } from "@/lib/utils";
import type { Props } from "@/interfaces";
import { MIME_COLORS, STATUS_DOT } from "@/constants";
import { useCardThumbnail } from "@/hooks/useCardThumbnail";

export function AssetCard({
  asset,
  onView,
  onShare,
  onDelete,
  onDownload,
}: Props) {
  const [open, setOpen] = useState(false);
  const thumbnailUrl = useCardThumbnail(asset);
  const type = mimeLabel(asset.mime_type);
  const color =
    MIME_COLORS[type] ?? "from-zinc-800/40 to-zinc-900/20 text-zinc-400";

  return (
    <div
      onClick={() => onView(asset)}
      className="group border-border bg-card hover:border-border/80 hover:bg-accent/30 relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition-all duration-150"
    >
      {/* Thumbnail area */}
      <div
        className={cn(
          "relative flex h-24 items-center justify-center overflow-hidden bg-linear-to-br",
          color
        )}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={asset.original_filename}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="font-mono text-2xl font-bold opacity-60 select-none">
            {fileExt(asset.original_filename)}
          </span>
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

        {/* Status dot */}
        <div
          className={cn(
            "absolute top-2 right-2 h-1.5 w-1.5 rounded-full",
            STATUS_DOT[asset.status]
          )}
          title={asset.status}
        />
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p
          className="text-foreground truncate text-[12px] leading-snug font-medium"
          title={asset.original_filename}
        >
          {asset.original_filename}
        </p>
        <p className="text-muted-foreground text-[10px]">
          {type} · {formatBytes(asset.size_bytes)}
        </p>
        <p className="text-muted-foreground/60 text-[10px]">
          {formatDate(asset.created_at)}
        </p>
        {asset.Tags && asset.Tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {asset.Tags.slice(0, 2).map((t) => (
              <span
                key={t.id}
                className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 text-[9px]"
              >
                {t.name}
              </span>
            ))}
            {asset.Tags.length > 2 && (
              <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 text-[9px]">
                +{asset.Tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Kebab */}
      <button
        className="bg-card/80 hover:bg-accent absolute top-26 right-2 flex h-6 w-6 items-center justify-center rounded-md opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="Options"
      >
        <MoreHorizontal size={12} className="text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="border-border bg-card absolute top-33 right-2 z-20 min-w-32.5 rounded-lg border py-0.5 shadow-xl">
            {[
              { icon: Eye, label: "View", fn: () => onView(asset) },
              {
                icon: Download,
                label: "Download",
                fn: () => onDownload(asset),
                disabled: asset.status !== "ready",
              },
              {
                icon: Share2,
                label: "Share",
                fn: () => onShare(asset),
                disabled: asset.status !== "ready",
              },
              {
                icon: Trash2,
                label: "Delete",
                fn: () => onDelete(asset),
                danger: true,
              },
            ].map(({ icon: Icon, label, fn, disabled, danger }) => (
              <button
                key={label}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors disabled:pointer-events-none disabled:opacity-35",
                  danger
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-foreground hover:bg-accent"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  fn();
                }}
              >
                <Icon size={11} /> {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
