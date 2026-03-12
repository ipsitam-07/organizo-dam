import { useQuery } from "@tanstack/react-query";
import { assetsApi } from "@/services/asset.service";
import { queryKeys } from "../lib/queryKeys";
import type { AssetListParams } from "@/types/asset.types";

export function useAssets(params?: AssetListParams) {
  const q = useQuery({
    queryKey: queryKeys.assets.list(params),
    queryFn: () => assetsApi.list(params),
    staleTime: 20_000,
    placeholderData: (prev) => prev,
    // Poll every 3s
    refetchInterval: (query) => {
      const assets = query.state.data?.data ?? [];
      const hasProcessing = assets.some(
        (a) => a.status === "processing" || a.status === "queued"
      );
      return hasProcessing ? 3_000 : false;
    },
  });
  return {
    ...q,
    assets: q.data?.data ?? [],
    total: q.data?.total ?? 0,
    totalPages: q.data?.totalPages ?? 1,
  };
}

export function useAssetStats() {
  return useQuery({
    queryKey: queryKeys.assets.stats(),
    queryFn: assetsApi.stats,
    staleTime: 60_000,
  });
}
