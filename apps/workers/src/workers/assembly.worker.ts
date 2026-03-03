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
    const followOnPayload: UploadCompletePayload = {
      assetId,
      uploadSessionId,
      userId,
      storageKey: assetId,
    };

    await Promise.all([
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
      ),
    ]);

    logger.info(
      `[AssemblyWorker] Fan-out sent- metadata + thumbnail + transcode for asset="${assetId}"`
    );
  }
}
