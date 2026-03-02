import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { uploadService } from "../src/services/upload.service";

vi.mock("../src/services/upload.service", () => ({
  uploadService: {
    getUserSessions: vi.fn(),
    getSessionById: vi.fn(),
    cancelSession: vi.fn(),
    initializeSession: vi.fn(),
    finalizeUpload: vi.fn(),
  },
}));

vi.mock("../src/services/rabbitmq.service", () => ({
  rabbitMQService: { connect: vi.fn(), publishUploadComplete: vi.fn() },
}));

vi.mock("@repo/auth", () => ({
  connectRedis: vi.fn(),
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: "user-uuid-123", email: "test@example.com", role: "user" };
    next();
  },
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  AuthRequest: {},
}));

vi.mock("@repo/config", () => ({
  config: {
    env: "test",
    frontendUrl: "http://localhost:5173",
    ports: { upload: 3002 },
    db: {
      host: "localhost",
      port: 5432,
      database: "test",
      user: "test",
      password: "test",
    },
    minio: {
      endpoint: "localhost:9000",
      accessKey: "key",
      secretKey: "secret",
      buckets: { chunks: "chunks" },
    },
  },
}));

vi.mock("@repo/database", () => ({ initDb: vi.fn() }));
vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@tus/server", () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("@tus/s3-store", () => ({
  S3Store: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

//GET /api/upload/sessions

describe("GET /api/upload/sessions", () => {
  it("returns list of sessions for authenticated user", async () => {
    const sessions = [
      { id: "session-1", status: "complete", original_filename: "video.mp4" },
    ];
    vi.mocked(uploadService.getUserSessions).mockResolvedValue(sessions as any);

    const res = await request(app)
      .get("/api/upload/sessions")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(uploadService.getUserSessions).toHaveBeenCalledWith("user-uuid-123");
  });

  it("returns empty array when user has no sessions", async () => {
    vi.mocked(uploadService.getUserSessions).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/upload/sessions")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// GET /api/upload/sessions/:id

describe("GET /api/upload/sessions/:id", () => {
  it("returns a specific session", async () => {
    const session = { id: "session-1", status: "complete" };
    vi.mocked(uploadService.getSessionById).mockResolvedValue(session as any);

    const res = await request(app)
      .get("/api/upload/sessions/session-1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("session-1");
  });

  it("returns 404 when session not found", async () => {
    const session = { id: "session-1", status: "complete" };
    vi.mocked(uploadService.getSessionById).mockResolvedValue(session as any);

    const res = await request(app)
      .get("/api/upload/sessions/bad-id")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
  });
});

// POST /api/upload/sessions/:id/cancel

describe("POST /api/upload/sessions/:id/cancel", () => {
  it("cancels an in-progress session", async () => {
    const cancelled = { id: "session-1", status: "failed" };
    vi.mocked(uploadService.cancelSession).mockResolvedValue(cancelled as any);

    const res = await request(app)
      .post("/api/upload/sessions/session-1/cancel")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Upload cancelled successfully");
  });

  it("returns 404 when session not found", async () => {
    vi.mocked(uploadService.cancelSession).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/upload/sessions/bad-id/cancel")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
  });
});
