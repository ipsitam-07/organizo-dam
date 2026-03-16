import { Asset, ProcessingJob } from "@repo/database";
import { EXCHANGES, UploadCompletePayload } from "@repo/rabbitmq";
import { logger } from "@repo/logger";
import { WORKER_QUEUES, WORKER_ROUTING_KEYS } from "../utils/constants";
import { BaseWorker } from "./base.worker";
import {
  copyToAssets,
  deleteObject,
  buckets,
} from "../services/storage.service";
import {
  isTranscodableVideo,
  isImageType,
  isDocumentType,
} from "../utils/temp";

const JOB_META: Record<
  string,
  { queue: string; routingKey: string; exchange: string }
> = {
  metadata: {
    exchange: EXCHANGES.UPLOADS,
    routingKey: WORKER_ROUTING_KEYS.PROCESS_METADATA,
    queue: WORKER_QUEUES.METADATA,
  },
  thumbnail: {
    exchange: EXCHANGES.UPLOADS,
    routingKey: WORKER_ROUTING_KEYS.PROCESS_THUMBNAIL,
    queue: WORKER_QUEUES.THUMBNAIL,
  },
  transcode: {
    exchange: EXCHANGES.UPLOADS,
    routingKey: WORKER_ROUTING_KEYS.PROCESS_TRANSCODE,
    queue: WORKER_QUEUES.TRANSCODE,
  },
  image: {
    exchange: EXCHANGES.UPLOADS,
    routingKey: WORKER_ROUTING_KEYS.PROCESS_IMAGE,
    queue: WORKER_QUEUES.IMAGE,
  },
  document: {
    exchange: EXCHANGES.UPLOADS,
    routingKey: WORKER_ROUTING_KEYS.PROCESS_DOCUMENT,
    queue: WORKER_QUEUES.DOCUMENT,
  },
};

export class AssemblyWorker extends BaseWorker {
  constructor() {
    super(
      "AssemblyWorker",
      "assembly",
      WORKER_QUEUES.ASSEMBLY,
      WORKER_ROUTING_KEYS.ASSET_UPLOADED
    );
  }

  async process(
    payload: UploadCompletePayload,
    _job: ProcessingJob
  ): Promise<void> {
    const { assetId, storageKey, uploadSessionId, userId } = payload;

    logger.info(
      `[AssemblyWorker] Assembling asset="${assetId}" from storageKey="${storageKey}"`
    );

    await copyToAssets(storageKey, assetId);
    await Asset.update({ storage_key: assetId }, { where: { id: assetId } });

    try {
      await deleteObject(buckets.chunks, storageKey);
    } catch (err: any) {
      logger.warn(`[AssemblyWorker] Chunk delete failed: ${err.message}`);
    }

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found after copy`);

    const mime = asset.mime_type;
    const followOnPayload: UploadCompletePayload = {
      assetId,
      uploadSessionId,
      userId,
      storageKey: assetId,
    };

    let jobTypes: string[];
    if (isTranscodableVideo(mime)) {
      jobTypes = ["metadata", "thumbnail", "transcode"];
      logger.info(`[AssemblyWorker] Video fan-out: ${jobTypes.join(" + ")}`);
    } else if (mime.startsWith("audio/")) {
      jobTypes = ["metadata"];
      logger.info(`[AssemblyWorker] Audio fan-out: metadata`);
    } else if (isImageType(mime)) {
      jobTypes = ["image"];
      logger.info(`[AssemblyWorker] Image fan-out: image`);
    } else if (isDocumentType(mime)) {
      jobTypes = ["document"];
      logger.info(`[AssemblyWorker] Document fan-out: document`);
    } else {
      jobTypes = ["metadata"];
      logger.info(`[AssemblyWorker] Unknown mime="${mime}" fan-out: metadata`);
    }

    const messageId = crypto.randomUUID();
    const preCreatedJobs = await Promise.all(
      jobTypes.map((jobType) => {
        const meta = JOB_META[jobType];
        return ProcessingJob.create({
          asset_id: assetId,
          amqp_message_id: `${messageId}-${jobType}`,
          amqp_exchange: meta.exchange,
          amqp_routing_key: meta.routingKey,
          amqp_queue: meta.queue,
          amqp_delivery_tag: null,
          job_type: jobType,
          status: "queued",
          attempts: 1,
          max_attempts: 3,
        });
      })
    );

    logger.info(
      `[AssemblyWorker] Pre-created ${preCreatedJobs.length} job row(s) for asset="${assetId}"`
    );

    await Promise.all(
      jobTypes.map((jobType) => {
        const meta = JOB_META[jobType];
        return this.rabbit.publish(
          meta.exchange,
          meta.routingKey,
          followOnPayload
        );
      })
    );

    logger.info(`[AssemblyWorker] Fan-out complete for asset="${assetId}"`);
  }

  protected async publishResult(): Promise<void> {
    // intentional no-op — assembly does not emit job-completed events
  }
}
