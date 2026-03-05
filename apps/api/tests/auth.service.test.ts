import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "../src/services/auth.service";
import { userRepository } from "../src/repo/user.repo";

vi.mock("../src/repo/user.repo", () => ({
  userRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@repo/auth", () => ({
  redisClient: {
    setEx: vi.fn(),
    del: vi.fn(),
  },
  ConflictError: class ConflictError extends Error {
    statusCode = 409;
    constructor(message: string) {
      super(message);
    }
  },
  UnauthorizedError: class UnauthorizedError extends Error {
    statusCode = 401;
    constructor(message: string) {
      super(message);
    }
  },
}));

vi.mock("@repo/config", () => ({
  config: {
    jwt: { secret: "test-secret", expiry: "86400" },
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockUser = {
  id: "user-uuid-123",
  email: "user@example.com",
  password_hash: "$2a$12$hashedpassword",
  role: "user",
  is_active: true,
};

beforeEach(() => vi.clearAllMocks());

describe("AuthService.register", () => {
  it("creates a user and returns safe fields only", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(mockUser as any);

    const result = await authService.register({
      email: "user@example.com",
      password: "Password1",
    });

    expect(result).toEqual({
      id: "user-uuid-123",
      email: "user@example.com",
      role: "user",
    });
    expect((result as any).password_hash).toBeUndefined();
  });

  it("throws ConflictError if email already exists", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);

    await expect(
      authService.register({ email: "user@example.com", password: "Password1" })
    ).rejects.toThrow("Email already in use");
  });
});

describe("AuthService.login", () => {
  it("returns token and user on valid credentials", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("Password1", 12);

    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...mockUser,
      password_hash: hash,
    } as any);

    const { redisClient } = await import("@repo/auth");
    vi.mocked(redisClient.setEx).mockResolvedValue("OK");

    const result = await authService.login({
      email: "user@example.com",
      password: "Password1",
    });

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe("user@example.com");
    expect((result.user as any).password_hash).toBeUndefined();
  });

  it("throws UnauthorizedError when user not found", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

    await expect(
      authService.login({ email: "no@example.com", password: "Password1" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("throws UnauthorizedError on wrong password", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("CorrectPassword1", 12);

    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...mockUser,
      password_hash: hash,
    } as any);

    await expect(
      authService.login({
        email: "user@example.com",
        password: "WrongPassword1",
      })
    ).rejects.toThrow("Invalid credentials");
  });

  it("throws UnauthorizedError when user is inactive", async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({
      ...mockUser,
      is_active: false,
    } as any);

    await expect(
      authService.login({ email: "user@example.com", password: "Password1" })
    ).rejects.toThrow("Invalid credentials");
  });
});

describe("AuthService.logout", () => {
  it("deletes the session key from Redis", async () => {
    const { redisClient } = await import("@repo/auth");
    vi.mocked(redisClient.del).mockResolvedValue(1);

    await authService.logout("user-uuid-123");

    expect(redisClient.del).toHaveBeenCalledWith("session:user-uuid-123");
  });
});
