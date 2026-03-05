import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { findByPk: vi.fn() },
  AssetMetadata: { upsert: vi.fn() },
  AssetRendition: { upsert: vi.fn(), update: vi.fn() },
  ProcessingJob: { create: vi.fn() },
  initDb: vi.fn(),
}));

vi.mock("@repo/rabbitmq", () => ({
  RabbitMQClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    publish: vi.fn(),
    consume: vi.fn(),
    getConsumeChannel: vi.fn().mockReturnValue({
      assertExchange: vi.fn(),
      assertQueue: vi.fn(),
      bindQueue: vi.fn(),
    }),
    getPublishChannel: vi.fn().mockReturnValue({ assertExchange: vi.fn() }),
  })),
  EXCHANGES: { UPLOADS: "dam.uploads", EVENTS: "dam.events" },
  ROUTING_KEYS: {
    ASSET_UPLOADED: "asset.uploaded",
    JOB_COMPLETED: "job.completed",
    JOB_DEAD_LETTERED: "job.dead_lettered",
  },
  QUEUES: {
    ASSET_PROCESSING: "asset-processing",
    ASSET_SERVICE_EVENTS: "asset-service-events",
  },
}));

vi.mock("@repo/config", () => ({
  config: {
    db: { host: "l", port: 5432, database: "d", user: "u", password: "p" },
    rabbitmq: {},
    minio: {
      endpoint: "l:9000",
      accessKey: "k",
      secretKey: "s",
      buckets: { assets: "assets", chunks: "chunks", renditions: "renditions" },
    },
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../src/services/storage.service", () => ({
  getObjectBuffer: vi.fn(),
  putObject: vi.fn(),
  buckets: { assets: "assets", chunks: "chunks", renditions: "renditions" },
}));

vi.mock("../src/services/sharp.service", () => ({
  probeImage: vi.fn(),
  resizeImage: vi.fn(),
}));

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    metadata: vi.fn().mockResolvedValue({ width: 320, height: 180 }),
  }),
}));

vi.mock("../src/utils/temp", () => ({
  isImageType: vi.fn(),
}));

import { ImageWorker } from "../src/workers/image.worker";
import { Asset, AssetMetadata, AssetRendition } from "@repo/database";
import { getObjectBuffer, putObject } from "../src/services/storage.service";
import { probeImage, resizeImage } from "../src/services/sharp.service";
import { isImageType } from "../src/utils/temp";

const mockJob = { id: "job-1", update: vi.fn() };
const mockPayload = {
  assetId: "asset-1",
  uploadSessionId: "s",
  userId: "u",
  storageKey: "asset-1",
};

const renditionMock = (label: string) =>
  [{ id: `rendition-${label}` }, true] as any;

beforeEach(() => vi.clearAllMocks());

