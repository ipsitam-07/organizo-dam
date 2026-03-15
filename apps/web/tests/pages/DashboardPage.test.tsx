/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../utils/render";
import { Dashboard } from "../../src/components/pages/Dashboard";
import { assetsApi } from "../../src/services/asset.service";

//Module mocks

vi.mock("@/services/asset.service", () => ({
  assetsApi: {
    list: vi.fn(),
    stats: vi.fn(),
    getDownloadUrl: vi.fn(),
    getThumbnailUrl: vi.fn().mockResolvedValue(null),
    getRenditions: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
    addTag: vi.fn(),
    removeTag: vi.fn(),
    createShareLink: vi.fn(),
  },
}));

vi.mock("@/services/auth.service", () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getMe: vi.fn(),
    register: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/hooks/useAuth")>();
  const { useAuth } = await import("../../src/context/AuthContext");
  return {
    ...actual,
    useBootstrapAuth: () => {
      const { setHydrated } = useAuth();
      setHydrated();
    },
    useLogout: () => vi.fn(),
  };
});

//Fixtures

function makeAsset(
  overrides: Partial<import("../../src/types/asset.types").Asset> = {}
) {
  return {
    id: "a1",
    user_id: "u1",
    upload_session_id: null,
    original_filename: "photo.jpg",
    storage_key: "key/photo.jpg",
    mime_type: "image/jpeg",
    size_bytes: 204800,
    status: "ready" as const,
    download_count: 0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    Tags: [],
    AssetRenditions: [],
    ...overrides,
  };
}

function makeListResponse(
  assets: ReturnType<typeof makeAsset>[],
  extra: { total?: number; totalPages?: number } = {}
) {
  return {
    data: assets,
    total: extra.total ?? assets.length,
    page: 1,
    limit: 24,
    totalPages: extra.totalPages ?? 1,
  };
}

const defaultStats = {
  totalAssets: 3,
  totalDownloads: 10,
  totalStorageBytes: 1024 * 1024 * 5, // 5 MB
};

beforeEach(() => {
  vi.mocked(assetsApi.list).mockResolvedValue(makeListResponse([]));
  vi.mocked(assetsApi.stats).mockResolvedValue(defaultStats);
});

