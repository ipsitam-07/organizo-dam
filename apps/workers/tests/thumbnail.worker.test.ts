import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { findByPk: vi.fn(), update: vi.fn() },
  AssetMetadata: { findOne: vi.fn() },
  AssetRendition: { upsert: vi.fn() },
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

vi.mock("../src/services/ffmpeg.service", () => ({
  extractThumbnail: vi.fn(),
}));

vi.mock("../src/utils/temp", () => ({
  writeTempFile: vi.fn().mockResolvedValue("/tmp/input.mp4"),
  cleanTempFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("jpeg-bytes")),
  getFileSize: vi.fn().mockResolvedValue(15360),
  mimeToExtension: vi.fn().mockReturnValue("mp4"),
  isTranscodableVideo: vi.fn(),
}));

import { ThumbnailWorker } from "../src/workers/thumbnail.worker";
import { Asset, AssetMetadata, AssetRendition } from "@repo/database";
import { getObjectBuffer, putObject } from "../src/services/storage.service";
import { extractThumbnail } from "../src/services/ffmpeg.service";
import { isTranscodableVideo, cleanTempFile } from "../src/utils/temp";

const mockJob = { id: "job-1", update: vi.fn() };
const mockPayload = {
  assetId: "asset-1",
  uploadSessionId: "s",
  userId: "u",
  storageKey: "asset-1",
};

beforeEach(() => vi.clearAllMocks());

describe("ThumbnailWorker.process", () => {
  it("extracts thumbnail and uploads to renditions bucket", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({
      duration_secs: 90,
    } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("video"));
    vi.mocked(extractThumbnail).mockResolvedValue("/tmp/thumb.jpg");
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.upsert).mockResolvedValue([{} as any, true]);

    await new ThumbnailWorker().process(mockPayload, mockJob as any);

    expect(extractThumbnail).toHaveBeenCalledWith("/tmp/input.mp4", 90);
    expect(putObject).toHaveBeenCalledWith(
      "renditions",
      "asset-1/thumbnail.jpg",
      expect.any(Buffer),
      "image/jpeg"
    );
    expect(AssetRendition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "thumbnail",
        status: "ready",
        mime_type: "image/jpeg",
      })
    );
  });

  it("falls back to 10s duration when metadata not available", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue(null);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(extractThumbnail).mockResolvedValue("/tmp/t.jpg");
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.upsert).mockResolvedValue([{} as any, true]);

    await new ThumbnailWorker().process(mockPayload, mockJob as any);

    expect(extractThumbnail).toHaveBeenCalledWith("/tmp/input.mp4", 10);
  });

  it("skips non-video files entirely", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "image/png",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(false);

    await new ThumbnailWorker().process(mockPayload, mockJob as any);

    expect(extractThumbnail).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
    expect(AssetRendition.upsert).not.toHaveBeenCalled();
  });

  it("throws NotFound if asset does not exist", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue(null);

    await expect(
      new ThumbnailWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("Asset asset-1 not found");
  });

  it("cleans both temp files even when FFmpeg fails", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue(null);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(extractThumbnail).mockRejectedValue(new Error("FFmpeg OOM"));

    await expect(
      new ThumbnailWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("FFmpeg OOM");

    expect(cleanTempFile).toHaveBeenCalledWith("/tmp/input.mp4");
  });

  it("uses size from getFileSize in the rendition row", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({
      duration_secs: 60,
    } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(extractThumbnail).mockResolvedValue("/tmp/t.jpg");
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.upsert).mockResolvedValue([{} as any, true]);

    const { getFileSize } = await import("../src/utils/temp");
    vi.mocked(getFileSize).mockResolvedValue(20480);

    await new ThumbnailWorker().process(mockPayload, mockJob as any);

    expect(AssetRendition.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ size_bytes: 20480 })
    );
  });
});
