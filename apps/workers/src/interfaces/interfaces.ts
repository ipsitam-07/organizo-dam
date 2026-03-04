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
