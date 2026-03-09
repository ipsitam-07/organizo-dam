import { useState, useEffect } from "react";
import type { Asset } from "@/interfaces";
import { assetsApi } from "@/services/asset.service";

export function useCardThumbnail(asset: Asset) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const thumb = asset.AssetRenditions?.find(
      (r) => r.label === "thumbnail" && r.status === "ready"
    );
    if (!thumb || asset.status !== "ready") {
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
  }, [asset.id, asset.status, asset.AssetRenditions]);

  return url;
}
