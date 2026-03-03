import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { update: vi.fn() },
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

import { AssemblyWorker } from "../src/workers/assembly.worker";
import { Asset } from "@repo/database";
import { copyToAssets, deleteObject } from "../src/services/storage.service";

const mockJob = { id: "job-1", update: vi.fn() };

const mockPayload = {
  assetId: "asset-uuid-123",
  uploadSessionId: "sess-1",
  userId: "user-1",
  storageKey: "tus-upload-id-abc",
};

beforeEach(() => vi.clearAllMocks());

describe("AssemblyWorker.process", () => {
  it("copies file from chunks to assets bucket", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await new AssemblyWorker().process(mockPayload, mockJob as any);

    expect(copyToAssets).toHaveBeenCalledWith(
      "tus-upload-id-abc",
      "asset-uuid-123"
    );
  });

  it("updates asset.storage_key to assetId after copy", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await new AssemblyWorker().process(mockPayload, mockJob as any);

    expect(Asset.update).toHaveBeenCalledWith(
      { storage_key: "asset-uuid-123" },
      { where: { id: "asset-uuid-123" } }
    );
  });

  it("deletes original from chunks bucket", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await new AssemblyWorker().process(mockPayload, mockJob as any);

    expect(deleteObject).toHaveBeenCalledWith("chunks", "tus-upload-id-abc");
  });

  it("does not throw if chunk delete fails", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockRejectedValue(new Error("MinIO unavailable"));
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await expect(
      worker.process(mockPayload, mockJob as any)
    ).resolves.not.toThrow();
    expect(publishSpy).toHaveBeenCalled();
  });

  it("publishes exactly 3 follow-on messages after assembly", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    expect(publishSpy).toHaveBeenCalledTimes(3);

    const routingKeys = publishSpy.mock.calls.map((c) => c[1]);
    expect(routingKeys).toContain("asset.process.metadata");
    expect(routingKeys).toContain("asset.process.thumbnail");
    expect(routingKeys).toContain("asset.process.transcode");
  });

  it("fan-out messages carry the assetId as storageKey", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(deleteObject).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    const worker = new AssemblyWorker();
    const publishSpy = vi
      .spyOn((worker as any).rabbit, "publish")
      .mockResolvedValue(undefined);

    await worker.process(mockPayload, mockJob as any);

    for (const call of publishSpy.mock.calls) {
      const payload = call[2] as any;
      expect(payload.storageKey).toBe("asset-uuid-123");
    }
  });

  it("throws if copyToAssets fails", async () => {
    vi.mocked(copyToAssets).mockRejectedValue(new Error("S3 copy error"));

    await expect(
      new AssemblyWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("S3 copy error");
  });

  it("throws if Asset.update fails", async () => {
    vi.mocked(copyToAssets).mockResolvedValue(undefined);
    vi.mocked(Asset.update).mockRejectedValue(new Error("DB error"));

    await expect(
      new AssemblyWorker().process(mockPayload, mockJob as any)
    ).rejects.toThrow("DB error");
  });
});
