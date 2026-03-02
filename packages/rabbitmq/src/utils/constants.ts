export const EXCHANGES = {
  UPLOADS: "dam.uploads",
  EVENTS: "dam.events",
} as const;

export const ROUTING_KEYS = {
  ASSET_UPLOADED: "asset.uploaded",
  JOB_COMPLETED: "job.completed",
  JOB_DEAD_LETTERED: "job.dead_lettered",
} as const;

export const QUEUES = {
  ASSET_PROCESSING: "asset-processing",
  ASSET_SERVICE_EVENTS: "asset-service-events",
} as const;
