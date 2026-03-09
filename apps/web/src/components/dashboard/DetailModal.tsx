import { Fragment } from "react";
import { Download, Share2, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate, mimeLabel } from "@/lib/utils";
import { assetsApi } from "@/services/asset.service";
import type { DeleteProps } from "@/interfaces";
import { cn } from "@/lib/utils";
import { STATUS_STYLE, UI_STRINGS } from "@/constants";

export function DetailModal({
  asset,
  onShare,
  onDelete,
  onClose,
}: DeleteProps) {
  const handleDownload = async () => {
    try {
      window.open(await assetsApi.getDownloadUrl(asset.id), "_blank");
    } catch {
      /* todo toast */
    }
  };

  return (
    <div className="flex flex-col gap-5">
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
        <Button
          size="sm"
          disabled={asset.status !== "ready"}
          onClick={handleDownload}
        >
          <Download size={12} /> {UI_STRINGS.DETAIL_MODAL.DOWNLOAD}
        </Button>
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
