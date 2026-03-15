import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useDeleteAsset", () => ({
  useDeleteAsset: vi.fn(),
}));

import { useDeleteAsset } from "../../src/hooks/useDeleteAsset";
import { DeleteModal } from "../../src/components/dashboard/DeleteModal";

const mockAsset = {
  id: "asset-1",
  original_filename: "photo.jpg",
} as any;

function renderModal(overrides = {}) {
  const onClose = vi.fn();

  const delMock = {
    mutate: vi.fn(),
    isPending: false,
    ...overrides,
  };

  vi.mocked(useDeleteAsset).mockReturnValue(delMock as any);

  render(<DeleteModal asset={mockAsset} onClose={onClose} />);

  return { onClose, delMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DeleteModal", () => {
  it("renders asset filename in warning text", () => {
    renderModal();

    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
  });

  it("calls onClose when cancel button clicked", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls delete mutation with asset id", () => {
    const { delMock } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(delMock.mutate).toHaveBeenCalledWith(
      "asset-1",
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("disables delete button when mutation is pending", () => {
    renderModal({ isPending: true });

    const btn = screen.getByRole("button", { name: /deleting/i });

    expect(btn).toBeDisabled();
  });

  it("calls onClose when delete succeeds", () => {
    const { delMock, onClose } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    const call = delMock.mutate.mock.calls[0][1];

    call.onSuccess();

    expect(onClose).toHaveBeenCalled();
  });
});
