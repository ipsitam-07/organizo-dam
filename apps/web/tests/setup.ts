import "@testing-library/jest-dom";
import { vi, afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";

function makeLocalStorageMock() {
  let store: Record<string, string> = {};

  const mock = {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key];
    }),
    clear: vi.fn((): void => {
      store = {};
    }),
    key: vi.fn(
      (index: number): string | null => Object.keys(store)[index] ?? null
    ),
    get length() {
      return Object.keys(store).length;
    },
    _reset() {
      store = {};
      mock.getItem.mockClear();
      mock.setItem.mockClear();
      mock.removeItem.mockClear();
      mock.clear.mockClear();
      mock.key.mockClear();
    },
  };
  return mock;
}

const localStorageMock = makeLocalStorageMock();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  localStorageMock._reset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorageMock._reset();
});

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

window.open = vi.fn();

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
