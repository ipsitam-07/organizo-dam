import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";

vi.mock("@/services/auth.service", () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock("@/utils/storage", () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getUserKey: vi.fn(),
  setUserKey: vi.fn(),
  clearUser: vi.fn(),
}));

import { AuthProvider, useAuth } from "../../src/context/AuthContext";
import {
  getToken,
  setToken,
  clearToken,
  getUserKey,
  setUserKey,
  clearUser,
} from "../../src/utils/storage";
import { authApi } from "../../src/services/auth.service";

const mockUser = {
  id: "u1",
  email: "test@example.com",
  role: "user" as const,
  is_active: true,
};
const mockAuthResponse = { token: "jwt-token", user: mockUser };

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(getUserKey).mockReturnValue(null);
  vi.clearAllMocks();
});

describe("AuthContext initial state", () => {
  it("starts unauthenticated when no token in storage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it("starts with isHydrating=true when a token exists in storage", () => {
    vi.mocked(getToken).mockReturnValue("stored-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isHydrating).toBe(true);
  });

  it("restores user from localStorage on mount", () => {
    vi.mocked(getToken).mockReturnValue("stored-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.token).toBe("stored-token");
    expect(result.current.user?.email).toBe("test@example.com");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("handles corrupted user JSON in localStorage gracefully", () => {
    vi.mocked(getToken).mockReturnValue("some-token");
    vi.mocked(getUserKey).mockReturnValue("not-valid-json{{{");
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("AuthContext login", () => {
  it("sets token and user in storage on login", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login(mockAuthResponse);
    });
    expect(setToken).toHaveBeenCalledWith("jwt-token");
    expect(setUserKey).toHaveBeenCalledWith(JSON.stringify(mockUser));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe("test@example.com");
    expect(result.current.token).toBe("jwt-token");
  });

  it("sets isHydrating to false after login", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login(mockAuthResponse);
    });
    expect(result.current.isHydrating).toBe(false);
  });
});

describe("AuthContext logout", () => {
  it("clears storage and resets state on logout", async () => {
    vi.mocked(getToken).mockReturnValue("jwt-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(authApi.logout).toHaveBeenCalled();
    expect(clearToken).toHaveBeenCalled();
    expect(clearUser).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it("still clears local state even if server logout call fails", async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new Error("network error"));
    vi.mocked(getToken).mockReturnValue("jwt-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(clearToken).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("AuthContext auth:unauthorized event", () => {
  it("clears state when auth:unauthorized is dispatched", () => {
    vi.mocked(getToken).mockReturnValue("jwt-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isHydrating).toBe(false);
  });
});

describe("AuthContext setHydrated", () => {
  it("sets isHydrating to false", () => {
    vi.mocked(getToken).mockReturnValue("some-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isHydrating).toBe(true);
    act(() => {
      result.current.setHydrated();
    });
    expect(result.current.isHydrating).toBe(false);
  });
});

describe("useAuth outside provider", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used inside <AuthProvider>"
    );
  });
});
