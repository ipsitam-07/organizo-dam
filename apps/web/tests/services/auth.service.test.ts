import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/axios", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "../../src/config/axios";
import { authApi } from "../../src/services/auth.service";

beforeEach(() => vi.clearAllMocks());

describe("authApi.register", () => {
  it("posts to /auth/register and returns the response", async () => {
    const mockResp = {
      token: "t",
      user: { id: "u1", email: "a@b.com", role: "user", is_active: true },
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResp });

    const result = await authApi.register({
      email: "a@b.com",
      password: "Password1",
    });

    expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
      email: "a@b.com",
      password: "Password1",
    });
    expect(result.token).toBe("t");
  });
});

describe("authApi.login", () => {
  it("posts to /auth/login and returns token + user", async () => {
    const mockResp = {
      token: "jwt-abc",
      user: { id: "u1", email: "a@b.com", role: "user", is_active: true },
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResp });

    const result = await authApi.login({
      email: "a@b.com",
      password: "Password1",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Object)
    );
    expect(result.token).toBe("jwt-abc");
    expect(result.user.email).toBe("a@b.com");
  });
});

describe("authApi.logout", () => {
  it("posts to /auth/logout", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

    await authApi.logout();

    expect(apiClient.post).toHaveBeenCalledWith("/auth/logout");
  });
});

describe("authApi.getMe", () => {
  it("returns user when server wraps in data field", async () => {
    const user = { id: "u1", email: "a@b.com", role: "user", is_active: true };
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: user } });

    const result = await authApi.getMe();

    expect(result.id).toBe("u1");
  });

  it("returns user when server returns it directly", async () => {
    const user = { id: "u1", email: "a@b.com", role: "user", is_active: true };
    vi.mocked(apiClient.get).mockResolvedValue({ data: user });

    const result = await authApi.getMe();

    expect(result.email).toBe("a@b.com");
  });
});
