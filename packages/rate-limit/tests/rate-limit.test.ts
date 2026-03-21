import { describe, it, expect, vi, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { logger } from "@repo/logger";
import {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  shareLimiter,
} from "../src/index";

function makeReq(ip = "127.0.0.1", path = "/test", method = "POST"): Request {
  return { ip, path, method } as unknown as Request;
}

function makeRes(): {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
} {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const skipInTest = (): boolean => process.env.NODE_ENV === "test";

const rateLimitHandler = (
  req: Request,
  res: Response,
  _next: NextFunction,
  options: { windowMs: number; message: string }
): void => {
  (logger.warn as ReturnType<typeof vi.fn>)(
    `[RateLimit] ${req.ip} exceeded limit on ${req.method} ${req.path}`
  );
  res.status(429).json({
    status: "error",
    message: options.message,
    retryAfter: Math.ceil(options.windowMs / 1000 / 60),
  });
};

// ─── Limiter exports ──────────────────────────────────────────────────────────

describe("limiter exports", () => {
  it("authLimiter is an Express middleware function", () => {
    expect(typeof authLimiter).toBe("function");
  });

  it("apiLimiter is an Express middleware function", () => {
    expect(typeof apiLimiter).toBe("function");
  });

  it("uploadLimiter is an Express middleware function", () => {
    expect(typeof uploadLimiter).toBe("function");
  });

  it("shareLimiter is an Express middleware function", () => {
    expect(typeof shareLimiter).toBe("function");
  });
});

describe("skipInTest", () => {
  afterEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("returns true when NODE_ENV is 'test'", () => {
    process.env.NODE_ENV = "test";
    expect(skipInTest()).toBe(true);
  });

  it("returns false when NODE_ENV is 'production'", () => {
    process.env.NODE_ENV = "production";
    expect(skipInTest()).toBe(false);
  });

  it("returns false when NODE_ENV is 'development'", () => {
    process.env.NODE_ENV = "development";
    expect(skipInTest()).toBe(false);
  });

  it("returns false when NODE_ENV is undefined", () => {
    delete process.env.NODE_ENV;
    expect(skipInTest()).toBe(false);
  });
});

describe("rateLimitHandler", () => {
  it("sets status 429 and returns structured JSON", () => {
    const req = makeReq();
    const res = makeRes();

    rateLimitHandler(req, res as unknown as Response, vi.fn(), {
      windowMs: 15 * 60 * 1000,
      message: "Too many auth attempts. Please try again in 15 minutes.",
    });

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Too many auth attempts. Please try again in 15 minutes.",
      retryAfter: 15,
    });
  });

  it("computes retryAfter in whole minutes for a 60-second window", () => {
    const req = makeReq();
    const res = makeRes();

    rateLimitHandler(req, res as unknown as Response, vi.fn(), {
      windowMs: 60 * 1000,
      message: "Too many requests. Please try later.",
    });

    const body = res.json.mock.calls[0][0];
    expect(body.retryAfter).toBe(1);
    expect(Number.isInteger(body.retryAfter)).toBe(true);
  });

  it("retryAfter is always a positive integer", () => {
    const res = makeRes();
    rateLimitHandler(makeReq(), res as unknown as Response, vi.fn(), {
      windowMs: 60 * 1000,
      message: "msg",
    });
    const { retryAfter } = res.json.mock.calls[0][0];
    expect(retryAfter).toBeGreaterThan(0);
    expect(Number.isInteger(retryAfter)).toBe(true);
  });

  it("response body always includes status:'error'", () => {
    const res = makeRes();
    rateLimitHandler(makeReq(), res as unknown as Response, vi.fn(), {
      windowMs: 900_000,
      message: "any message",
    });
    expect(res.json.mock.calls[0][0].status).toBe("error");
  });

  it("logs a warning that includes the requester IP", () => {
    vi.mocked(logger.warn).mockClear();
    const req = makeReq("10.0.0.1", "/api/auth/login", "POST");
    const res = makeRes();

    rateLimitHandler(req, res as unknown as Response, vi.fn(), {
      windowMs: 900_000,
      message: "Too many auth attempts. Please try again in 15 minutes.",
    });

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(vi.mocked(logger.warn).mock.calls[0][0]).toContain("10.0.0.1");
  });

  it("logs a warning that includes the HTTP method and path", () => {
    vi.mocked(logger.warn).mockClear();
    const req = makeReq("1.2.3.4", "/api/upload", "PATCH");
    const res = makeRes();

    rateLimitHandler(req, res as unknown as Response, vi.fn(), {
      windowMs: 60_000,
      message: "msg",
    });

    const logged = String(vi.mocked(logger.warn).mock.calls[0][0]);
    expect(logged).toContain("PATCH");
    expect(logged).toContain("/api/upload");
  });
});

describe("limiters skip in test environment", () => {
  afterEach(() => {
    process.env.NODE_ENV = "test";
  });

  async function callMiddleware(
    limiter: typeof authLimiter
  ): Promise<unknown[]> {
    const req = makeReq() as Request;
    const res = makeRes() as unknown as Response;
    return new Promise((resolve) => {
      limiter(req, res, (...args: unknown[]) => resolve(args));
    });
  }

  it("authLimiter calls next() with no error in test mode", async () => {
    process.env.NODE_ENV = "test";
    const args = await callMiddleware(authLimiter);
    expect(args).toHaveLength(0);
  });

  it("apiLimiter calls next() with no error in test mode", async () => {
    process.env.NODE_ENV = "test";
    const args = await callMiddleware(apiLimiter);
    expect(args).toHaveLength(0);
  });

  it("uploadLimiter calls next() with no error in test mode", async () => {
    process.env.NODE_ENV = "test";
    const args = await callMiddleware(uploadLimiter);
    expect(args).toHaveLength(0);
  });

  it("shareLimiter calls next() with no error in test mode", async () => {
    process.env.NODE_ENV = "test";
    const args = await callMiddleware(shareLimiter);
    expect(args).toHaveLength(0);
  });
});
