import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@/types/asset.types";
import { assetsApi } from "@/services/asset.service";
import { queryKeys } from "@/lib/queryKeys";
import { PRESIGNED_URL_STALE_MS } from "@/lib/queryClient";
import { THUMBNAIL_SUPPORTED_TYPES } from "@/constants/hooks.contants";

export function useCardThumbnail(asset: Asset) {
  const canHaveThumbnail =
    asset.status === "ready" && THUMBNAIL_SUPPORTED_TYPES.has(asset.mime_type);

  const hasThumbnailRendition =
    Array.isArray(asset.AssetRenditions) && asset.AssetRenditions.length > 0;

  const { data: url = null } = useQuery({
    queryKey: queryKeys.assets.thumbnail(asset.id),
    queryFn: () => assetsApi.getThumbnailUrl(asset.id),
    enabled: canHaveThumbnail,

    staleTime: PRESIGNED_URL_STALE_MS,
    gcTime: PRESIGNED_URL_STALE_MS + 2 * 60 * 1000,

    refetchInterval: (query) => {
      if (query.state.data) return false;
      if (hasThumbnailRendition) return false;
      return canHaveThumbnail ? 4_000 : false;
    },

    retry: false,
  });

  return url ?? null;
}
