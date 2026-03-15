import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/utils/storage", () => ({
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getUserKey: vi.fn().mockReturnValue(null),
  setUserKey: vi.fn(),
  clearUser: vi.fn(),
}));

import { Modal } from "../../src/components/ui/modal";
import { getToken, getUserKey } from "../../src/utils/storage";

beforeEach(() => {
  vi.mocked(getToken).mockReturnValue(null);
  vi.mocked(getUserKey).mockReturnValue(null);
  vi.clearAllMocks();
});

//Modal

describe("Modal", () => {
  it("renders nothing when open is false", () => {
    render(
      <Modal open={false} title="Test" onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders children when open is true", () => {
    render(
      <Modal open={true} title="My Modal" onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    );
    expect(screen.getByText("My Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not fire Escape handler when closed", () => {
    const onClose = vi.fn();
    render(
      <Modal open={false} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
