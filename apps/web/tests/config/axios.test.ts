import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

vi.mock("@/utils/storage", () => ({
  getToken: vi.fn(),
  clearToken: vi.fn(),
  clearUser: vi.fn(),
}));

import { getToken, clearToken, clearUser } from "../../src/utils/storage";
import { apiClient } from "../../src/config/axios";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("apiClient", () => {
  it("is an axios instance", () => {
    expect(axios.isAxiosError).toBeDefined();
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
  });

  it("has the correct baseURL default", () => {
    expect(apiClient.defaults.baseURL).toBe("http://localhost/api");
  });

  it("has Content-Type application/json set", () => {
    expect(
      (apiClient.defaults.headers as Record<string, string>)["Content-Type"]
    ).toBe("application/json");
  });

  it("attaches Authorization header when token exists", async () => {
    vi.mocked(getToken).mockReturnValue("test-jwt-token");
    const requestConfig = { headers: {} as Record<string, string> };
    const interceptor = (apiClient.interceptors.request as any).handlers[0];
    const result = await interceptor.fulfilled(requestConfig);
    expect(result.headers["Authorization"]).toBe("Bearer test-jwt-token");
  });

  it("does not attach Authorization header when no token", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    const requestConfig = { headers: {} as Record<string, string> };
    const interceptor = (apiClient.interceptors.request as any).handlers[0];
    const result = await interceptor.fulfilled(requestConfig);
    expect(result.headers["Authorization"]).toBeUndefined();
  });

  it("clears token and dispatches auth:unauthorized event on 401", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const responseInterceptor = (apiClient.interceptors.response as any)
      .handlers[0];
    const error = {
      response: {
        status: 401,
        data: { error: "Unauthorized" },
      },
      message: "Request failed",
    };
    await expect(responseInterceptor.rejected(error)).rejects.toMatchObject({
      status: 401,
    });
    expect(clearToken).toHaveBeenCalled();
    expect(clearUser).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth:unauthorized" })
    );
  });

  it("rejects with structured ApiError on non-401 errors", async () => {
    const responseInterceptor = (apiClient.interceptors.response as any)
      .handlers[0];
    const error = {
      response: {
        status: 500,
        data: { error: "Internal Server Error" },
      },
      message: "Request failed",
    };
    await expect(responseInterceptor.rejected(error)).rejects.toMatchObject({
      message: "Internal Server Error",
      status: 500,
    });
  });

  it("falls back to error.message when response data has no error field", async () => {
    const responseInterceptor = (apiClient.interceptors.response as any)
      .handlers[0];
    const error = {
      response: { status: 503, data: {} },
      message: "Network Error",
    };
    await expect(responseInterceptor.rejected(error)).rejects.toMatchObject({
      message: "Network Error",
      status: 503,
    });
  });
});
