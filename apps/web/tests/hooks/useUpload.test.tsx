import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

vi.mock("@/utils/storage", () => ({
  getToken: vi.fn().mockReturnValue("test-token"),
}));

vi.mock("tus-js-client", () => ({
  Upload: vi.fn(),
}));

import { useUpload } from "../../src/hooks/useUpload";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => vi.clearAllMocks());

describe("useUpload", () => {
  it("starts with empty state", () => {
    const { result } = renderHook(() => useUpload(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.active).toBe(false);
    expect(result.current.allDone).toBe(false);
    expect(result.current.anyError).toBe(false);
    expect(result.current.doneCount).toBe(0);
    expect(result.current.errCount).toBe(0);
  });

  it("reset clears files and active state", () => {
    const { result } = renderHook(() => useUpload(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.active).toBe(false);
  });

  it("errCount increases and anyError is true when a file fails", async () => {
    const { Upload } = await import("tus-js-client");
    vi.mocked(Upload).mockImplementation(
      (_file: unknown, opts: any) =>
        ({
          start: () => opts.onError(new Error("Network failure")),
        }) as any
    );

    const { result } = renderHook(() => useUpload(), {
      wrapper: makeWrapper(),
    });

    const file = new File(["content"], "fail.mp4", { type: "video/mp4" });

    await act(async () => {
      await result.current.uploadAll([file]);
    });

    await waitFor(() => expect(result.current.allDone).toBe(true));

    expect(result.current.anyError).toBe(true);
    expect(result.current.errCount).toBe(1);
    expect(result.current.doneCount).toBe(0);
  });
});
