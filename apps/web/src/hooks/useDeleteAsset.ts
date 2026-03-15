import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "@/services/asset.service";
import { queryKeys } from "../lib/queryKeys";
import type { AssetListResponse } from "@/types/asset.types";

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.assets.all() });
      const snapshots = qc.getQueriesData<AssetListResponse>({
        queryKey: queryKeys.assets.all(),
      });
      qc.setQueriesData<AssetListResponse>(
        { queryKey: queryKeys.assets.all() },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.filter((a) => a.id !== id),
            total: old.total - 1,
          };
        }
      );
      return { snapshots };
    },
    onError: (_e, _id, ctx) => {
      ctx?.snapshots.forEach(([k, v]) => qc.setQueryData(k, v));
    },
    onSettled: (_d, _e, id) => {
      qc.removeQueries({ queryKey: queryKeys.assets.all() });
      qc.invalidateQueries({ queryKey: queryKeys.assets.all() });
      qc.removeQueries({ queryKey: ["assets", "detail", id] });
    },
  });
}
