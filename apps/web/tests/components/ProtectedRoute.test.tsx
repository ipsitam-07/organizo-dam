import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/utils/storage", () => ({
  getToken: vi.fn().mockReturnValue(null),
  getUserKey: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  setUserKey: vi.fn(),
  clearToken: vi.fn(),
  clearUser: vi.fn(),
}));

vi.mock("@/hooks/useAuth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/hooks/useAuth")>();
  const { useAuth } = await import("../../src/context/AuthContext");
  return {
    ...actual,
    useBootstrapAuth: () => {
      const { setHydrated } = useAuth();
      setHydrated();
    },
  };
});

import { getToken, getUserKey } from "../../src/utils/storage";
import { AuthProvider } from "../../src/context/AuthContext";
import { ProtectedRoute } from "../../src/components/layout/ProtectedRoute";

const mockUser = {
  id: "u1",
  email: "test@example.com",
  role: "user",
  is_active: true,
};

describe("ProtectedRoute", () => {
  it("redirects to login when unauthenticated", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login page</div>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div>Dashboard</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    vi.mocked(getToken).mockReturnValue("valid-token");
    vi.mocked(getUserKey).mockReturnValue(JSON.stringify(mockUser));

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AuthProvider>
            <Routes>
              <Route path="/dashboard" element={<div>Dashboard content</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});
