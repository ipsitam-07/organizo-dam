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
