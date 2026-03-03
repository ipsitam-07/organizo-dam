import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/services/asset.service", () => ({
  assetService: {
    listAssets: vi.fn(),
    getAsset: vi.fn(),
    deleteAsset: vi.fn(),
    getDownloadUrl: vi.fn(),
    getStatus: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    createShareLink: vi.fn(),
    resolveShareLink: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock("../src/services/job-event.service", () => ({
  handleJobEvent: vi.fn(),
}));

vi.mock("@repo/auth", () => {
  class MockAppError extends Error {
    constructor(
      public message: string,
      public statusCode: number
    ) {
      super(message);
    }
  }

  return {
    connectRedis: vi.fn().mockResolvedValue(undefined),
    requireAuth: (req: any, _res: any, next: any) => {
      req.user = { id: "user-1", email: "test@example.com", role: "user" };
      next();
    },
    AppError: MockAppError,
    NotFoundError: class extends MockAppError {
      constructor(message: string = "Not found") {
        super(message, 404);
      }
    },
    ConflictError: class extends MockAppError {
      constructor(message: string = "Conflict") {
        super(message, 409);
      }
    },
    UnauthorizedError: class extends MockAppError {
      constructor(message: string = "Unauthorized") {
        super(message, 401);
      }
    },
    ForbiddenError: class extends MockAppError {
      constructor(message: string = "Forbidden") {
        super(message, 403);
      }
    },
  };
});

vi.mock("@repo/rabbitmq", () => ({
  RabbitMQClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    consume: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  })),
  QUEUES: { ASSET_SERVICE_EVENTS: "asset-service-events" },
}));

vi.mock("@repo/config", () => ({
  config: {
    env: "test",
    frontendUrl: "http://localhost:5173",
    ports: { asset: 3003 },
    db: {
      host: "localhost",
      port: 5432,
      database: "test",
      user: "test",
      password: "test",
    },
    minio: { buckets: { chunks: "chunks", renditions: "renditions" } },
  },
}));

vi.mock("@repo/database", () => ({ initDb: vi.fn() }));
vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

import { app } from "../src/index";
import { assetService } from "../src/services/asset.service";
import { NotFoundError } from "@repo/auth";

// GET /api/assets

describe("GET /api/assets", () => {
  it("returns paginated asset list", async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue({
      data: [{ id: "asset-1" }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    } as any);

    const res = await request(app)
      .get("/api/assets")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

//GET /api/assets/:id

describe("GET /api/assets/:id", () => {
  it("returns a single asset", async () => {
    vi.mocked(assetService.getAsset).mockResolvedValue({
      id: "asset-1",
    } as any);

    const res = await request(app)
      .get("/api/assets/asset-1")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("asset-1");
  });

  it("returns 404 when not found", async () => {
    vi.mocked(assetService.getAsset).mockRejectedValue(
      new NotFoundError("Asset not found")
    );
    const res = await request(app)
      .get("/api/assets/bad-id")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(404);
  });
});

//DELETE /api/assets/:id

describe("DELETE /api/assets/:id", () => {
  it("returns 204 on success", async () => {
    vi.mocked(assetService.deleteAsset).mockResolvedValue(undefined);

    const res = await request(app)
      .delete("/api/assets/asset-1")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(204);
  });
});

//GET /api/assets/:id/download
describe("GET /api/assets/:id/download", () => {
  it("returns presigned URL", async () => {
    vi.mocked(assetService.getDownloadUrl).mockResolvedValue({
      url: "https://minio/presigned",
      expiresIn: 900,
    });

    const res = await request(app)
      .get("/api/assets/asset-1/download")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.url).toContain("presigned");
  });
});

//POST /api/assets/:id/tags
describe("POST /api/assets/:id/tags", () => {
  it("returns 201 and new tag", async () => {
    vi.mocked(assetService.addTag).mockResolvedValue({
      id: "tag-1",
      name: "video",
    } as any);

    const res = await request(app)
      .post("/api/assets/asset-1/tags")
      .set("Authorization", "Bearer token")
      .send({ name: "video" });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("video");
  });
});

//GET /api/assets/:id/status

describe("GET /api/assets/:id/status", () => {
  it("returns asset and job statuses", async () => {
    vi.mocked(assetService.getStatus).mockResolvedValue({
      asset: { id: "asset-1", status: "processing" },
      jobs: [{ job_type: "thumbnail", status: "queued", progress: 0 }],
    } as any);

    const res = await request(app)
      .get("/api/assets/asset-1/status")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.data.jobs).toHaveLength(1);
  });
});
