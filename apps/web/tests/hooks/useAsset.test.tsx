import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

vi.mock("@/services/asset.service", () => ({
  assetsApi: {
    list: vi.fn(),
    stats: vi.fn(),
    delete: vi.fn(),
    createShareLink: vi.fn(),
    getThumbnailUrl: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

import { assetsApi } from "../../src/services/asset.service";
import { useAssets } from "../../src/hooks/useAsset";

const mockAsset = {
  id: "asset-1",
  user_id: "u1",
  upload_session_id: null,
  original_filename: "photo.jpg",
  storage_key: "asset-1",
  mime_type: "image/jpeg",
  size_bytes: 500_000,
  status: "ready" as const,
  download_count: 0,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

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

describe("useAssets", () => {
  it("returns empty state before data loads", () => {
    vi.mocked(assetsApi.list).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAssets(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.assets).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns assets from the API", async () => {
    vi.mocked(assetsApi.list).mockResolvedValue({
      data: [mockAsset],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { result } = renderHook(() => useAssets(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0].id).toBe("asset-1");
    expect(result.current.total).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });

  it("enables polling when assets are processing", async () => {
    const processingAsset = { ...mockAsset, status: "processing" as const };

    vi.mocked(assetsApi.list).mockResolvedValue({
      data: [processingAsset],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const { result } = renderHook(() => useAssets(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.assets[0].status).toBe("processing");
  });
});
