import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../src/services/auth.service", () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
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
      req.user = { id: "user-1", email: "alice@example.com", role: "user" };
      next();
    },
    AppError: MockAppError,
    ConflictError: class extends MockAppError {
      constructor(m: string) {
        super(m, 409);
      }
    },
    UnauthorizedError: class extends MockAppError {
      constructor(m: string) {
        super(m, 401);
      }
    },
    NotFoundError: class extends MockAppError {
      constructor(m: string) {
        super(m, 404);
      }
    },
    ForbiddenError: class extends MockAppError {
      constructor(m: string) {
        super(m, 403);
      }
    },
  };
});

vi.mock("@repo/config", () => ({
  config: {
    env: "test",
    ports: { auth: 3001 },
    db: {
      host: "localhost",
      port: 5432,
      database: "test",
      user: "test",
      password: "test",
    },
    jwt: { secret: "test-secret", expiry: "86400" },
  },
}));

vi.mock("@repo/database", () => ({ initDb: vi.fn() }));
vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../src/swagger", () => ({
  swaggerSpec: {},
}));
vi.mock("swagger-ui-express", () => ({
  default: {
    serve: [],
    setup: vi.fn().mockReturnValue((_r: any, _s: any, n: any) => n()),
  },
}));

beforeEach(() => vi.clearAllMocks());

import { app } from "../src/index";
import { authService } from "../src/services/auth.service";
import { ConflictError, UnauthorizedError } from "@repo/auth";

//POST /api/auth/register

describe("POST /api/auth/register", () => {
  it("returns 201 and user on success", async () => {
    vi.mocked(authService.register).mockResolvedValue({
      id: "user-1",
      email: "alice@example.com",
      role: "user",
    } as any);

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("returns 409 when email is already taken", async () => {
    vi.mocked(authService.register).mockRejectedValue(
      new ConflictError("Email already in use")
    );

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@example.com", password: "pw" });

    expect(res.status).toBe(409);
  });
});

// POST /api/auth/login

describe("POST /api/auth/login", () => {
  it("returns 200 and token on valid credentials", async () => {
    vi.mocked(authService.login).mockResolvedValue({
      token: "jwt-token-abc",
      user: {
        id: "user-1",
        email: "alice@example.com",
        role: "user",
        is_active: true,
      },
    } as any);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("jwt-token-abc");
    expect(res.body.user.email).toBe("alice@example.com");
  });

  it("returns 401 on invalid credentials", async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new UnauthorizedError("Invalid credentials")
    );

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "wrongpw" });

    expect(res.status).toBe(401);
  });
});

//GET /api/auth/me

describe("GET /api/auth/me", () => {
  it("returns 200 and the authenticated user", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("alice@example.com");
  });
});

// POST /api/auth/logout

describe("POST /api/auth/logout", () => {
  it("returns 200 and success message", async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
    expect(authService.logout).toHaveBeenCalledWith("user-1");
  });

  it("calls logout with the authenticated user's id", async () => {
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", "Bearer valid-token");

    expect(authService.logout).toHaveBeenCalledWith("user-1");
  });
});

// GET /api/auth/health

describe("GET /health/auth", () => {
  it("returns 200 OK", async () => {
    const res = await request(app).get("/health/auth");
    expect(res.status).toBe(200);
  });
});
