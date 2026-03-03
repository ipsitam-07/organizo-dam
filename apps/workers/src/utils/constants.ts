export const WORKER_QUEUES = {
  ASSEMBLY: "asset-processing",
  METADATA: "metadata-processing",
  THUMBNAIL: "thumbnail-processing",
  TRANSCODE: "transcode-processing",
} as const;

export const WORKER_ROUTING_KEYS = {
  ASSET_UPLOADED: "asset.uploaded",
  PROCESS_METADATA: "asset.process.metadata",
  PROCESS_THUMBNAIL: "asset.process.thumbnail",
  PROCESS_TRANSCODE: "asset.process.transcode",
} as const;
