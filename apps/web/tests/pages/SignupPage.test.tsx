/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/render";
import { SignUpPage } from "../../src/components/pages/SignUp";
import { authApi } from "../../src/services/auth.service";

vi.mock("@/services/auth.service", () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/hooks/useAuth")>();
  return { ...actual, useBootstrapAuth: vi.fn() };
});

const mockUser = {
  id: "u1",
  email: "new@example.com",
  role: "user",
  is_active: true,
};

// Helper: fill and submit the form
function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: email },
  });
  fireEvent.change(
    screen.getByLabelText(/^password$/i, { selector: "input" }),
    { target: { value: password } }
  );
  fireEvent.click(screen.getByRole("button", { name: /^create account$/i }));
}

// ─────────────────────────────────────────────────────────────────────────────
describe("SignUpPage", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────
  describe("rendering", () => {
    it("renders the email input", () => {
      renderWithProviders(<SignUpPage />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders the password input", () => {
      renderWithProviders(<SignUpPage />);
      expect(
        screen.getByLabelText(/^password$/i, { selector: "input" })
      ).toBeInTheDocument();
    });

    it("renders the submit button with 'Create account' label", () => {
      renderWithProviders(<SignUpPage />);
      expect(
        screen.getByRole("button", { name: /^create account$/i })
      ).toBeInTheDocument();
    });

    it("renders a link to the login page", () => {
      renderWithProviders(<SignUpPage />);
      expect(
        screen.getByRole("link", { name: /sign in/i })
      ).toBeInTheDocument();
    });

    it("does not show a password strength meter before any input", () => {
      renderWithProviders(<SignUpPage />);
      expect(
        screen.queryByText(/weak|fair|good|strong/i)
      ).not.toBeInTheDocument();
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  describe("validation", () => {
    it("shows 'Email is required' when submitted with no email", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.click(
        screen.getByRole("button", { name: /^create account$/i })
      );
      await waitFor(() =>
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      );
    });

    it("shows 'Enter a valid email' for a malformed email address", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "not-an-email" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /^create account$/i })
      );
      await waitFor(() =>
        expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()
      );
    });

    it("shows 'Password is required' when submitted with no password", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /^create account$/i })
      );
      await waitFor(() =>
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      );
    });

    it("shows 'At least 8 characters' for a short password", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "user@example.com" },
      });
      fireEvent.change(
        screen.getByLabelText(/^password$/i, { selector: "input" }),
        { target: { value: "short" } }
      );
      fireEvent.click(
        screen.getByRole("button", { name: /^create account$/i })
      );
      await waitFor(() =>
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
      );
    });

    it("clears the email error as soon as the user starts typing", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.click(
        screen.getByRole("button", { name: /^create account$/i })
      );
      await waitFor(() =>
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      );
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "a" },
      });
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });

    it("does not call the API when validation fails", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.click(
        screen.getByRole("button", { name: /^create account$/i })
      );
      await waitFor(() =>
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      );
      expect(authApi.register).not.toHaveBeenCalled();
    });
  });

  // ── Password strength meter ────────────────────────────────────────────────
  describe("password strength meter", () => {
    it("shows 'Weak' for a password that is only 8 characters long", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.change(
        screen.getByLabelText(/^password$/i, { selector: "input" }),
        { target: { value: "aaaaaaaa" } }
      );
      expect(screen.getByText("Weak")).toBeInTheDocument();
    });

    it("shows 'Strong' for a complex password", async () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.change(
        screen.getByLabelText(/^password$/i, { selector: "input" }),
        { target: { value: "Str0ng!Pass#2" } }
      );
      expect(screen.getByText("Strong")).toBeInTheDocument();
    });

    it("shows 'Fair' for a medium-strength password", async () => {
      renderWithProviders(<SignUpPage />);
      // 8 chars + uppercase = score 2 → Fair
      fireEvent.change(
        screen.getByLabelText(/^password$/i, { selector: "input" }),
        { target: { value: "Abcdefgh" } }
      );
      expect(screen.getByText("Fair")).toBeInTheDocument();
    });
  });

  // ── Show / hide password toggle ────────────────────────────────────────────
  describe("show/hide password toggle", () => {
    it("password input is type='password' by default", () => {
      renderWithProviders(<SignUpPage />);
      expect(
        screen.getByLabelText(/^password$/i, { selector: "input" })
      ).toHaveAttribute("type", "password");
    });

    it("toggles to type='text' when the eye button is clicked", () => {
      renderWithProviders(<SignUpPage />);
      fireEvent.click(screen.getByRole("button", { name: /show password/i }));
      expect(
        screen.getByLabelText(/^password$/i, { selector: "input" })
      ).toHaveAttribute("type", "text");
    });

    it("toggles back to type='password' on a second click", () => {
      renderWithProviders(<SignUpPage />);
      const toggle = screen.getByRole("button", { name: /show password/i });
      fireEvent.click(toggle);
      fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
      expect(
        screen.getByLabelText(/^password$/i, { selector: "input" })
      ).toHaveAttribute("type", "password");
    });
  });

  // ── API integration ────────────────────────────────────────────────────────
  describe("API integration", () => {
    it("calls authApi.register with the entered credentials", async () => {
      vi.mocked(authApi.register).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockResolvedValue({
        token: "jwt",
        user: mockUser,
      });

      renderWithProviders(<SignUpPage />);
      fillForm("new@example.com", "Password1!");

      await waitFor(() =>
        expect(authApi.register).toHaveBeenCalledWith({
          email: "new@example.com",
          password: "Password1!",
        })
      );
    });

    it("disables the submit button and shows 'Creating account…' while pending", async () => {
      // Never-resolving promise keeps isPending=true
      vi.mocked(authApi.register).mockReturnValue(new Promise(() => {}));

      renderWithProviders(<SignUpPage />);
      fillForm("new@example.com", "Password1!");

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /creating account/i })
        ).toBeDisabled()
      );
    });

    it("shows the API error message when registration fails", async () => {
      vi.mocked(authApi.register).mockRejectedValue({
        message: "Email already in use",
        status: 409,
      });

      renderWithProviders(<SignUpPage />);
      fillForm("taken@example.com", "Password1!");

      await waitFor(() =>
        expect(screen.getByText(/email already in use/i)).toBeInTheDocument()
      );
    });

    it("shows a fallback error when the API error has no message", async () => {
      vi.mocked(authApi.register).mockRejectedValue({ status: 500 });

      renderWithProviders(<SignUpPage />);
      fillForm("new@example.com", "Password1!");

      await waitFor(() =>
        expect(
          screen.getByText(/registration failed\. please try again/i)
        ).toBeInTheDocument()
      );
    });
  });
});
