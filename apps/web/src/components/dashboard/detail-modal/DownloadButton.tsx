import type { DownloadPickerProps } from "@/types/props.types";
import type { AssetRenditionWithUrl } from "@/types/asset.types";
import { useState, useRef, useEffect } from "react";
import { sortVideoRenditions } from "@/utils/videoRenditions";
import { toast } from "sonner";
import { assetsApi } from "@/services/asset.service";
import { createPortal } from "react-dom";
import { UI_STRINGS } from "@/constants/ui.constants";
import { formatBytes } from "@/utils/utility";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown } from "lucide-react";
import { cn } from "@/utils/utility";

export function DownloadButton({ asset }: DownloadPickerProps) {
  const [renditions, setRenditions] = useState<AssetRenditionWithUrl[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const isVideo = asset.mime_type.startsWith("video/");

  const videoRenditions = sortVideoRenditions(
    renditions.filter(
      (r) => r.rendition_type === "video" && r.status === "ready"
    )
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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

  const handleClick = async () => {
    if (!isVideo) {
      await doDownload();
      return;
    }
    const currentRect = triggerRef.current?.getBoundingClientRect() ?? null;

    if (renditions.length > 0) {
      setRect(currentRect);
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const rs = await assetsApi.getRenditions(asset.id);
      setRenditions(rs);
      const videoRs = rs.filter(
        (r) => r.rendition_type === "video" && r.status === "ready"
      );
      if (videoRs.length > 0) {
        setRect(currentRect);
        setOpen(true);
      } else {
        // No renditions
        await doDownload();
      }
    } catch {
      await doDownload();
    } finally {
      setLoading(false);
    }
  };
  const DROPDOWN_HEIGHT = 220;
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const openUpward = rect ? spaceBelow < DROPDOWN_HEIGHT + 8 : false;

  const dropdown =
    open && rect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              ...(openUpward
                ? { bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
              left: Math.min(rect.left, window.innerWidth - 200),
              maxHeight: Math.min(
                DROPDOWN_HEIGHT,
                openUpward ? rect.top - 8 : spaceBelow - 8
              ),
              overflowY: "auto",
            }}
            className="border-border bg-accent z-9999 min-w-45 rounded-lg border py-1 shadow-xl"
          >
            <p className="text-muted-foreground px-3 py-1.5 text-[10px] font-medium tracking-widest uppercase">
              {UI_STRINGS.DETAIL_MODAL.ORIGINAL}
            </p>
            <button
              onClick={() => doDownload()}
              className="hover:bg-accent bg-accent flex w-full items-center justify-between gap-3 px-3 py-1.5 text-[11px] transition-colors"
            >
              <span className="text-foreground font-medium">
                {UI_STRINGS.DETAIL_MODAL.ORIGINAL}{" "}
                {UI_STRINGS.DETAIL_MODAL.FILE}
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
                    <span className="text-foreground font-medium">
                      {r.label}
                    </span>
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
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Button
        ref={triggerRef}
        size="sm"
        disabled={asset.status !== "ready" || loading}
        onClick={handleClick}
      >
        <Download size={12} />
        {loading
          ? UI_STRINGS.DETAIL_MODAL.LOADING
          : UI_STRINGS.DETAIL_MODAL.DOWNLOAD}
        {isVideo && (
          <ChevronDown
            size={11}
            className={cn("ml-0.5 transition-transform", open && "rotate-180")}
          />
        )}
      </Button>
      {dropdown}
    </>
  );
}
