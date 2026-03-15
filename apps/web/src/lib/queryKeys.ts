import type { AssetListParams } from "@/types/asset.types";

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  assets: {
    all: () => ["assets"] as const,
    list: (p?: AssetListParams) => ["assets", "list", p ?? {}] as const,
    stats: () => ["assets", "stats"] as const,
    thumbnail: (id: string) => ["assets", "thumbnail", id] as const,
    previewUrl: (id: string) => ["assets", "previewUrl", id] as const,
    downloadUrl: (id: string, rendition?: string) =>
      ["assets", "downloadUrl", id, rendition ?? "original"] as const,
    renditions: (id: string) => ["assets", "renditions", id] as const,
  },
  shares: { byAsset: (id: string) => ["shares", id] as const },
} as const;
