import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { Asset } from "../../src/types/asset.types";

vi.mock("@/services/asset.service", () => ({
  assetsApi: {
    getThumbnailUrl: vi.fn(),
  },
}));

import { assetsApi } from "../../src/services/asset.service";
import { useCardThumbnail } from "../../src/hooks/useCardThumbnail";

const mockAsset: Asset = {
  id: "asset-1",
  user_id: "u1",
  upload_session_id: null,
  original_filename: "photo.jpg",
  storage_key: "key/photo.jpg",
  mime_type: "image/jpeg",
  size_bytes: 204800,
  status: "ready",
  download_count: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  Tags: [],
  AssetRenditions: [],
};

beforeEach(() => vi.clearAllMocks());

describe("useCardThumbnail", () => {
  it("returns null for non-ready assets without calling the API", () => {
    const asset: Asset = { ...mockAsset, status: "processing" };

    const { result } = renderHook(() => useCardThumbnail(asset));

    expect(assetsApi.getThumbnailUrl).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it("fetches and returns the thumbnail URL for ready assets", async () => {
    vi.mocked(assetsApi.getThumbnailUrl).mockResolvedValue(
      "https://minio/thumb.jpg"
    );

    const { result } = renderHook(() => useCardThumbnail(mockAsset));
    await waitFor(() => expect(result.current).toBe("https://minio/thumb.jpg"));

    expect(assetsApi.getThumbnailUrl).toHaveBeenCalledWith("asset-1");
  });

  it("returns null when the API resolves with null", async () => {
    vi.mocked(assetsApi.getThumbnailUrl).mockResolvedValue(null);

    const { result } = renderHook(() => useCardThumbnail(mockAsset));

    await waitFor(() => expect(assetsApi.getThumbnailUrl).toHaveBeenCalled());

    expect(result.current).toBeNull();
  });

  it("resets to null when asset changes to a non-ready status", async () => {
    vi.mocked(assetsApi.getThumbnailUrl).mockResolvedValue(
      "https://minio/thumb.jpg"
    );

    const { result, rerender } = renderHook(
      ({ asset }: { asset: Asset }) => useCardThumbnail(asset),
      { initialProps: { asset: mockAsset } }
    );

    await waitFor(() => expect(result.current).toBe("https://minio/thumb.jpg"));

    rerender({ asset: { ...mockAsset, status: "processing" } });

    expect(result.current).toBeNull();
  });
});
