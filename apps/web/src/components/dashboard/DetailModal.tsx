import { Fragment, useEffect, useRef, useState } from "react";
import {
  Download,
  Share2,
  Trash2,
  Tag,
  Music,
  Archive,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate, mimeLabel } from "@/lib/utils";
import { assetsApi } from "@/services/asset.service";
import type {
  AssetRenditionWithUrl,
  DetailProps,
  DownloadPickerProps,
  QualityPickerProps,
  PreviewProps,
} from "@/interfaces";
import { UI_STRINGS } from "@/constants";
import { cn } from "@/lib/utils";
import { STATUS_STYLE } from "@/constants";

const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "240p"];
function sortVideoRenditions(renditions: AssetRenditionWithUrl[]) {
  return [...renditions].sort((a, b) => {
    const ai = QUALITY_ORDER.indexOf(a.label);
    const bi = QUALITY_ORDER.indexOf(b.label);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// Quality picker

function QualityPicker({ options, selected, onSelect }: QualityPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="border-border bg-muted/50 text-foreground hover:bg-muted flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors"
      >
        {selected.label}
        {selected.height && (
          <span className="text-muted-foreground">· {selected.height}p</span>
        )}
        <ChevronDown
          size={11}
          className={cn(
            "text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-border bg-card absolute top-full right-0 z-20 mt-1 min-w-35 rounded-lg border py-1 shadow-xl">
          {options.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r);
                setOpen(false);
              }}
              className="hover:bg-accent flex w-full items-center justify-between gap-3 px-3 py-1.5 text-[11px] transition-colors"
            >
              <span className="text-foreground font-medium">{r.label}</span>
              <span className="text-muted-foreground">
                {r.size_bytes
                  ? formatBytes(r.size_bytes)
                  : r.height
                    ? `${r.height}p`
                    : ""}
              </span>
              {r.id === selected.id && (
                <Check size={10} className="text-primary shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// asset preview
function AssetPreview({ asset }: PreviewProps) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const isAudio = asset.mime_type.startsWith("audio/");
  const isPdf = asset.mime_type === "application/pdf";
  const canPreview =
    (isImage || isVideo || isAudio || isPdf) && asset.status === "ready";

  const [renditions, setRenditions] = useState<AssetRenditionWithUrl[]>([]);
  const [renditionsLoading, setRenditionsLoading] = useState(false);

  const videoRenditions = sortVideoRenditions(
    renditions.filter(
      (r) => r.rendition_type === "video" && r.status === "ready"
    )
  );
  const [selectedVideo, setSelectedVideo] =
    useState<AssetRenditionWithUrl | null>(null);

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalLoading, setOriginalLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canPreview) return;
    setError(false);

    if (isVideo) {
      setRenditionsLoading(true);
      assetsApi
        .getRenditions(asset.id)
        .then((rs) => {
          setRenditions(rs);
          const sorted = sortVideoRenditions(
            rs.filter(
              (r) => r.rendition_type === "video" && r.status === "ready"
            )
          );
          if (sorted.length > 0) setSelectedVideo(sorted[0]);
        })
        .catch(() => setError(true))
        .finally(() => setRenditionsLoading(false));
    } else {
      setOriginalLoading(true);
      assetsApi
        .getDownloadUrl(asset.id)
        .then(setOriginalUrl)
        .catch(() => setError(true))
        .finally(() => setOriginalLoading(false));
    }
  }, [asset.id, canPreview, isVideo]);

  if (!canPreview) {
    return (
      <div className="border-border bg-muted/30 flex h-40 items-center justify-center rounded-lg border">
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          {asset.status !== "ready" ? (
            <>
              <div className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-xs capitalize">{asset.status}…</span>
            </>
          ) : (
            <>
              <Archive size={28} strokeWidth={1.5} />
              <span className="text-xs">
                {UI_STRINGS.DETAIL_MODAL.NO_PREVIEW}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  if (renditionsLoading || originalLoading) {
    return (
      <div className="border-border bg-muted/30 flex h-40 items-center justify-center rounded-lg border">
        <div className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-border bg-muted/30 flex h-40 items-center justify-center rounded-lg border">
        <span className="text-muted-foreground text-xs">
          {UI_STRINGS.DETAIL_MODAL.PREVIEW_UNAVAILABLE}
        </span>
      </div>
    );
  }

  if (isVideo) {
    if (videoRenditions.length === 0) {
      return (
        <div className="border-border overflow-hidden rounded-lg border bg-black">
          <p className="text-muted-foreground px-3 py-2 text-center text-[10px]">
            {UI_STRINGS.DETAIL_MODAL.TRANSCODING_IN_PROGRESS}
          </p>
          {originalUrl ? (
            <video
              key={originalUrl}
              src={originalUrl}
              controls
              className="max-h-64 w-full"
              preload="metadata"
            />
          ) : (
            <div className="flex h-32 items-center justify-center">
              <div className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="border-border overflow-hidden rounded-lg border bg-black">
        <div className="flex items-center justify-between bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-muted-foreground text-[10px]">
            {videoRenditions.length} {UI_STRINGS.DETAIL_MODAL.QUALITY_OPTION}
            {videoRenditions.length !== 1 ? "s" : ""}{" "}
            {UI_STRINGS.DETAIL_MODAL.AVAILABLE}
          </span>
          {selectedVideo && (
            <QualityPicker
              options={videoRenditions}
              selected={selectedVideo}
              onSelect={(r) => setSelectedVideo(r)}
            />
          )}
        </div>
        {selectedVideo && (
          <video
            key={selectedVideo.url}
            src={selectedVideo.url}
            controls
            className="max-h-64 w-full"
            preload="metadata"
          />
        )}
      </div>
    );
  }

  if (isImage && originalUrl) {
    return (
      <div className="border-border bg-muted/20 overflow-hidden rounded-lg border">
        <img
          src={originalUrl}
          alt={asset.original_filename}
          className="max-h-72 w-full object-contain"
        />
      </div>
    );
  }

  if (isAudio && originalUrl) {
    return (
      <div className="border-border bg-muted/30 flex flex-col items-center gap-3 rounded-lg border px-4 py-6">
        <Music size={32} strokeWidth={1.5} className="text-muted-foreground" />
        <audio
          src={originalUrl}
          controls
          className="w-full"
          preload="metadata"
        />
      </div>
    );
  }

  if (isPdf && originalUrl) {
    return (
      <div className="border-border overflow-hidden rounded-lg border">
        <iframe
          src={originalUrl}
          title={asset.original_filename}
          className="h-72 w-full"
        />
      </div>
    );
  }

  return null;
}

function DownloadButton({ asset }: DownloadPickerProps) {
  const [renditions, setRenditions] = useState<AssetRenditionWithUrl[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const videoRenditions = sortVideoRenditions(
    renditions.filter(
      (r) => r.rendition_type === "video" && r.status === "ready"
    )
  );
  const hasOptions = videoRenditions.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchRenditions = async () => {
    if (renditions.length > 0) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const rs = await assetsApi.getRenditions(asset.id);
      setRenditions(rs);
      setOpen(true);
    } catch {
      // fall through
      await doDownload();
    } finally {
      setLoading(false);
    }
  };

  const doDownload = async (renditionLabel?: string) => {
    setOpen(false);
    const id = toast.loading("Preparing download…");
    try {
      const url = await assetsApi.getDownloadUrl(asset.id, renditionLabel);
      window.open(url, "_blank");
      toast.success("Download started", { id });
    } catch {
      toast.error("Download failed", {
        id,
        description: "Could not generate download link.",
      });
    }
  };

  if (!asset.mime_type.startsWith("video/") || !hasOptions) {
    return (
      <Button
        size="sm"
        disabled={asset.status !== "ready" || loading}
        onClick={async () => {
          if (asset.mime_type.startsWith("video/") && renditions.length === 0) {
            await fetchRenditions();
          } else {
            await doDownload();
          }
        }}
      >
        <Download size={12} />
        {loading
          ? UI_STRINGS.DETAIL_MODAL.LOADING
          : UI_STRINGS.DETAIL_MODAL.DOWNLOAD}
      </Button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Button
        size="sm"
        disabled={asset.status !== "ready"}
        onClick={fetchRenditions}
      >
        <Download size={12} /> {UI_STRINGS.DETAIL_MODAL.DOWNLOAD}
        <ChevronDown
          size={11}
          className={cn("ml-0.5 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open && (
        <div className="border-border bg-card absolute top-full left-0 z-20 mt-1 min-w-45 rounded-lg border py-1 shadow-xl">
          <p className="text-muted-foreground px-3 py-1.5 text-[10px] font-medium tracking-widest uppercase">
            {UI_STRINGS.DETAIL_MODAL.ORIGINAL}
          </p>
          <button
            onClick={() => doDownload()}
            className="hover:bg-accent flex w-full items-center justify-between gap-3 px-3 py-1.5 text-[11px] transition-colors"
          >
            <span className="text-foreground font-medium">
              {UI_STRINGS.DETAIL_MODAL.ORIGINAL} {UI_STRINGS.DETAIL_MODAL.FILE}
            </span>
            <span className="text-muted-foreground">
              {formatBytes(asset.size_bytes)}
            </span>
          </button>

          {videoRenditions.length > 0 && (
            <>
              <div className="border-border mx-3 my-1 border-t" />
              <p className="text-muted-foreground px-3 py-1.5 text-[10px] font-medium tracking-widest uppercase">
                {UI_STRINGS.DETAIL_MODAL.TRANSCODED}
              </p>
              {videoRenditions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => doDownload(r.label)}
                  className="hover:bg-accent flex w-full items-center justify-between gap-3 px-3 py-1.5 text-[11px] transition-colors"
                >
                  <span className="text-foreground font-medium">{r.label}</span>
                  <span className="text-muted-foreground">
                    {r.size_bytes
                      ? formatBytes(r.size_bytes)
                      : r.height
                        ? `${r.height}p`
                        : ""}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DetailModal({
  asset,
  onShare,
  onDelete,
  onClose,
}: DetailProps) {
  return (
    <div className="flex flex-col gap-5">
      <AssetPreview asset={asset} />

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium break-all">
            {asset.original_filename}
          </p>
          <span
            className={cn(
              "mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
              STATUS_STYLE[asset.status]
            )}
          >
            {asset.status}
          </span>
        </div>
      </div>

      <dl className="bg-muted/30 grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg px-4 py-3.5 text-xs">
        {(
          [
            ["Type", mimeLabel(asset.mime_type)],
            ["MIME", asset.mime_type],
            ["Size", formatBytes(asset.size_bytes)],
            ["Downloads", String(asset.download_count)],
            ["Created", formatDate(asset.created_at)],
            ["Modified", formatDate(asset.updated_at)],
          ] as [string, string][]
        ).map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground font-medium break-all">{value}</dd>
          </Fragment>
        ))}
      </dl>

      {asset.Tags && asset.Tags.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 flex items-center gap-1 text-[10px] font-medium tracking-widest uppercase">
            <Tag size={10} /> {UI_STRINGS.DETAIL_MODAL.TAGS}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {asset.Tags.map((t) => (
              <span
                key={t.id}
                className="border-border bg-muted text-foreground rounded-md border px-2 py-0.5 text-[11px]"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-border flex flex-wrap items-center gap-2 border-t pt-4">
        <DownloadButton asset={asset} />
        <Button
          size="sm"
          variant="outline"
          disabled={asset.status !== "ready"}
          onClick={() => {
            onClose();
            onShare(asset);
          }}
        >
          <Share2 size={12} /> {UI_STRINGS.DETAIL_MODAL.SHARE}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="ml-auto"
          onClick={() => {
            onClose();
            onDelete(asset);
          }}
        >
          <Trash2 size={12} /> {UI_STRINGS.DETAIL_MODAL.DELETE}
        </Button>
      </div>
    </div>
  );
}
