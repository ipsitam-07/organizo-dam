import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const { mockRedisGet } = vi.hoisted(() => ({
  mockRedisGet: vi.fn(),
}));

vi.mock("@repo/config", () => ({
  config: {
    jwt: { secret: "test-secret" },
    redis: { host: "localhost", port: 6379, password: "pw" },
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    get: mockRedisGet,
    isOpen: false,
    connect: vi.fn(),
  })),
}));

import { UnauthorizedError } from "../src/error";
import { requireAuth } from "../src/middleware";
import type { AuthRequest } from "../src/middleware";
import { NextFunction, Response } from "express";

function makeReq(authHeader?: string): AuthRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthRequest;
}

function makeRes(): Response {
  return {} as Response;
}

describe("requireAuth middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("calls next(UnauthorizedError) when Authorization header is missing", async () => {
    await requireAuth(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.statusCode).toBe(401);
  });

  it("calls next(UnauthorizedError) when header does not start with 'Bearer '", async () => {
    await requireAuth(makeReq("Basic abc123"), makeRes(), next);

    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it("calls next(UnauthorizedError) when token is invalid (bad signature)", async () => {
    await requireAuth(makeReq("Bearer not.a.real.token"), makeRes(), next);

    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe("Invalid or expired token");
  });

  it("calls next(UnauthorizedError) when Redis has no active session", async () => {
    const payload = { id: "user-1", email: "a@b.com", role: "user" };
    const token = jwt.sign(payload, "test-secret", { expiresIn: "1h" });

    mockRedisGet.mockResolvedValue(null);

    await requireAuth(makeReq(`Bearer ${token}`), makeRes(), next);

    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toMatch(/Session expired/);
  });

  it("calls next(UnauthorizedError) when Redis token does not match", async () => {
    const payload = { id: "user-1", email: "a@b.com", role: "user" };
    const token = jwt.sign(payload, "test-secret", { expiresIn: "1h" });

    mockRedisGet.mockResolvedValue("different-token");

    await requireAuth(makeReq(`Bearer ${token}`), makeRes(), next);

    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it("attaches req.user and calls next() when token and session are valid", async () => {
    const payload = { id: "user-1", email: "a@b.com", role: "user" };
    const token = jwt.sign(payload, "test-secret", { expiresIn: "1h" });

    mockRedisGet.mockResolvedValue(token);

    const req = makeReq(`Bearer ${token}`);
    await requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({
      id: "user-1",
      email: "a@b.com",
      role: "user",
    });
  });

  it("calls next(UnauthorizedError) when token is expired", async () => {
    const payload = { id: "user-2", email: "b@c.com", role: "user" };
    const token = jwt.sign(payload, "test-secret", { expiresIn: "-1s" });

    await requireAuth(makeReq(`Bearer ${token}`), makeRes(), next);

    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe("Invalid or expired token");
  });
});
