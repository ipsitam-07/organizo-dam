import { useState, useEffect, useRef } from "react";
import type { Asset } from "@/types/asset.types";
import { assetsApi } from "@/services/asset.service";

const RETRY_INTERVAL = 4_000;
const MAX_RETRIES = 15;

export function useCardThumbnail(asset: Asset) {
  const [url, setUrl] = useState<string | null>(null);
  const retryCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    retryCount.current = 0;

    if (asset.status !== "ready") {
      setUrl(null);
      return;
    }

    let cancelled = false;

    async function fetchThumbnail() {
      const u = await assetsApi.getThumbnailUrl(asset.id);
      if (cancelled) return;

      if (u) {
        setUrl(u);
      } else if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        timerRef.current = setTimeout(() => {
          if (!cancelled) fetchThumbnail();
        }, RETRY_INTERVAL);
      }
    }

    fetchThumbnail();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [asset.id, asset.status]);

  return url;
}
