import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "@/services/asset.service";
import { queryKeys } from "../lib/queryKeys";
import type { CreateShareLinkPayload } from "@/types";

export function useCreateShareLink(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateShareLinkPayload) =>
      assetsApi.createShareLink(assetId, p),
    onSuccess: (link) =>
      qc.setQueryData(queryKeys.shares.byAsset(assetId), link),
  });
}
