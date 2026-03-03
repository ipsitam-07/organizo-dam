import { describe, it, expect, vi, beforeEach } from "vitest";
import { assetService } from "../src/services/asset.service";
import { assetRepository } from "../src/repo/asset.repo";
import * as storage from "../src/services/storage.service";
import * as tagService from "../src/services/tag.service";
import bcrypt from "bcryptjs";

vi.mock("../src/repo/asset.repo", () => ({
  assetRepository: {
    findAll: vi.fn(),
    findByIdAndUser: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    getProcessingStatus: vi.fn(),
    logDownload: vi.fn(),
    incrementDownloadCount: vi.fn(),
    removeTag: vi.fn(),
    findTagById: vi.fn(),
    createShareLink: vi.fn(),
    findShareLinkByToken: vi.fn(),
    incrementShareLinkDownloads: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock("../src/services/storage.service", () => ({
  getPresignedUrl: vi.fn(),
  deleteObject: vi.fn(),
  objectExists: vi.fn(),
}));

vi.mock("../src/services/tag.service", () => ({
  attachTag: vi.fn(),
  autoTagAsset: vi.fn(),
}));

vi.mock("@repo/auth", () => ({
  NotFoundError: class extends Error {
    statusCode = 404;
    constructor(m: string) {
      super(m);
    }
  },
  ForbiddenError: class extends Error {
    statusCode = 403;
    constructor(m: string) {
      super(m);
    }
  },
  ConflictError: class extends Error {
    statusCode = 409;
    constructor(m: string) {
      super(m);
    }
  },
  AppError: class extends Error {
    statusCode: number;
    constructor(m: string, s: number) {
      super(m);
      this.statusCode = s;
    }
  },
}));

vi.mock("@repo/config", () => ({
  config: {
    minio: {
      buckets: { chunks: "chunks", renditions: "renditions" },
    },
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

const mockAsset = {
  id: "asset-1",
  user_id: "user-1",
  original_filename: "video.mp4",
  storage_key: "tus-abc",
  mime_type: "video/mp4",
  size_bytes: 10_000_000,
  status: "ready",
  download_count: 0,
  destroy: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

//listAssests

describe("AssetService.listAssets", () => {
  it("returns paginated result from repository", async () => {
    const mockResult = {
      data: [mockAsset],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
    vi.mocked(assetRepository.findAll).mockResolvedValue(mockResult as any);

    const result = await assetService.listAssets("user-1", {
      page: 1,
      limit: 20,
    });

    expect(assetRepository.findAll).toHaveBeenCalledWith("user-1", {
      page: 1,
      limit: 20,
    });
    expect(result.total).toBe(1);
  });
});

//getAsset
describe("AssetService.getAsset", () => {
  it("returns asset when found", async () => {
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(
      mockAsset as any
    );
    const result = await assetService.getAsset("asset-1", "user-1");
    expect(result.id).toBe("asset-1");
  });

  it("throws NotFoundError when asset does not belong to user", async () => {
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(null);
    await expect(assetService.getAsset("asset-1", "user-1")).rejects.toThrow();
  });
});

//deleteAsset
describe("AssetService.deleteAsset", () => {
  it("deletes MinIO object and destroys DB row", async () => {
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(
      mockAsset as any
    );
    vi.mocked(storage.deleteObject).mockResolvedValue(undefined);

    await assetService.deleteAsset("asset-1", "user-1");

    expect(storage.deleteObject).toHaveBeenCalledWith("chunks", "tus-abc");
    expect(mockAsset.destroy).toHaveBeenCalled();
  });
});

//getDownloadURL
describe("AssetService.getDownloadUrl", () => {
  it("returns presigned URL and logs the download", async () => {
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(
      mockAsset as any
    );
    vi.mocked(storage.getPresignedUrl).mockResolvedValue("https://minio/url");

    const result = await assetService.getDownloadUrl("asset-1", "user-1");

    expect(result.url).toBe("https://minio/url");
    expect(assetRepository.incrementDownloadCount).toHaveBeenCalledWith(
      "asset-1"
    );
  });

  it("returns presigned URL for a specific rendition", async () => {
    const assetWithRenditions = {
      ...mockAsset,
      AssetRenditions: [
        {
          id: "rend-1",
          label: "thumbnail",
          status: "ready",
          storage_key: "thumb.jpg",
        },
      ],
    };
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(
      assetWithRenditions as any
    );
    vi.mocked(storage.getPresignedUrl).mockResolvedValue("https://minio/thumb");

    const result = await assetService.getDownloadUrl(
      "asset-1",
      "user-1",
      "thumbnail"
    );

    expect(storage.getPresignedUrl).toHaveBeenCalledWith(
      "renditions",
      "thumb.jpg"
    );
    expect(result.url).toBe("https://minio/thumb");
  });
});

//addTag
describe("AssetService.addTag", () => {
  it("calls attachTag and returns the tag", async () => {
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(
      mockAsset as any
    );
    vi.mocked(tagService.attachTag).mockResolvedValue({
      id: "tag-1",
      name: "video",
    } as any);

    const tag = await assetService.addTag("asset-1", "user-1", "video");

    expect(tag.name).toBe("video");
  });
});

//getStats
describe("AssetService.getStats", () => {
  it("returns stats from repository", async () => {
    const mockStats = {
      totalAssets: 10,
      totalDownloads: 5,
      totalStorageBytes: 1000,
      jobStats: [],
    };
    vi.mocked(assetRepository.getStats).mockResolvedValue(mockStats as any);

    const result = await assetService.getStats();
    expect(result.totalAssets).toBe(10);
  });
});

//createShareLink
describe("AssetService.createShareLink", () => {
  it("creates a share link with hashed password and expiry", async () => {
    vi.mocked(assetRepository.findByIdAndUser).mockResolvedValue(
      mockAsset as any
    );
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed_password" as never);
    vi.mocked(assetRepository.createShareLink).mockResolvedValue({
      id: "link-1",
    } as any);

    const result = await assetService.createShareLink("asset-1", "user-1", {
      password: "securepassword",
      expires_in_hours: 24,
      max_downloads: 5,
    });

    // Verify password was hashed
    expect(bcrypt.hash).toHaveBeenCalledWith("securepassword", 10);
    //received the hashed password and a token
    expect(assetRepository.createShareLink).toHaveBeenCalledWith(
      expect.objectContaining({
        password_hash: "hashed_password",
        max_downloads: 5,
        expires_at: expect.any(Date),
      })
    );
  });
});

//resolveShareLink
describe("AssetService.resolveShareLink", () => {
  const mockLink = {
    id: "link-1",
    asset_id: "asset-1",
    token: "token-123",
    password_hash: "hashed_password",
    download_count: 0,
    max_downloads: 5,
    expires_at: new Date(Date.now() + 3600000), //1 hour
  };

  it("successfully resolves link with valid password", async () => {
    vi.mocked(assetRepository.findShareLinkByToken).mockResolvedValue(
      mockLink as any
    );
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(assetRepository.findById).mockResolvedValue(mockAsset as any);
    vi.mocked(storage.getPresignedUrl).mockResolvedValue(
      "https://minio/shared"
    );

    const result = await assetService.resolveShareLink(
      "token-123",
      "correct_password"
    );

    expect(result.url).toBe("https://minio/shared");
    expect(assetRepository.incrementShareLinkDownloads).toHaveBeenCalledWith(
      "link-1"
    );
  });

  it("throws 401 when password is required but missing", async () => {
    vi.mocked(assetRepository.findShareLinkByToken).mockResolvedValue(
      mockLink as any
    );

    await expect(
      assetService.resolveShareLink("token-123")
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws 410 when link has expired", async () => {
    const expiredLink = {
      ...mockLink,
      expires_at: new Date(Date.now() - 1000),
    };
    vi.mocked(assetRepository.findShareLinkByToken).mockResolvedValue(
      expiredLink as any
    );

    await expect(
      assetService.resolveShareLink("token-123")
    ).rejects.toMatchObject({ statusCode: 410 });
  });

  it("throws 410 when download limit is reached", async () => {
    const maxedLink = { ...mockLink, download_count: 5, max_downloads: 5 };
    vi.mocked(assetRepository.findShareLinkByToken).mockResolvedValue(
      maxedLink as any
    );

    await expect(
      assetService.resolveShareLink("token-123")
    ).rejects.toMatchObject({ statusCode: 410 });
  });
});
