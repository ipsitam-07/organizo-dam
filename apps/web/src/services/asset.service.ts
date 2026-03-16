import { apiClient } from "../config/axios";
import { API_ENDPOINTS } from "@/constants/api.constants";
import type {
  AssetListParams,
  AssetListResponse,
  AssetRenditionWithUrl,
  Asset,
  Tag,
} from "@/types/asset.types";
import type { ShareLink, CreateShareLinkPayload } from "@/types";

export const assetsApi = {
  // GET /api/assets
  list: async (params?: AssetListParams): Promise<AssetListResponse> => {
    const { data } = await apiClient.get<AssetListResponse>(
      API_ENDPOINTS.ASSETS.LIST,
      { params }
    );
    return data;
  },
  // GET /api/assets/stats
  stats: async (): Promise<{
    totalAssets: number;
    totalDownloads: number;
    totalStorageBytes: number;
  }> => {
    const { data } = await apiClient.get<{
      data: {
        totalAssets: number;
        totalDownloads: number;
        totalStorageBytes: number;
      };
    }>(API_ENDPOINTS.ASSETS.STATS);
    return data.data;
  },
  // GET /api/assets/:id
  get: async (id: string): Promise<Asset> => {
    const { data } = await apiClient.get<{ data: Asset }>(
      API_ENDPOINTS.ASSETS.DETAIL(id)
    );
    return data.data;
  },
  // DELETE /api/assets/:id
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ASSETS.DETAIL(id));
  },

  //GET api/assets/:id/thumbnail
  getThumbnailUrl: async (id: string): Promise<string | null> => {
    try {
      const { data } = await apiClient.get<{ url: string }>(
        API_ENDPOINTS.ASSETS.THUMBNAIL(id)
      );
      return data.url;
    } catch {
      return null;
    }
  },

  // GET /api/assets/:id/renditions
  getRenditions: async (id: string): Promise<AssetRenditionWithUrl[]> => {
    const { data } = await apiClient.get<{ data: AssetRenditionWithUrl[] }>(
      API_ENDPOINTS.ASSETS.RENDITIONS(id)
    );
    return data.data;
  },
  // GET /api/assets/:id/download
  getDownloadUrl: async (id: string, rendition?: string): Promise<string> => {
    const { data } = await apiClient.get<{ url: string }>(
      API_ENDPOINTS.ASSETS.DOWNLOAD(id),
      rendition ? { params: { rendition } } : undefined
    );
    return data.url;
  },

  // GET /api/assets/:id/preview
  getPreviewUrl: async (id: string): Promise<string> => {
    const { data } = await apiClient.get<{ url: string }>(
      API_ENDPOINTS.ASSETS.PREVIEW(id)
    );
    return data.url;
  },

  // POST /api/assets/:id/tags
  addTag: async (id: string, name: string): Promise<Tag> => {
    const { data } = await apiClient.post<{ data: Tag }>(
      API_ENDPOINTS.ASSETS.TAGS(id),
      { name }
    );
    return data.data;
  },
  // DELETE /api/assets/:id/tags/:tagId
  removeTag: async (assetId: string, tagId: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ASSETS.TAG(assetId, tagId));
  },
  // POST /api/assets/:id/share
  createShareLink: async (
    id: string,
    payload: CreateShareLinkPayload
  ): Promise<ShareLink> => {
    const { data } = await apiClient.post<{ data: ShareLink }>(
      API_ENDPOINTS.ASSETS.SHARE(id),
      payload
    );
    return data.data;
  },
};
