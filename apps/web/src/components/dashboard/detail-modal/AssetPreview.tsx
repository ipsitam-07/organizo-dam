import type { PreviewProps } from "@/types/props.types";
import { useState, useEffect } from "react";
import { assetsApi } from "@/services/asset.service";
import { Archive, Music } from "lucide-react";
import { QualityPicker } from "./QualityPicker";
import { UI_STRINGS } from "@/constants/ui.constants";
import type { AssetRenditionWithUrl } from "@/types/asset.types";
import { sortVideoRenditions } from "@/utils/videoRenditions";

export function AssetPreview({ asset }: PreviewProps) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const isAudio = asset.mime_type.startsWith("audio/");
  const isPdf = asset.mime_type === "application/pdf";
  const canPreview =
    (isImage || isVideo || isAudio || isPdf) && asset.status === "ready";

  const [renditions, setRenditions] = useState<AssetRenditionWithUrl[]>([]);
  const [selectedVideo, setSelectedVideo] =
    useState<AssetRenditionWithUrl | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const videoRenditions = sortVideoRenditions(
    renditions.filter(
      (r) => r.rendition_type === "video" && r.status === "ready"
    )
  );

  useEffect(() => {
    if (!canPreview) return;
    setError(false);
    setLoading(true);
    if (isVideo) {
      Promise.all([
        assetsApi.getRenditions(asset.id),
        assetsApi.getPreviewUrl(asset.id),
      ])
        .then(([rs, origUrl]) => {
          setRenditions(rs);
          setOriginalUrl(origUrl);
          const sorted = sortVideoRenditions(
            rs.filter(
              (r) => r.rendition_type === "video" && r.status === "ready"
            )
          );
          if (sorted.length > 0) setSelectedVideo(sorted[0]);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      const fetchUrl = isPdf
        ? assetsApi.getPreviewUrl(asset.id)
        : assetsApi.getDownloadUrl(asset.id);
      fetchUrl
        .then(setOriginalUrl)
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [asset.id, canPreview, isVideo, isPdf]);

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

  if (loading) {
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
        <div className="overflow-hidden rounded-lg bg-black">
          <div className="flex items-center gap-2 bg-white/4 px-3 py-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400/80" />
            <p className="text-[10px] text-white/40">
              {UI_STRINGS.DETAIL_MODAL.TRANSCODING_IN_PROGRESS}
            </p>
          </div>
          {originalUrl && (
            <video
              key={originalUrl}
              src={originalUrl}
              controls
              className="max-h-64 w-full"
              preload="metadata"
            />
          )}
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg bg-black">
        <div className="flex items-center justify-between bg-black/50 px-3 py-2 backdrop-blur-sm">
          <span className="text-[10px] text-white/35">
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
            key={selectedVideo.id}
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
