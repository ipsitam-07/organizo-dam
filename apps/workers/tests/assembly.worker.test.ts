import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { findByPk: vi.fn(), update: vi.fn() },
  ProcessingJob: {
    create: vi.fn().mockResolvedValue({ id: "job-1", update: vi.fn() }),
  },
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
    close: vi.fn(),
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
    db: {
      host: "localhost",
      port: 5432,
      database: "dam",
      user: "u",
      password: "p",
    },
    rabbitmq: {},
    minio: {
      endpoint: "localhost:9000",
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
  copyToAssets: vi.fn(),
  deleteObject: vi.fn(),
  buckets: { assets: "assets", chunks: "chunks", renditions: "renditions" },
}));

vi.mock("../src/utils/temp", () => ({
  isTranscodableVideo: vi.fn(),
  isImageType: vi.fn(),
  isDocumentType: vi.fn(),
}));

import { AssemblyWorker } from "../src/workers/assembly.worker";
import { Asset } from "@repo/database";
import { copyToAssets, deleteObject } from "../src/services/storage.service";
import {
  isTranscodableVideo,
  isImageType,
  isDocumentType,
} from "../src/utils/temp";

const mockJob = { id: "job-1", update: vi.fn() };
const mockPayload = {
  assetId: "asset-uuid-123",
  uploadSessionId: "sess-1",
  userId: "user-1",
  storageKey: "tus-upload-id-abc",
};

function makeAsset(mime: string) {
  return {
    id: "asset-uuid-123",
    mime_type: mime,
    storage_key: "asset-uuid-123",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("AssemblyWorker.process — copy + storage", () => {
  it("copies file from chunks to assets bucket", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset("video/mp4") as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    vi.spyOn((worker as any).rabbit, "publish").mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(copyToAssets).toHaveBeenCalledWith(
      "tus-upload-id-abc",
      "asset-uuid-123"
    );
  });

  it("updates asset.storage_key to assetId after copy", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset("video/mp4") as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    vi.spyOn((worker as any).rabbit, "publish").mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(Asset.update).toHaveBeenCalledWith(
      { storage_key: "asset-uuid-123" },
      { where: { id: "asset-uuid-123" } }
    );
  });

  it("does not throw if chunk delete fails", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockRejectedValue(new Error("MinIO unavailable"));
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset("video/mp4") as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    vi.spyOn((worker as any).rabbit, "publish").mockResolvedValue(undefined);

    await expect(
      worker.process(mockPayload, mockJob as any)
    ).resolves.not.toThrow();
  });

  it("throws if copyToAssets fails", async () => {
    vi.mocked(copyToAssets).mockRejectedValue(new Error("S3 copy error"));

    await expect(
      new AssemblyWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("S3 copy error");
  });
});

describe("AssemblyWorker.process — smart fan-out", () => {
  it("publishes metadata + thumbnail + transcode for video", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset("video/mp4") as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(true);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(publishSpy).toHaveBeenCalledTimes(3);
    const keys = publishSpy.mock.calls.map((c) => c[1]);
    expect(keys).toContain("asset.process.metadata");
    expect(keys).toContain("asset.process.thumbnail");
    expect(keys).toContain("asset.process.transcode");
  });

  it("publishes only metadata for audio files", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset("audio/mpeg") as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(false);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][1]).toBe("asset.process.metadata");
  });

  it("publishes only process.image for image files", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset("image/png") as any);
    vi.mocked(isTranscodableVideo).mockReturnValue(false);
    vi.mocked(isImageType).mockReturnValue(true);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][1]).toBe("asset.process.image");
  });

  it("publishes only process.document for PDF files", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(
      makeAsset("application/pdf") as any
    );
    vi.mocked(isTranscodableVideo).mockReturnValue(false);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(true);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][1]).toBe("asset.process.document");
  });

  it("publishes only metadata for unknown mime types", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.findByPk).mockResolvedValue(
      makeAsset("application/zip") as any
    );
    vi.mocked(isTranscodableVideo).mockReturnValue(false);
    vi.mocked(isImageType).mockReturnValue(false);
    vi.mocked(isDocumentType).mockReturnValue(false);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][1]).toBe("asset.process.metadata");
  });

  it("fan-out payload carries assetId as storageKey for all types", async () => {
    for (const [mime, mockFn] of [
      [
        "video/mp4",
        () => {
          vi.mocked(isTranscodableVideo).mockReturnValue(true);
          vi.mocked(isImageType).mockReturnValue(false);
          vi.mocked(isDocumentType).mockReturnValue(false);
        },
      ],
      [
        "image/jpeg",
        () => {
          vi.mocked(isTranscodableVideo).mockReturnValue(false);
          vi.mocked(isImageType).mockReturnValue(true);
          vi.mocked(isDocumentType).mockReturnValue(false);
        },
      ],
      [
        "application/pdf",
        () => {
          vi.mocked(isTranscodableVideo).mockReturnValue(false);
          vi.mocked(isImageType).mockReturnValue(false);
          vi.mocked(isDocumentType).mockReturnValue(true);
        },
      ],
    ] as const) {
      vi.clearAllMocks();
      vi.mocked(copyToAssets).mockResolvedValue(undefined);
      vi.mocked(deleteObject).mockResolvedValue(undefined);
      vi.mocked(Asset.update).mockResolvedValue([1] as any);
      vi.mocked(Asset.findByPk).mockResolvedValue(makeAsset(mime) as any);
      (mockFn as () => void)();

      const worker = new AssemblyWorker();
      const publishSpy = vi
        .spyOn((worker as any).rabbit, "publish")
        .mockResolvedValue(undefined);

      await worker.process(mockPayload, mockJob as any);

      for (const call of publishSpy.mock.calls) {
        const payload = call[2] as any;
        expect(payload.storageKey).toBe("asset-uuid-123");
      }
    }
  });
});
