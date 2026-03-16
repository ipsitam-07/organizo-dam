import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

vi.mock("@/services/asset.service", () => ({
  assetsApi: {
    delete: vi.fn(),
  },
}));

import { assetsApi } from "../../src/services/asset.service";
import { useDeleteAsset } from "../../src/hooks/useDeleteAsset";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => vi.clearAllMocks());

describe("useDeleteAsset", () => {
  it("calls assetsApi.delete with the asset id", async () => {
    vi.mocked(assetsApi.delete).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAsset(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("asset-1");
    });

    expect(assetsApi.delete).toHaveBeenCalledWith("asset-1");
  });

  it("sets isPending to true while deleting", async () => {
    let resolve: () => void;

    vi.mocked(assetsApi.delete).mockReturnValue(
      new Promise((r) => {
        resolve = () => r(undefined);
      })
    );

    const { result } = renderHook(() => useDeleteAsset(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.mutate("asset-1");
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    act(() => {
      resolve!();
    });
  });

  it("exposes error state on failure", async () => {
    vi.mocked(assetsApi.delete).mockRejectedValue(new Error("Delete failed"));

    const { result } = renderHook(() => useDeleteAsset(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync("asset-1");
      } catch {
        // Expected error for testing purposes
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
