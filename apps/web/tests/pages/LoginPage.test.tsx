/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/render";
import { LoginPage } from "../../src/components/pages/Login";
import { authApi } from "../../src/services/auth.service";

vi.mock("@/services/auth.service", () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/hooks/useAuth")>();
  return { ...actual, useBootstrapAuth: vi.fn() };
});

const mockUser = {
  id: "u1",
  email: "test@example.com",
  role: "user",
  is_active: true,
};

describe("LoginPage", () => {
  it("renders email and password inputs", () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^password$/i, { selector: "input" })
    ).toBeInTheDocument();
  });

  it("calls the login API with the entered credentials", async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      token: "jwt",
      user: mockUser,
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });

    fireEvent.change(
      screen.getByLabelText(/^password$/i, { selector: "input" }),
      { target: { value: "Password1" } }
    );

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Password1",
      });
    });
  });

  it("shows a validation error when email is missing", async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it("shows a validation error when password is missing", async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("shows 'Invalid email or password' when the API returns 401", async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      message: "Unauthorized",
      status: 401,
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(
      screen.getByLabelText(/^password$/i, { selector: "input" }),
      { target: { value: "WrongPass1" } }
    );

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument();
    });
  });

  it("shows a generic error message when the API fails with a non-401 error", async () => {
    vi.mocked(authApi.login).mockRejectedValue({
      message: "Internal Server Error",
      status: 500,
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(
      screen.getByLabelText(/^password$/i, { selector: "input" }),
      { target: { value: "Password1" } }
    );

    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });
  });

  it("disables the submit button while a login request is in flight", async () => {
    vi.mocked(authApi.login).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(
      screen.getByLabelText(/^password$/i, { selector: "input" }),
      { target: { value: "Password1" } }
    );

    const submitBtn = screen.getByRole("button", { name: /^sign in$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /signing in/i })
      ).toBeDisabled();
    });
  });
});
