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
    revokeShareLink: vi.fn(),
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
  it("returns paginated asset list with default params", async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue({
      data: [{ id: "00000000-0000-0000-0000-000000000001" }],
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
    // Verify schema defaults were applied — page=1, limit=20
    expect(assetService.listAssets).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ page: 1, limit: 20 })
    );
  });

  it("coerces string query params to the correct types", async () => {
    vi.mocked(assetService.listAssets).mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 10,
      totalPages: 0,
    } as any);

    const res = await request(app)
      .get("/api/assets?page=2&limit=10&status=ready")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(assetService.listAssets).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ page: 2, limit: 10, status: "ready" })
    );
  });

  it("returns 422 when page is not a number", async () => {
    const res = await request(app)
      .get("/api/assets?page=abc")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("page");
    expect(assetService.listAssets).not.toHaveBeenCalled();
  });

  it("returns 422 when limit exceeds maximum of 100", async () => {
    const res = await request(app)
      .get("/api/assets?limit=999")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("limit");
    expect(assetService.listAssets).not.toHaveBeenCalled();
  });

  it("returns 422 when status is not a valid enum value", async () => {
    const res = await request(app)
      .get("/api/assets?status=invalid")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("status");
    expect(assetService.listAssets).not.toHaveBeenCalled();
  });

  it("returns 422 when page is less than 1", async () => {
    const res = await request(app)
      .get("/api/assets?page=0")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(422);
    expect(assetService.listAssets).not.toHaveBeenCalled();
  });
});

//GET /api/assets/:id

describe("GET /api/assets/:id", () => {
  it("returns a single asset", async () => {
    vi.mocked(assetService.getAsset).mockResolvedValue({
      id: "00000000-0000-0000-0000-000000000001",
    } as any);

    const res = await request(app)
      .get("/api/assets/00000000-0000-0000-0000-000000000001")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("returns 404 when not found", async () => {
    vi.mocked(assetService.getAsset).mockRejectedValue(
      new NotFoundError("Asset not found")
    );
    const res = await request(app)
      .get("/api/assets/00000000-0000-0000-0000-000000000404")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(404);
  });

  it("returns 400 for a non-UUID asset id", async () => {
    const res = await request(app)
      .get("/api/assets/not-a-uuid!!!")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid asset ID format");
    expect(assetService.getAsset).not.toHaveBeenCalled();
  });
});

//DELETE /api/assets/:id

describe("DELETE /api/assets/:id", () => {
  it("returns 204 on success", async () => {
    vi.mocked(assetService.deleteAsset).mockResolvedValue(undefined);

    const res = await request(app)
      .delete("/api/assets/00000000-0000-0000-0000-000000000001")
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
      .get("/api/assets/00000000-0000-0000-0000-000000000001/download")
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
      .post("/api/assets/00000000-0000-0000-0000-000000000001/tags")
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
      asset: {
        id: "00000000-0000-0000-0000-000000000001",
        status: "processing",
      },
      jobs: [{ job_type: "thumbnail", status: "queued", progress: 0 }],
    } as any);

    const res = await request(app)
      .get("/api/assets/00000000-0000-0000-0000-000000000001/status")
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(200);
    expect(res.body.data.jobs).toHaveLength(1);
  });
});

// DELETE /api/assets/:id/share/:linkId

describe("DELETE /api/assets/:id/share/:linkId", () => {
  it("returns 204 on successful revoke", async () => {
    vi.mocked(assetService.revokeShareLink).mockResolvedValue(undefined);

    const res = await request(app)
      .delete(
        "/api/assets/00000000-0000-0000-0000-000000000001/share/00000000-0000-0000-0000-000000000002"
      )
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(204);
    expect(assetService.revokeShareLink).toHaveBeenCalledWith(
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
      "user-1"
    );
  });

  it("returns 404 when share link does not exist", async () => {
    const { NotFoundError } = await import("@repo/auth");
    vi.mocked(assetService.revokeShareLink).mockRejectedValue(
      new NotFoundError("Share link not found")
    );

    const res = await request(app)
      .delete(
        "/api/assets/00000000-0000-0000-0000-000000000001/share/00000000-0000-0000-0000-000000000099"
      )
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(404);
  });

  it("returns 404 when asset does not belong to the user", async () => {
    const { NotFoundError } = await import("@repo/auth");
    vi.mocked(assetService.revokeShareLink).mockRejectedValue(
      new NotFoundError("Asset not found")
    );

    const res = await request(app)
      .delete(
        "/api/assets/00000000-0000-0000-0000-000000000099/share/00000000-0000-0000-0000-000000000002"
      )
      .set("Authorization", "Bearer token");

    expect(res.status).toBe(404);
  });
});
