import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { findByPk: vi.fn(), update: vi.fn() },
  AssetMetadata: { findOne: vi.fn() },
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

vi.mock("../src/services/ffmpeg.service", () => ({
  transcodeVideo: vi.fn(),
  TRANSCODE_PROFILES: [
    { label: "360p", height: 360, videoBitrate: "600k", audioBitrate: "96k" },
    { label: "720p", height: 720, videoBitrate: "2500k", audioBitrate: "128k" },
    {
      label: "1080p",
      height: 1080,
      videoBitrate: "5000k",
      audioBitrate: "192k",
    },
  ],
}));

vi.mock("../src/utils/temp", () => ({
  writeTempFile: vi.fn().mockResolvedValue("/tmp/input.mp4"),
  cleanTempFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from("mp4-bytes")),
  getFileSize: vi.fn().mockResolvedValue(50_000_000),
  mimeToExtension: vi.fn().mockReturnValue("mp4"),
  isTranscodableVideo: vi.fn(),
}));

import { TranscodeWorker } from "../src/workers/transcode.worker";
import { Asset, AssetMetadata, AssetRendition } from "@repo/database";
import { getObjectBuffer, putObject } from "../src/services/storage.service";
import { transcodeVideo } from "../src/services/ffmpeg.service";
import { isTranscodableVideo, cleanTempFile } from "../src/utils/temp";

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

describe("TranscodeWorker.process", () => {
  it("produces all 3 profiles for a 1080p source video", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({ height: 1080 } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("video"));
    vi.mocked(AssetRendition.upsert)
      .mockResolvedValueOnce(renditionMock("360p"))
      .mockResolvedValueOnce(renditionMock("720p"))
      .mockResolvedValueOnce(renditionMock("1080p"));
    vi.mocked(transcodeVideo).mockResolvedValue("/tmp/out.mp4");
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new TranscodeWorker().process(mockPayload, mockJob as any);

    expect(transcodeVideo).toHaveBeenCalledTimes(3);

    const labels = (vi.mocked(AssetRendition.upsert).mock.calls as any[]).map(
      (c) => c[0].label
    );
    expect(labels).toContain("360p");
    expect(labels).toContain("720p");
    expect(labels).toContain("1080p");
  });

  it("skips 720p and 1080p profiles for a 480p source", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({ height: 480 } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(AssetRendition.upsert).mockResolvedValueOnce(
      renditionMock("360p")
    );
    vi.mocked(transcodeVideo).mockResolvedValue("/tmp/out.mp4");
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new TranscodeWorker().process(mockPayload, mockJob as any);

    expect(transcodeVideo).toHaveBeenCalledTimes(1);
    const label = (vi.mocked(AssetRendition.upsert).mock.calls[0] as any)[0]
      .label;
    expect(label).toBe("360p");
  });

  it("skips all profiles if source is smaller than 360p", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({ height: 240 } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));

    await new TranscodeWorker().process(mockPayload, mockJob as any);

    expect(transcodeVideo).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
  });

  it("uploads each rendition with correct storage key", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({ height: 720 } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(AssetRendition.upsert)
      .mockResolvedValueOnce(renditionMock("360p"))
      .mockResolvedValueOnce(renditionMock("720p"));
    vi.mocked(transcodeVideo).mockResolvedValue("/tmp/out.mp4");
    vi.mocked(putObject).mockResolvedValue(undefined);
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await new TranscodeWorker().process(mockPayload, mockJob as any);

    const storageKeys = (vi.mocked(putObject).mock.calls as any[]).map(
      (c) => c[1]
    );
    expect(storageKeys).toContain("asset-1/360p.mp4");
    expect(storageKeys).toContain("asset-1/720p.mp4");
  });

  it("marks rendition as failed and re-throws when FFmpeg fails", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({ height: 360 } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(AssetRendition.upsert).mockResolvedValue(renditionMock("360p"));
    vi.mocked(transcodeVideo).mockRejectedValue(new Error("FFmpeg OOM"));
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await expect(
      new TranscodeWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("FFmpeg OOM");

    expect(AssetRendition.update).toHaveBeenCalledWith(
      { status: "failed" },
      { where: { id: "rendition-360p" } }
    );
  });

  it("skips non-video files entirely", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "application/pdf",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(false);

    await new TranscodeWorker().process(mockPayload, mockJob as any);

    expect(transcodeVideo).not.toHaveBeenCalled();
    expect(putObject).not.toHaveBeenCalled();
  });

  it("always cleans up temp files", async () => {
    vi.mocked(Asset.findByPk).mockResolvedValue({
      id: "asset-1",
      mime_type: "video/mp4",
      storage_key: "asset-1",
    } as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(AssetMetadata.findOne).mockResolvedValue({ height: 360 } as any);
    vi.mocked(getObjectBuffer).mockResolvedValue(Buffer.from("v"));
    vi.mocked(AssetRendition.upsert).mockResolvedValue(renditionMock("360p"));
    vi.mocked(transcodeVideo).mockRejectedValue(new Error("crash"));
    vi.mocked(AssetRendition.update).mockResolvedValue([1] as any);

    await expect(
      new TranscodeWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow();
    expect(cleanTempFile).toHaveBeenCalledWith("/tmp/input.mp4");
  });
});
