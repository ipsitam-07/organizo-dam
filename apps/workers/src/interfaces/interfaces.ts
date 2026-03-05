export interface VideoMetadata {
  width?: number;
  height?: number;
  duration_secs?: number;
  bitrate_kbps?: number;
  video_codec?: string;
  audio_codec?: string;
  frame_rate?: number;
  format?: string;
  raw_metadata: object;
}

export interface TranscodeProfile {
  label: string;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size_bytes: number;
  hasAlpha: boolean;
  raw_metadata: object;
}

export interface ImageRenditionSpec {
  label: string;
  width: number;
  format: "jpeg" | "webp";
  mimeType: string;
  ext: string;
  quality: number;
}

export interface DocumentMetadata {
  page_count: number;
  format: string;
  raw_metadata: object;
}
