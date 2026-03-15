import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/services/asset.service", () => ({
  assetsApi: {
    getDownloadUrl: vi.fn(),
    getRenditions: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "id"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { assetsApi } from "../../src/services/asset.service";
import { DetailModal } from "../../src/components/dashboard/DetailModal";

const mockAsset = {
  id: "asset-1",
  original_filename: "video.mp4",
  mime_type: "video/mp4",
  size_bytes: 1000000,
  status: "ready",
  download_count: 3,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  Tags: [{ id: "t1", name: "video" }],
};

function renderModal(props = {}) {
  const handlers = {
    onShare: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };

  render(<DetailModal asset={mockAsset} {...handlers} {...props} />);

  return handlers;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DetailModal", () => {
  it("renders filename and metadata", () => {
    renderModal();

    expect(screen.getByText("video.mp4")).toBeInTheDocument();
    expect(screen.getByText(/downloads/i)).toBeInTheDocument();
  });

  it("renders tags", () => {
    renderModal();

    expect(screen.getByText("video")).toBeInTheDocument();
  });

  it("calls share handler", () => {
    const handlers = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    expect(handlers.onClose).toHaveBeenCalled();
    expect(handlers.onShare).toHaveBeenCalledWith(mockAsset);
  });

  it("calls delete handler", () => {
    const handlers = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(handlers.onClose).toHaveBeenCalled();
    expect(handlers.onDelete).toHaveBeenCalledWith(mockAsset);
  });

  it("downloads original file when clicking download", async () => {
    vi.mocked(assetsApi.getDownloadUrl).mockResolvedValue(
      "https://cdn/file.mp4"
    );

    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    await waitFor(() => {
      expect(assetsApi.getDownloadUrl).toHaveBeenCalledWith(
        "asset-1",
        undefined
      );
    });
  });

  it("disables share when asset is not ready", () => {
    renderModal({
      asset: { ...mockAsset, status: "processing" },
    });

    expect(screen.getByRole("button", { name: /share/i })).toBeDisabled();
  });
});
