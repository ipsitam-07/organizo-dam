import { TranscodeProfile } from "../interfaces/interfaces";
import { ImageRenditionSpec } from "../interfaces/interfaces";

export const WORKER_QUEUES = {
  ASSEMBLY: "asset-processing",
  METADATA: "metadata-processing",
  THUMBNAIL: "thumbnail-processing",
  TRANSCODE: "transcode-processing",
  IMAGE: "image-processing",
  DOCUMENT: "document-processing",
} as const;

export const WORKER_ROUTING_KEYS = {
  ASSET_UPLOADED: "asset.uploaded",
  PROCESS_METADATA: "asset.process.metadata",
  PROCESS_THUMBNAIL: "asset.process.thumbnail",
  PROCESS_TRANSCODE: "asset.process.transcode",
  PROCESS_IMAGE: "asset.process.image",
  PROCESS_DOCUMENT: "asset.process.document",
} as const;

export const TRANSCODE_PROFILES: TranscodeProfile[] = [
  { label: "360p", height: 360, videoBitrate: "600k", audioBitrate: "96k" },
  { label: "720p", height: 720, videoBitrate: "2500k", audioBitrate: "128k" },
  { label: "1080p", height: 1080, videoBitrate: "5000k", audioBitrate: "192k" },
];

export const IMAGE_RENDITION_SPECS: ImageRenditionSpec[] = [
  {
    label: "thumbnail",
    width: 640,
    format: "jpeg",
    mimeType: "image/jpeg",
    ext: "jpg",
    quality: 80,
  },
  {
    label: "medium",
    width: 1280,
    format: "webp",
    mimeType: "image/webp",
    ext: "webp",
    quality: 82,
  },
  {
    label: "large",
    width: 2560,
    format: "webp",
    mimeType: "image/webp",
    ext: "webp",
    quality: 85,
  },
];
