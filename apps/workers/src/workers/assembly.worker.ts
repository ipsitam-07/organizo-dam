import { Asset, ProcessingJob } from "@repo/database";
import { EXCHANGES } from "@repo/rabbitmq/src/utils/constants";
import { UploadCompletePayload } from "@repo/rabbitmq/src/utils/interfaces";
import { logger } from "@repo/logger";
import { WORKER_QUEUES, WORKER_ROUTING_KEYS } from "../utils/constants";
import { BaseWorker } from "./base.worker";
import {
  copyToAssets,
  deleteObject,
  buckets,
} from "../services/storage.service";
import { isTranscodableVideo, isImageType } from "../utils/temp";

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
    job: ProcessingJob
  ): Promise<void> {
    const { assetId, storageKey, uploadSessionId, userId } = payload;

    logger.info(
      `[AssemblyWorker] Assembling asset="${assetId}" from storageKey="${storageKey}"`
    );
    await this.updateProgress(job, 10);

    await copyToAssets(storageKey, assetId);
    await this.updateProgress(job, 60);

    await Asset.update({ storage_key: assetId }, { where: { id: assetId } });
    await this.updateProgress(job, 80);
    try {
      await deleteObject(buckets.chunks, storageKey);
    } catch (err: any) {
      logger.warn(`[AssemblyWorker] Chunk delete failed: ${err.message}`);
    }

    await this.updateProgress(job, 90);

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found after copy`);

    const mime = asset.mime_type;
    const followOnPayload: UploadCompletePayload = {
      assetId,
      uploadSessionId,
      userId,
      storageKey: assetId,
    };

    const publishTasks: Promise<void>[] = [];

    if (isTranscodableVideo(mime)) {
      publishTasks.push(
        this.rabbit.publish(
          EXCHANGES.UPLOADS,
          WORKER_ROUTING_KEYS.PROCESS_METADATA,
          followOnPayload
        ),
        this.rabbit.publish(
          EXCHANGES.UPLOADS,
          WORKER_ROUTING_KEYS.PROCESS_THUMBNAIL,
          followOnPayload
        ),
        this.rabbit.publish(
          EXCHANGES.UPLOADS,
          WORKER_ROUTING_KEYS.PROCESS_TRANSCODE,
          followOnPayload
        )
      );
      logger.info(
        `[AssemblyWorker] Video fan-out: metadata + thumbnail + transcode`
      );
    } else if (mime.startsWith("audio/")) {
      publishTasks.push(
        this.rabbit.publish(
          EXCHANGES.UPLOADS,
          WORKER_ROUTING_KEYS.PROCESS_METADATA,
          followOnPayload
        )
      );
      logger.info(`[AssemblyWorker] Audio fan-out: metadata`);
    } else if (isImageType(mime)) {
      publishTasks.push(
        this.rabbit.publish(
          EXCHANGES.UPLOADS,
          WORKER_ROUTING_KEYS.PROCESS_IMAGE,
          followOnPayload
        )
      );
      logger.info(`[AssemblyWorker] Image fan-out: image`);
    } else {
      // Unknown type
      publishTasks.push(
        this.rabbit.publish(
          EXCHANGES.UPLOADS,
          WORKER_ROUTING_KEYS.PROCESS_METADATA,
          followOnPayload
        )
      );
      logger.info(
        `[AssemblyWorker] Unknown mime="${mime}" fan-out: metadata (stub)`
      );
    }

    await Promise.all(publishTasks);
    logger.info(`[AssemblyWorker] Fan-out complete for asset="${assetId}"`);
  }
}
