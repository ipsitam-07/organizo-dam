export const EXCHANGES = {
  UPLOADS: "dam.uploads", // direct
  EVENTS: "dam.events", // fanout
} as const;

export const ROUTING_KEYS = {
  ASSET_UPLOADED: "asset.uploaded", // Assembly Worker

  //Asset service
  JOB_COMPLETED: "job.completed",
  JOB_DEAD_LETTERED: "job.dead_lettered",

  PROCESS_METADATA: "asset.process.metadata", // Metadata Worker
  PROCESS_THUMBNAIL: "asset.process.thumbnail", // Thumbnail Worker
  PROCESS_TRANSCODE: "asset.process.transcode", // Transcode Worker
  PROCESS_IMAGE: "asset.process.image", //Image Worker
  PROCESS_DOCUMENT: "asset.process.document", //Document worker
} as const;

export const QUEUES = {
  //4 worker queues
  ASSET_PROCESSING: "asset-processing", // Assembly Worker
  METADATA_PROCESSING: "metadata-processing", // Metadata Worker
  THUMBNAIL_PROCESSING: "thumbnail-processing", // Thumbnail Worker
  TRANSCODE_PROCESSING: "transcode-processing", //Transcode Worker

  IMAGE_PROCESSING: "image-processing", // Image Worker
  DOCUMENT_PROCESSING: "document-processing", // Document Worker

  //Asset service consumer
  ASSET_SERVICE_EVENTS: "asset-service-events",
} as const;
