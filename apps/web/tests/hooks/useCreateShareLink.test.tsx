import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

vi.mock("@/services/asset.service", () => ({
  assetsApi: {
    createShareLink: vi.fn(),
  },
}));

import { assetsApi } from "../../src/services/asset.service";
import { useCreateShareLink } from "../../src/hooks/useCreateShareLink";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useCreateShareLink", () => {
  it("calls assetsApi.createShareLink with the asset id and payload", async () => {
    const mockLink = {
      id: "link-1",
      token: "abc123",
      asset_id: "asset-1",
      download_count: 0,
      created_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(assetsApi.createShareLink).mockResolvedValue(mockLink);

    const { result } = renderHook(() => useCreateShareLink("asset-1"), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        expires_in_hours: 24,
        max_downloads: 5,
      });
    });

    expect(assetsApi.createShareLink).toHaveBeenCalledWith("asset-1", {
      expires_in_hours: 24,
      max_downloads: 5,
    });
  });

  it("returns the created share link", async () => {
    const mockLink = {
      id: "link-1",
      token: "tok-xyz",
      asset_id: "asset-1",
      download_count: 0,
      created_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(assetsApi.createShareLink).mockResolvedValue(mockLink);

    const { result } = renderHook(() => useCreateShareLink("asset-1"), {
      wrapper: makeWrapper(),
    });

    let data: typeof mockLink | undefined;

    await act(async () => {
      data = (await result.current.mutateAsync({})) as typeof mockLink;
    });

    expect(data?.token).toBe("tok-xyz");
  });
});
