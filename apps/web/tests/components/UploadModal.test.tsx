import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useUpload", () => ({
  useUpload: vi.fn(),
}));

import { useUpload } from "../../src/hooks/useUpload";
import { UploadModal } from "../../src/components/dashboard/UploadModal";
import { UI_STRINGS } from "../../src/constants/ui.constants";

function renderModal(overrides = {}) {
  const onClose = vi.fn();

  const uploadMock = {
    files: [],
    active: false,
    allDone: false,
    anyError: false,
    doneCount: 0,
    errCount: 0,
    uploadAll: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };

  vi.mocked(useUpload).mockReturnValue(uploadMock as any);

  render(<UploadModal onClose={onClose} />);

  return { uploadMock, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UploadModal", () => {
  it("renders upload dropzone when idle", () => {
    renderModal();

    expect(
      screen.getByText(UI_STRINGS.UPDATE_MODAL.UPLOAD_FILE_TEXT)
    ).toBeInTheDocument();
  });

  it("opens file picker when clicking dropzone", () => {
    renderModal();

    const dropzone = screen
      .getByText(UI_STRINGS.UPDATE_MODAL.UPLOAD_FILE_TEXT)
      .closest("div");

    expect(dropzone).toBeInTheDocument();
  });

  it("calls uploadAll when files selected", () => {
    const { uploadMock } = renderModal();

    const file = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });

    const input = document.querySelector(
      "input[type=file]"
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(uploadMock.uploadAll).toHaveBeenCalled();
  });

  it("renders uploaded files list", () => {
    renderModal({
      files: [
        {
          id: "1",
          file: new File(["a"], "test.jpg"),
          status: "done",
          percent: 100,
        },
      ],
    });

    expect(screen.getByText("test.jpg")).toBeInTheDocument();
  });

  it("shows completion message when allDone", () => {
    renderModal({
      files: [
        {
          id: "1",
          file: new File(["a"], "test.jpg"),
          status: "done",
          percent: 100,
        },
      ],
      allDone: true,
      doneCount: 1,
    });

    expect(screen.getByText(/uploaded/i)).toBeInTheDocument();
  });

  it("calls reset when clicking upload more", () => {
    const { uploadMock } = renderModal({
      allDone: true,
      doneCount: 1,
    });

    fireEvent.click(screen.getByText(UI_STRINGS.UPDATE_MODAL.UPLOAD_MORE));

    expect(uploadMock.reset).toHaveBeenCalled();
  });

  it("calls onClose when clicking close", () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByText(UI_STRINGS.UPDATE_MODAL.CLOSE));

    expect(onClose).toHaveBeenCalled();
  });

  it("disables close button while uploading", () => {
    renderModal({
      active: true,
    });

    const btn = screen.getByRole("button");

    expect(btn).toBeDisabled();
  });
});
