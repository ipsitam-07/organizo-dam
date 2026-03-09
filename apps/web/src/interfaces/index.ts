import type { ROLE } from "../constants";
import type { ModalKind, FileStatus } from "@/types";

export interface ApiError {
  message: string;
  status: number;
}

//AUTH
export interface User {
  id: string;
  email: string;
  role: typeof ROLE.USER | typeof ROLE.ADMIN;
  is_active: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (r: AuthResponse) => void;
  logout: () => Promise<void>;
}

export interface ExtendedAuthContextValue extends AuthContextValue {
  isHydrating: boolean;
  setHydrated: () => void;
}

export type AssetStatus = "queued" | "processing" | "ready" | "failed";
export interface Tag {
  id: string;
  name: string;
  source: "user" | "auto";
}

export interface AssetRendition {
  id: string;
  label: string;
  rendition_type: string;
  storage_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  status: "processing" | "ready" | "failed";
}

export interface AssetRenditionWithUrl {
  id: string;
  label: string;
  rendition_type: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  status: "processing" | "ready" | "failed";
  url: string;
}

export interface Asset {
  id: string;
  user_id: string;
  upload_session_id: string | null;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  size_bytes: number;
  status: AssetStatus;
  download_count: number;
  created_at: string;
  updated_at: string;
  Tags?: Tag[];
  AssetRenditions?: AssetRendition[];
}

export interface UIState {
  modal: ModalKind | null;
  asset: Asset | null;
}

export interface AssetListResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface AssetListParams {
  page?: number;
  limit?: number;
  status?: AssetStatus;
  mime_type?: string;
  tag?: string;
}
export interface ShareLink {
  id: string;
  asset_id: string;
  token: string;
  expires_at?: string;
  max_downloads?: number;
  download_count: number;
  created_at: string;
}
export interface CreateShareLinkPayload {
  password?: string;
  max_downloads?: number;
  expires_in_hours?: number;
}

export interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  percent: number;
  error?: string;
}

export interface Props {
  asset: Asset;
  onView: (a: Asset) => void;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onDownload: (a: Asset) => void;
}

export interface DeleteProps {
  asset: Asset;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onClose: () => void;
}

export interface ListViewProps {
  assets: Asset[];
  onView: (a: Asset) => void;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onDownload: (a: Asset) => void;
}

export interface DetailProps {
  asset: Asset;
  onShare: (a: Asset) => void;
  onDelete: (a: Asset) => void;
  onClose: () => void;
}

export interface DownloadPickerProps {
  asset: Asset;
}

export interface QualityPickerProps {
  options: AssetRenditionWithUrl[];
  selected: AssetRenditionWithUrl;
  onSelect: (r: AssetRenditionWithUrl) => void;
}

export interface PreviewProps {
  asset: Asset;
}
