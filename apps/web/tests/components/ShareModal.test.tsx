import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/hooks/useCreateShareLink", () => ({
  useCreateShareLink: vi.fn(),
}));

import { useCreateShareLink } from "../../src/hooks/useCreateShareLink";
import { ShareModal } from "../../src/components/dashboard/ShareModal";

const mockAsset = {
  id: "asset-1",
  original_filename: "photo.jpg",
} as any;

function renderModal(overrides = {}) {
  const onClose = vi.fn();

  const createMock = {
    mutate: vi.fn(),
    isPending: false,
    ...overrides,
  };

  vi.mocked(useCreateShareLink).mockReturnValue(createMock as any);

  render(<ShareModal asset={mockAsset} onClose={onClose} />);

  return { onClose, createMock };
}

beforeEach(() => {
  vi.clearAllMocks();

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn(),
    },
  });
});

describe("ShareModal", () => {
  it("renders asset filename in description", () => {
    renderModal();

    expect(screen.getByText(/photo.jpg/i)).toBeInTheDocument();
  });

  it("calls mutate when create link button clicked", () => {
    const { createMock } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(createMock.mutate).toHaveBeenCalled();
  });

  it("passes form values to mutation", () => {
    const { createMock } = renderModal();

    fireEvent.change(screen.getByPlaceholderText("e.g. 24"), {
      target: { value: "24" },
    });

    fireEvent.change(screen.getByPlaceholderText("e.g. 10"), {
      target: { value: "5" },
    });

    fireEvent.change(screen.getByPlaceholderText(/leave blank/i), {
      target: { value: "secret" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    expect(createMock.mutate).toHaveBeenCalledWith(
      {
        password: "secret",
        max_downloads: 5,
        expires_in_hours: 24,
      },
      expect.any(Object)
    );
  });

  it("shows share URL after successful creation", async () => {
    const { createMock } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    const call = createMock.mutate.mock.calls[0][1];

    call.onSuccess({ token: "abc123" });

    await waitFor(() => {
      expect(screen.getByText(/share\/abc123/i)).toBeInTheDocument();
    });
  });

  it("copies URL to clipboard", async () => {
    const { createMock } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    const call = createMock.mutate.mock.calls[0][1];
    call.onSuccess({ token: "abc123" });

    await waitFor(() => {
      expect(screen.getByText(/share\/abc123/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("shows error message on failure", async () => {
    const { createMock } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    const call = createMock.mutate.mock.calls[0][1];
    call.onError(new Error("Failed"));

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it("calls onClose when cancel clicked", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
