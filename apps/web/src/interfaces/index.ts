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
