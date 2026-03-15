import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search,
  Upload,
  LogOut,
  RefreshCw,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  List,
  X,
  SlidersHorizontal,
  CheckCircle2,
  Clock4,
} from "lucide-react";
import { useBootstrapAuth, useLogout } from "@/hooks/useAuth";
import { useAssets, useAssetStats } from "@/hooks/useAsset";
import { UIProvider, useUI } from "@/store/ui";
import { AssetCard } from "@/components/dashboard/AssetCard";
import { UploadModal } from "@/components/dashboard/UploadModal";
import { DetailModal } from "@/components/dashboard/detail-modal/DetailModal";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { DeleteModal } from "@/components/dashboard/DeleteModal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/utils/utility";
import { assetsApi } from "@/services/asset.service";
import type { AssetStatus, AssetListParams, Asset } from "@/types/asset.types";
import type { ListViewProps } from "@/types/props.types";
import { APP_NAME } from "@/constants";
import { UI_STRINGS } from "@/constants/ui.constants";
import { cn } from "@/utils/utility";
import { useAuth } from "@/context/AuthContext";

export function Dashboard() {
  return (
    <UIProvider>
      <DashboardInner />
    </UIProvider>
  );
}

type View = "grid" | "list";

function DashboardInner() {
  useBootstrapAuth();
  const { user } = useAuth();
  const logout = useLogout();
  const ui = useUI();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "">("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<View>("grid");
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 200);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const params: AssetListParams = {
    page,
    limit: 24,
    ...(statusFilter ? { status: statusFilter } : {}),
  };
  const { assets, total, totalPages, isLoading, isFetching } =
    useAssets(params);
  const { data: stats } = useAssetStats();

  const filtered = debouncedSearch
    ? assets.filter(
        (a) =>
          a.original_filename
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          a.Tags?.some((t) => t.name.includes(debouncedSearch.toLowerCase()))
      )
    : assets;

  const handleDownload = useCallback(async (asset: Asset) => {
    try {
      window.open(await assetsApi.getDownloadUrl(asset.id), "_blank");
    } catch {
      /* todo toast */
    }
  }, []);

  const setStatus = (s: AssetStatus | "") => {
    setStatusFilter(s);
    setPage(1);
  };

  const statCards = [
    {
      icon: FolderOpen,
      label: "Assets",
      value: stats?.totalAssets ?? total,
      accent: false,
    },
    {
      icon: CheckCircle2,
      label: "Ready",
      value: assets.filter((a) => a.status === "ready").length,
      accent: true,
    },
    {
      icon: Clock4,
      label: "Processing",
      value: assets.filter(
        (a) => a.status === "queued" || a.status === "processing"
      ).length,
      accent: false,
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: stats ? formatBytes(stats.totalStorageBytes) : "—",
      accent: false,
    },
  ];

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-border bg-card/90 sticky top-0 z-30 border-b backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-3 px-4 md:px-6">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"
            >
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            <span className="font-display text-sm font-semibold tracking-tight">
              {APP_NAME}
            </span>
          </div>

          <div className="bg-border mx-2 hidden h-4 w-px md:block" />

          {/* Search */}
          <div className="relative max-w-xs flex-1">
            <Search
              size={12}
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-7 pr-6 pl-7 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {isFetching && !isLoading && (
              <RefreshCw
                size={11}
                className="text-muted-foreground animate-spin"
              />
            )}

            {/* View toggle */}
            <div className="border-border hidden items-center rounded-md border p-0.5 md:flex">
              {(["grid", "list"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded transition-colors",
                    view === v
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v === "grid" ? <LayoutGrid size={11} /> : <List size={11} />}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              onClick={() => ui.openUpload()}
              className="h-7 px-3 text-xs"
            >
              <Upload size={11} /> {UI_STRINGS.DASHBOARD.UPLOAD}
            </Button>

            <div className="border-border ml-1 flex items-center gap-1 border-l pl-2">
              <span className="text-muted-foreground hidden max-w-30 truncate text-[11px] md:block">
                {user?.email}
              </span>
              <button
                onClick={() => logout()}
                title="Sign out"
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-5 md:px-6">
        {/* Stats */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, accent }) => (
            <div
              key={label}
              className="border-border bg-card rounded-lg border px-4 py-3"
            >
              <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[10px] tracking-widest uppercase">
                <Icon size={10} className={accent ? "text-primary" : ""} />{" "}
                {label}
              </div>
              <p
                className={cn(
                  "text-xl font-semibold",
                  accent && "text-primary"
                )}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <SlidersHorizontal size={11} className="text-muted-foreground" />
          {(["", "ready", "processing", "queued", "failed"] as const).map(
            (s) => (
              <button
                key={s || "all"}
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  statusFilter === s
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 bg-transparent"
                )}
              >
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          )}
          {total > 0 && (
            <span className="text-muted-foreground ml-auto text-[11px]">
              {debouncedSearch ? `${filtered.length} of ` : ""}
              {total} {UI_STRINGS.DASHBOARD.ASSET}
              {total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Grid / List */}
        {isLoading ? (
          <div
            className={cn(
              "gap-2",
              view === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
                : "flex flex-col"
            )}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-muted animate-pulse rounded-lg",
                  view === "grid" ? "h-42" : "h-12"
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            searching={!!debouncedSearch}
            onUpload={() => ui.openUpload()}
          />
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onView={ui.openDetail}
                onShare={ui.openShare}
                onDelete={ui.openDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>
        ) : (
          <ListView
            assets={filtered}
            onView={ui.openDetail}
            onShare={ui.openShare}
            onDelete={ui.openDelete}
            onDownload={handleDownload}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && !debouncedSearch && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {UI_STRINGS.DASHBOARD.PREVIOUS}
            </Button>
            <span className="text-muted-foreground text-xs">
              {UI_STRINGS.DASHBOARD.PAGE} {page} {UI_STRINGS.DASHBOARD.OF}{" "}
              {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {UI_STRINGS.DASHBOARD.NEXT}
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        open={ui.modal === "upload"}
        title="Upload file"
        size="sm"
        onClose={ui.close}
      >
        <UploadModal onClose={ui.close} />
      </Modal>
      <Modal
        open={ui.modal === "detail"}
        title="Asset details"
        size="md"
        onClose={ui.close}
      >
        {ui.asset && (
          <DetailModal
            asset={ui.asset}
            onShare={ui.openShare}
            onDelete={ui.openDelete}
            onClose={ui.close}
          />
        )}
      </Modal>
      <Modal
        open={ui.modal === "share"}
        title="Share link"
        size="sm"
        onClose={ui.close}
      >
        {ui.asset && <ShareModal asset={ui.asset} onClose={ui.close} />}
      </Modal>
      <Modal
        open={ui.modal === "delete"}
        title="Delete asset"
        size="sm"
        onClose={ui.close}
      >
        {ui.asset && <DeleteModal asset={ui.asset} onClose={ui.close} />}
      </Modal>
    </div>
  );
}

// List view

function ListView({
  assets,
  onView,
  onShare,
  onDelete,
  onDownload,
}: ListViewProps) {
  return (
    <div className="divide-border border-border flex flex-col divide-y overflow-hidden rounded-lg border">
      {assets.map((asset) => (
        <div
          key={asset.id}
          onClick={() => onView(asset)}
          className="group bg-card hover:bg-accent/30 flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors"
        >
          <StatusDot status={asset.status} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium">
            {asset.original_filename}
          </span>
          <span className="text-muted-foreground hidden text-[11px] sm:block">
            {formatBytes(asset.size_bytes)}
          </span>
          <span className="text-muted-foreground hidden text-[11px] capitalize md:block">
            {asset.mime_type.split("/")[0]}
          </span>
          <div
            className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            {asset.status === "ready" && (
              <>
                <button
                  onClick={() => onDownload(asset)}
                  className="hover:bg-accent flex h-6 w-6 items-center justify-center rounded"
                >
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </button>
                <button
                  onClick={() => onShare(asset)}
                  className="hover:bg-accent flex h-6 w-6 items-center justify-center rounded"
                >
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={() => onDelete(asset)}
              className="text-destructive/60 hover:bg-destructive/10 hover:text-destructive flex h-6 w-6 items-center justify-center rounded"
            >
              <svg
                width="11"
                height="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, string> = {
    ready: "bg-primary",
    processing: "bg-amber-400 animate-pulse",
    queued: "bg-blue-400 animate-pulse",
    failed: "bg-destructive",
  };
  return (
    <div className={cn("h-1.5 w-1.5 shrink-0 rounded-full", map[status])} />
  );
}

function EmptyState({
  searching,
  onUpload,
}: {
  searching: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="border-border bg-muted flex h-12 w-12 items-center justify-center rounded-full border">
        {searching ? (
          <Search size={18} className="text-muted-foreground" />
        ) : (
          <FolderOpen size={18} className="text-muted-foreground" />
        )}
      </div>
      {searching ? (
        <>
          <p className="text-sm font-medium">
            {UI_STRINGS.DASHBOARD.NO_RESULT}
          </p>
          <p className="text-muted-foreground text-xs">
            {UI_STRINGS.DASHBOARD.SEARCH_TERM}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">
            {UI_STRINGS.DASHBOARD.NO_ASSETS}
          </p>
          <p className="text-muted-foreground text-xs">
            {UI_STRINGS.DASHBOARD.FIRST_FILE}
          </p>
          <Button size="sm" className="mt-1" onClick={onUpload}>
            <Upload size={11} /> {UI_STRINGS.DASHBOARD.UPLOAD_FILE}
          </Button>
        </>
      )}
    </div>
  );
}
