import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { findByPk: vi.fn(), update: vi.fn() },
  AssetMetadata: { upsert: vi.fn() },
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
  buckets: { assets: "assets", chunks: "chunks", renditions: "renditions" },
}));

vi.mock("../src/services/ffmpeg.service", () => ({ probeFile: vi.fn() }));

vi.mock("../src/utils/temp", () => ({
  writeTempFile: vi.fn().mockResolvedValue("/tmp/asset.mp4"),
  cleanTempFile: vi.fn().mockResolvedValue(undefined),
  mimeToExtension: vi.fn().mockReturnValue("mp4"),
  isProbeableMedia: vi.fn(),
}));

import { MetadataWorker } from "../src/workers/metadata.worker";
import { Asset, AssetMetadata } from "@repo/database";
import { getObjectBuffer } from "../src/services/storage.service";
import { probeFile } from "../src/services/ffmpeg.service";
import { isProbeableMedia, cleanTempFile } from "../src/utils/temp";

const mockJob = { id: "job-1", update: vi.fn() };
const mockPayload = {
  assetId: "asset-1",
  uploadSessionId: "s",
  userId: "u",
  storageKey: "asset-1",
};

beforeEach(() => vi.clearAllMocks());

describe("MetadataWorker.process", () => {
  it("runs FFprobe and upserts full metadata for video", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isProbeableMedia).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(
      Buffer.from("fake-video-data")
    );
    vi.mocked(probeFile).mockResolvedValue({
      width: 1920,
      height: 1080,
      duration_secs: 120.5,
      bitrate_kbps: 5000,
      video_codec: "h264",
      audio_codec: "aac",
      frame_rate: 29.97,
      format: "mp4",
      raw_metadata: { streams: [] },
    });
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);

    await new MetadataWorker().process(mockPayload, mockJob as any);

    expect(probeFile).toHaveBeenCalledWith("/tmp/asset.mp4");
    expect(AssetMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: "asset-1",
        width: 1920,
        height: 1080,
        duration_secs: 120.5,
        video_codec: "h264",
        audio_codec: "aac",
      })
    );
  });

  it("skips FFprobe for non-media files and writes minimal row", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "application/pdf",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isProbeableMedia).mockReturnValue(false);
    vi.mocked(AssetMetadata.upsert).mockResolvedValue([{} as any, true]);

    await new MetadataWorker().process(mockPayload, mockJob as any);

    expect(probeFile).not.toHaveBeenCalled();
    expect(getObjectBuffer).not.toHaveBeenCalled();
    expect(AssetMetadata.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: "asset-1",
        format: "application/pdf",
      })
    );
  });

  it("throws NotFound if asset does not exist", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue(null);

    await expect(
      new MetadataWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("Asset asset-1 not found");
  });

  it("always cleans up temp file even when FFprobe throws", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isProbeableMedia).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("x"));
    vi.mocked(probeFile).mockRejectedValue(new Error("FFprobe crashed"));

    await expect(
      new MetadataWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("FFprobe crashed");

    expect(cleanTempFile).toHaveBeenCalledWith("/tmp/asset.mp4");
  });

  it("always cleans up temp file even when upsert throws", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isProbeableMedia).mockReturnValue(true);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("x"));
    vi.mocked(probeFile).mockResolvedValue({
      width: 640,
      height: 480,
      raw_metadata: {},
    });
    vi.mocked(AssetMetadata.upsert).mockRejectedValue(
      new Error("DB upsert failed")
    );

    await expect(
      new MetadataWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("DB upsert failed");

    expect(cleanTempFile).toHaveBeenCalledWith("/tmp/asset.mp4");
  });
});
