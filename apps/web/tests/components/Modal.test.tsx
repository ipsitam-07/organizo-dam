import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../../src/components/ui/modal";

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
    // The X button is the only button rendered inside the modal.
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    // The backdrop div carries both "absolute" and "inset-0" Tailwind classes
    // as literal class-name strings, so querySelector works even without CSS.
    const backdrop = container.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape when the modal is closed", () => {
    const onClose = vi.fn();
    render(
      <Modal open={false} title="Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the correct title", () => {
    render(
      <Modal open={true} title="My Title" onClose={vi.fn()}>
        <p>body</p>
      </Modal>
    );
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });
});
