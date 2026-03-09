import { useState, useEffect } from "react";
import type { Asset } from "@/interfaces";
import { assetsApi } from "@/services/asset.service";

export function useCardThumbnail(asset: Asset) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (asset.status !== "ready") {
      setUrl(null);
      return;
    }

    let cancelled = false;
    assetsApi.getThumbnailUrl(asset.id).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.status]);

  return url;
}