describe("ImageWorker.process", () => {
  it("probes image and upserts asset_metadata with real dimensions", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/jpeg",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("jpeg-bytes"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 3000,
      height: 2000,
      format: "jpeg",
      size_bytes: 2_000_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert).mockResolvedValue(
      renditionMock("thumbnail")
    );
    vi.mocked(resizeImage).mockResolvedValue(Buffer.from("thumb-bytes"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(probeImage).toHaveBeenCalledWith(expect.any(Buffer));
    expect(AssetMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: "asset-1",
        width: 3000,
        height: 2000,
        format: "jpeg",
        page_count: 1,
      })
    );
  });

  it("generates all 3 rendition specs for a large image", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/png",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("png-bytes"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 4000,
      height: 3000,
      format: "png",
      size_bytes: 5_000_000,
      hasAlpha: true,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert)
      .mockResolvedValueOnce(renditionMock("thumbnail"))
      .mockResolvedValueOnce(renditionMock("medium"))
      .mockResolvedValueOnce(renditionMock("large"));
    vi.mocked(resizeImage).mockResolvedValue(Buffer.from("resized"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(resizeImage).toHaveBeenCalledTimes(3);
    const labels = (vi.mocked(AssetRendition.upsert).mock.calls as any[]).map(
      (c) => c[0].label
    );
    expect(labels).toContain("thumbnail");
    expect(labels).toContain("medium");
    expect(labels).toContain("large");
  });

  it("skips specs wider than the original image (no upscaling)", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/jpeg",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("small-jpeg"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 800,
      height: 600,
      format: "jpeg",
      size_bytes: 100_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert).mockResolvedValue(
      renditionMock("thumbnail")
    );
    vi.mocked(resizeImage).mockResolvedValue(Buffer.from("t"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(resizeImage).toHaveBeenCalledTimes(1);
    expect(
      (vi.mocked(AssetRendition.upsert).mock.calls[0] as any)[0].label
    ).toBe("thumbnail");
  });

  it("skips all renditions and returns early when image is smaller than thumbnail spec", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/jpeg",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("tiny"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 400,
      height: 300,
      format: "jpeg",
      size_bytes: 20_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(resizeImage).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
    expect(AssetRendition.upsert).not.toHaveBeenCalled();
  });

  it("uploads each rendition to the correct storage key", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/jpeg",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("jpeg"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 4000,
      height: 3000,
      format: "jpeg",
      size_bytes: 4_000_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert)
      .mockResolvedValueOnce(renditionMock("thumbnail"))
      .mockResolvedValueOnce(renditionMock("medium"))
      .mockResolvedValueOnce(renditionMock("large"));
    vi.mocked(resizeImage).mockResolvedValue(Buffer.from("r"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new ImageWorker().process(mockPayload, mockJob as any);

    const storageKeys = (vi.mocked(putObject).mock.calls as any[]).map(
      (c) => c[1]
    );
    expect(storageKeys).toContain("asset-1/thumbnail.jpg");
    expect(storageKeys).toContain("asset-1/medium.webp");
    expect(storageKeys).toContain("asset-1/large.webp");
  });

  it("continues with remaining renditions if one resize fails", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/png",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("png"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 3000,
      height: 2000,
      format: "png",
      size_bytes: 3_000_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert)
      .mockResolvedValueOnce(renditionMock("thumbnail"))
      .mockResolvedValueOnce(renditionMock("medium"))
      .mockResolvedValueOnce(renditionMock("large"));
    vi.mocked(resizeImage)
      .mockRejectedValueOnce(new Error("sharp OOM"))
      .mockResolvedValue(Buffer.from("ok"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await expect(
      new ImageWorker().process(mockPayload, mockJob as any)
    ).resolves.not.toThrow();

    expect(putObject).toHaveBeenCalledTimes(2);
    expect(AssetRendition.update).toHaveBeenCalledWith(
      { status: "failed" },
      { where: { id: "rendition-thumbnail" } }
    );
  });

  it("skips non-image mime types entirely", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(false);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(probeImage).not.toHaveBeenCalled();
    expect(AssetMetadata.upsert).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
  });

  it("throws if asset does not exist", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue(null);

    await expect(
      new ImageWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("Asset asset-1 not found");
  });

  it("throws if probeImage fails", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/jpeg",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("bad"));
    vi.mocked(probeImage).mockRejectedValue(new Error("corrupt image"));

    await expect(
      new ImageWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("corrupt image");

    expect(AssetMetadata.upsert).not.toHaveBeenCalled();
  });

  it("marks rendition as processing before resize, then ready after upload", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/jpeg",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("jpeg"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 2000,
      height: 1500,
      format: "jpeg",
      size_bytes: 2_000_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert).mockResolvedValue(
      renditionMock("thumbnail")
    );
    vi.mocked(resizeImage).mockResolvedValue(Buffer.from("resized"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(AssetRendition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" })
    );
    expect(AssetRendition.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ready" }),
      expect.any(Object)
    );
  });

  it("downloads the source image only once regardless of rendition count", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/png",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("png"));
    vi.mocked(probeImage).mockResolvedValue({
      width: 4000,
      height: 3000,
      format: "png",
      size_bytes: 4_000_000,
      hasAlpha: false,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);
    vi.mocked(AssetRendition.upsert)
      .mockResolvedValueOnce(renditionMock("thumbnail"))
      .mockResolvedValueOnce(renditionMock("medium"))
      .mockResolvedValueOnce(renditionMock("large"));
    vi.mocked(resizeImage).mockResolvedValue(Buffer.from("r"));
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new ImageWorker().process(mockPayload, mockJob as any);

    expect(getObjectBuffer).toHaveBeenCalledTimes(1);
  });
});
