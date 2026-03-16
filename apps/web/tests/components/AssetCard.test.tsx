import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useCardThumbnail", () => ({
  useCardThumbnail: vi.fn(),
}));

import { useCardThumbnail } from "../../src/hooks/useCardThumbnail";
import { AssetCard } from "../../src/components/dashboard/AssetCard";

const mockAsset = {
  id: "asset-1",
  original_filename: "photo.jpg",
  mime_type: "image/jpeg",
  size_bytes: 500000,
  created_at: "2024-01-01T00:00:00.000Z",
  status: "ready",
  Tags: [
    { id: "t1", name: "image" },
    { id: "t2", name: "holiday" },
    { id: "t3", name: "extra" },
  ],
};

function renderCard(props = {}) {
  const handlers = {
    onView: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    onDownload: vi.fn(),
  };

  render(<AssetCard asset={mockAsset} {...handlers} {...props} />);

  return handlers;
}

describe("AssetCard", () => {
  it("renders filename and metadata", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    renderCard();

    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    expect(screen.getByText(/image ·/i)).toBeInTheDocument();
  });

  it("calls onView when card is clicked", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    const handlers = renderCard();

    fireEvent.click(screen.getByText("photo.jpg"));

    expect(handlers.onView).toHaveBeenCalledWith(mockAsset);
  });

  it("shows thumbnail when available", () => {
    vi.mocked(useCardThumbnail).mockReturnValue("https://cdn/thumb.jpg");

    renderCard();

    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://cdn/thumb.jpg"
    );
  });

  it("opens menu when kebab button clicked", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    renderCard();

    fireEvent.click(screen.getByLabelText("Options"));

    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls download action from menu", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    const handlers = renderCard();

    fireEvent.click(screen.getByLabelText("Options"));
    fireEvent.click(screen.getByText("Download"));

    expect(handlers.onDownload).toHaveBeenCalledWith(mockAsset);
  });

  it("calls delete action from menu", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    const handlers = renderCard();

    fireEvent.click(screen.getByLabelText("Options"));
    fireEvent.click(screen.getByText("Delete"));

    expect(handlers.onDelete).toHaveBeenCalledWith(mockAsset);
  });

  it("disables download/share when asset is not ready", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    renderCard({
      asset: { ...mockAsset, status: "processing" },
    });

    fireEvent.click(screen.getByLabelText("Options"));

    expect(screen.getByText("Download")).toBeDisabled();
    expect(screen.getByText("Share")).toBeDisabled();
  });

  it("shows first two tags and +count", () => {
    vi.mocked(useCardThumbnail).mockReturnValue(null);

    renderCard();

    expect(screen.getByText("image")).toBeInTheDocument();
    expect(screen.getByText("holiday")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
