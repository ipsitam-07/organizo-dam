import { describe, it, expect } from "vitest";
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from "../src/error";

describe("AppError", () => {
  it("sets message, statusCode, and isOperational", () => {
    const err = new AppError("something broke", 500);
    expect(err.message).toBe("something broke");
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it("captures a stack trace", () => {
    const err = new AppError("err", 500);
    expect(err.stack).toBeDefined();
  });
});

describe("ConflictError", () => {
  it("has statusCode 409", () => {
    const err = new ConflictError("duplicate email");
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("duplicate email");
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("UnauthorizedError", () => {
  it("defaults to 'Unauthorized' message", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts a custom message", () => {
    const err = new UnauthorizedError("token expired");
    expect(err.message).toBe("token expired");
  });
});

describe("ValidationError", () => {
  it("has statusCode 400", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("NotFoundError", () => {
  it("defaults to 'Not found'", () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
  });

  it("accepts a custom message", () => {
    const err = new NotFoundError("Asset not found");
    expect(err.message).toBe("Asset not found");
  });
});

describe("ForbiddenError", () => {
  it("has statusCode 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Forbidden");
  });

  it("accepts a custom message", () => {
    const err = new ForbiddenError("admin only");
    expect(err.message).toBe("admin only");
  });
});
