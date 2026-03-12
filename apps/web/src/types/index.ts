import type { Asset } from "./asset.types";

export type ModalKind = "upload" | "detail" | "share" | "delete";

export type UIAction =
  | { type: "UPLOAD" }
  | { type: "DETAIL"; a: Asset }
  | { type: "SHARE"; a: Asset }
  | { type: "DELETE"; a: Asset }
  | { type: "CLOSE" };

export type FileStatus = "queued" | "uploading" | "done" | "error";

export interface ApiError {
  message: string;
  status: number;
}

export interface UIState {
  modal: ModalKind | null;
  asset: Asset | null;
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
