import type { AssetListParams } from "@/types/asset.types";

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  assets: {
    all: () => ["assets"] as const,
    list: (p?: AssetListParams) => ["assets", "list", p ?? {}] as const,
    stats: () => ["assets", "stats"] as const,
  },
  shares: { byAsset: (id: string) => ["shares", id] as const },
} as const;
