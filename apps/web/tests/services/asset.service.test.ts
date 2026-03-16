import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "../../src/config/axios";
import { assetsApi } from "../../src/services/asset.service";

beforeEach(() => vi.clearAllMocks());

const mockAsset = {
  id: "asset-1",
  user_id: "u1",
  upload_session_id: null,
  original_filename: "photo.jpg",
  storage_key: "asset-1",
  mime_type: "image/jpeg",
  size_bytes: 500_000,
  status: "ready" as const,
  download_count: 0,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

describe("assetsApi.list", () => {
  it("fetches paginated assets", async () => {
    const mockResp = {
      data: [mockAsset],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockResp });

    const result = await assetsApi.list({ page: 1, limit: 20 });

    expect(apiClient.get).toHaveBeenCalledWith("/assets", {
      params: { page: 1, limit: 20 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("works without params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [], total: 0, page: 1, limit: 20, totalPages: 0 },
    });

    await assetsApi.list();

    expect(apiClient.get).toHaveBeenCalledWith("/assets", {
      params: undefined,
    });
  });
});

describe("assetsApi.stats", () => {
  it("returns unwrapped stats", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: { totalAssets: 10, totalDownloads: 5, totalStorageBytes: 1024 },
      },
    });

    const result = await assetsApi.stats();

    expect(result.totalAssets).toBe(10);
    expect(result.totalStorageBytes).toBe(1024);
  });
});

describe("assetsApi.get", () => {
  it("fetches a single asset by id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: mockAsset } });

    const result = await assetsApi.get("asset-1");

    expect(apiClient.get).toHaveBeenCalledWith("/assets/asset-1");
    expect(result.id).toBe("asset-1");
  });
});

describe("assetsApi.delete", () => {
  it("calls DELETE on the asset endpoint", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

    await assetsApi.delete("asset-1");

    expect(apiClient.delete).toHaveBeenCalledWith("/assets/asset-1");
  });
});

describe("assetsApi.getThumbnailUrl", () => {
  it("returns the thumbnail url on success", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { url: "https://minio/thumb.jpg" },
    });

    const result = await assetsApi.getThumbnailUrl("asset-1");

    expect(result).toBe("https://minio/thumb.jpg");
  });

  it("returns null on error", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("not found"));

    const result = await assetsApi.getThumbnailUrl("asset-1");

    expect(result).toBeNull();
  });
});

describe("assetsApi.getDownloadUrl", () => {
  it("returns presigned url", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { url: "https://minio/file.mp4" },
    });

    const result = await assetsApi.getDownloadUrl("asset-1");

    expect(result).toBe("https://minio/file.mp4");
  });

  it("passes rendition param when provided", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { url: "https://minio/720p.mp4" },
    });

    await assetsApi.getDownloadUrl("asset-1", "720p");

    expect(apiClient.get).toHaveBeenCalledWith("/assets/asset-1/download", {
      params: { rendition: "720p" },
    });
  });
});

describe("assetsApi.getRenditions", () => {
  it("returns list of renditions with URLs", async () => {
    const renditions = [
      {
        id: "r1",
        label: "thumbnail",
        url: "https://minio/t.jpg",
        status: "ready",
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: renditions } });

    const result = await assetsApi.getRenditions("asset-1");

    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("thumbnail");
  });
});

describe("assetsApi.addTag", () => {
  it("posts a tag and returns the created tag", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { id: "tag-1", name: "video", source: "user" } },
    });

    const result = await assetsApi.addTag("asset-1", "video");

    expect(apiClient.post).toHaveBeenCalledWith("/assets/asset-1/tags", {
      name: "video",
    });
    expect(result.name).toBe("video");
  });
});

describe("assetsApi.removeTag", () => {
  it("calls DELETE on the tag endpoint", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });

    await assetsApi.removeTag("asset-1", "tag-1");

    expect(apiClient.delete).toHaveBeenCalledWith("/assets/asset-1/tags/tag-1");
  });
});

describe("assetsApi.createShareLink", () => {
  it("posts share link payload and returns the created link", async () => {
    const link = {
      id: "link-1",
      token: "abc123",
      asset_id: "asset-1",
      download_count: 0,
      created_at: "2024-01-01T00:00:00Z",
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: { data: link } });

    const result = await assetsApi.createShareLink("asset-1", {
      expires_in_hours: 24,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/assets/asset-1/share", {
      expires_in_hours: 24,
    });
    expect(result.token).toBe("abc123");
  });
});
