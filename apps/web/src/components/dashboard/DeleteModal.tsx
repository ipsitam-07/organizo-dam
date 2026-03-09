import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useDeleteAsset } from "@/hooks/useDeleteAsset";
import { Button } from "@/components/ui/button";
import type { Asset } from "@/interfaces";
import { UI_STRINGS } from "@/constants";

export function DeleteModal({
  asset,
  onClose,
}: {
  asset: Asset;
  onClose: () => void;
}) {
  const del = useDeleteAsset();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-lg border p-4">
        <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">
            {UI_STRINGS.DELETE_MODAL.DELETE}
          </p>
          <p className="text-muted-foreground mt-1 text-xs break-all">
            <span className="text-foreground font-medium">
              {asset.original_filename}
            </span>{" "}
            {UI_STRINGS.DELETE_MODAL.WARNING}
          </p>
        </div>
      </div>
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={del.isPending}
          onClick={() => {
            setError(null);
            del.mutate(asset.id, {
              onSuccess: onClose,
              onError: (e) =>
                setError(e.message ?? `${UI_STRINGS.DELETE_MODAL.FAILED}`),
            });
          }}
        >
          {del.isPending
            ? UI_STRINGS.DELETE_MODAL.DELETING
            : UI_STRINGS.DELETE_MODAL.DLT_BUTTON}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          {UI_STRINGS.DELETE_MODAL.CANCEL}
        </Button>
      </div>
    </div>
  );
}