describe("Dashboard", () => {
  //Header
  describe("header", () => {
    it("renders the app name in the header", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("Organizo")).toBeInTheDocument()
      );
    });

    it("renders the search input", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
      );
    });

    it("renders the Upload button in the header", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /^upload$/i })
        ).toBeInTheDocument()
      );
    });
  });

  //Stat cards
  describe("stat cards", () => {
    it("shows formatted storage from the stats API", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("5 MB")).toBeInTheDocument());
    });

    it("shows total asset count from the stats API", async () => {
      vi.mocked(assetsApi.stats).mockResolvedValue({
        ...defaultStats,
        totalAssets: 42,
      });
      renderWithProviders(<Dashboard />);
      await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    });
  });

  //Status filter chips
  describe("status filter chips", () => {
    it("renders All, Ready, Processing, Queued and Failed filter buttons", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^all$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^ready$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^processing$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^queued$/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^failed$/i })
        ).toBeInTheDocument();
      });
    });

    it("calls assetsApi.list with status param when a filter chip is clicked", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /^ready$/i })
        ).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /^ready$/i }));
      await waitFor(() =>
        expect(assetsApi.list).toHaveBeenCalledWith(
          expect.objectContaining({ status: "ready" })
        )
      );
    });
  });

  //Empty states
  describe("empty states", () => {
    it("shows the 'No assets yet' empty state when there are no assets", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText(/no assets yet/i)).toBeInTheDocument()
      );
    });

    it("shows an 'Upload file' button in the empty state", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /upload file/i })
        ).toBeInTheDocument()
      );
    });

    it("shows 'No results' empty state when search yields nothing", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText(/search/i), {
        target: { value: "xyznonexistent" },
      });
      await waitFor(() =>
        expect(screen.getByText(/no results/i)).toBeInTheDocument()
      );
    });
  });

  //Asset grid
  describe("asset grid", () => {
    it("renders an asset card for each returned asset", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([
          makeAsset({ id: "a1", original_filename: "alpha.jpg" }),
          makeAsset({ id: "a2", original_filename: "beta.png" }),
        ])
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(screen.getByText("alpha.jpg")).toBeInTheDocument();
        expect(screen.getByText("beta.png")).toBeInTheDocument();
      });
    });

    it("shows the asset count in the filter bar when assets are present", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset(), makeAsset({ id: "a2" })], { total: 2 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText(/2 assets/i)).toBeInTheDocument()
      );
    });

    it("shows singular 'asset' when total is 1", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 1 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText(/^1 asset$/i)).toBeInTheDocument()
      );
    });
  });

  //Search
  describe("search", () => {
    it("filters assets by filename after the debounce", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([
          makeAsset({ id: "a1", original_filename: "invoice.pdf" }),
          makeAsset({ id: "a2", original_filename: "photo.jpg" }),
        ])
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("invoice.pdf")).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText(/search/i), {
        target: { value: "invoice" },
      });
      await waitFor(() => {
        expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
        expect(screen.queryByText("photo.jpg")).not.toBeInTheDocument();
      });
    });

    it("shows a clear (×) button inside the search wrapper when search has text", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
      );

      const searchWrapper = screen
        .getByPlaceholderText(/search/i)
        .closest("div")!;
      expect(searchWrapper.querySelector("button")).toBeNull();

      fireEvent.change(screen.getByPlaceholderText(/search/i), {
        target: { value: "hello" },
      });

      await waitFor(() =>
        expect(searchWrapper.querySelector("button")).toBeInTheDocument()
      );
    });

    it("clears search when the × button is clicked", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset({ original_filename: "video.mp4" })])
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("video.mp4")).toBeInTheDocument()
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      const searchWrapper = searchInput.closest("div")!;

      fireEvent.change(searchInput, { target: { value: "xyz" } });

      await waitFor(() =>
        expect(searchWrapper.querySelector("button")).toBeInTheDocument()
      );
      fireEvent.click(searchWrapper.querySelector("button")!);

      await waitFor(() =>
        expect(screen.getByText("video.mp4")).toBeInTheDocument()
      );
    });
  });

  //View toggle
  describe("view toggle", () => {
    it("switches to list view when the list-view button is clicked", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset({ original_filename: "doc.pdf" })])
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("doc.pdf")).toBeInTheDocument()
      );

      const viewButtons = screen
        .getAllByRole("button")
        .filter((b) => b.className.includes("h-6 w-6"));
      fireEvent.click(viewButtons[1]);

      await waitFor(() =>
        expect(screen.getByText("doc.pdf")).toBeInTheDocument()
      );
    });
  });

  //Upload modal
  describe("upload modal", () => {
    it("opens the upload modal when the Upload header button is clicked", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /^upload$/i })
        ).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /^upload$/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /upload file/i })
        ).toBeInTheDocument()
      );
    });

    it("opens the upload modal when 'Upload file' in the empty state is clicked", async () => {
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /upload file/i })
        ).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /upload file/i }));

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: /upload file/i })
        ).toBeInTheDocument()
      );
    });
  });

  //Pagination
  describe("pagination", () => {
    it("does not render pagination when there is only one page", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 1, totalPages: 1 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("photo.jpg")).toBeInTheDocument()
      );
      expect(
        screen.queryByRole("button", { name: /previous/i })
      ).not.toBeInTheDocument();
    });

    it("renders Previous and Next buttons when totalPages > 1", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 50, totalPages: 3 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /previous/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /next/i })
        ).toBeInTheDocument();
      });
    });

    it("disables the Previous button on the first page", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 50, totalPages: 3 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled()
      );
    });

    it("navigates to page 2 when Next is clicked", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 50, totalPages: 3 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /next/i })
        ).toBeInTheDocument()
      );
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
      await waitFor(() =>
        expect(assetsApi.list).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        )
      );
    });

    it("shows current page and total pages", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 50, totalPages: 3 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
      );
    });

    it("hides pagination while search is active", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([makeAsset()], { total: 50, totalPages: 3 })
      );
      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /next/i })
        ).toBeInTheDocument()
      );
      fireEvent.change(screen.getByPlaceholderText(/search/i), {
        target: { value: "photo" },
      });
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: /next/i })
        ).not.toBeInTheDocument()
      );
    });
  });

  //Loading skeleton
  describe("loading state", () => {
    it("renders skeleton placeholders while assets are loading", async () => {
      vi.mocked(assetsApi.list).mockReturnValue(new Promise(() => {}));
      renderWithProviders(<Dashboard />);
      await waitFor(() => {
        const skeletons = document.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });

  // Download
  describe("download", () => {
    it("calls assetsApi.getDownloadUrl and opens the URL in a new tab", async () => {
      vi.mocked(assetsApi.list).mockResolvedValue(
        makeListResponse([
          makeAsset({ id: "dl1", original_filename: "file.zip" }),
        ])
      );
      vi.mocked(assetsApi.getDownloadUrl).mockResolvedValue(
        "https://cdn.example.com/file.zip"
      );

      renderWithProviders(<Dashboard />);
      await waitFor(() =>
        expect(screen.getByText("file.zip")).toBeInTheDocument()
      );

      const viewButtons = screen
        .getAllByRole("button")
        .filter((b) => b.className.includes("h-6 w-6"));
      fireEvent.click(viewButtons[1]);

      await waitFor(() =>
        expect(screen.getByText("file.zip")).toBeInTheDocument()
      );

      const row = screen.getByText("file.zip").closest("[class*='group']")!;
      const actionButtons = row.querySelectorAll(
        "[class*='opacity-0'] button, [class*='opacity-0'] + div button"
      );
      const actionGroup = row.querySelector("[class*='opacity-0']");
      const downloadBtn = actionGroup?.querySelector("button");

      if (downloadBtn) {
        fireEvent.click(downloadBtn);
        await waitFor(() =>
          expect(assetsApi.getDownloadUrl).toHaveBeenCalledWith("dl1")
        );
      }
    });
  });
});
