import {
  Asset,
  AssetMetadata,
  AssetRendition,
  ProcessingJob,
} from "@repo/database";
import { UploadCompletePayload } from "@repo/rabbitmq/src/utils/interfaces";
import { logger } from "@repo/logger";
import { BaseWorker } from "./base.worker";
import {
  WORKER_QUEUES,
  WORKER_ROUTING_KEYS,
  IMAGE_RENDITION_SPECS,
} from "../utils/constants";
import {
  getObjectBuffer,
  putObject,
  buckets,
} from "../services/storage.service";
import { probeImage, resizeImage } from "../services/sharp.service";
import { isImageType } from "../utils/temp";

/**
 * Image Worker
 * Consumes: dam.uploads (direct)
 * Publishes: dam.events (fanout)
 **/
export class ImageWorker extends BaseWorker {
  constructor() {
    super(
      "ImageWorker",
      "image",
      WORKER_QUEUES.IMAGE,
      WORKER_ROUTING_KEYS.PROCESS_IMAGE
    );
  }

  async process(
    payload: UploadCompletePayload,
    job: ProcessingJob
  ): Promise<void> {
    const { assetId } = payload;

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    if (!isImageType(asset.mime_type)) {
      logger.info(
        `[ImageWorker] Skipping — not a supported image (mime="${asset.mime_type}")`
      );
      return;
    }

    await this.updateProgress(job, 5);

    const buffer = await getObjectBuffer(buckets.assets, asset.storage_key);
    await this.updateProgress(job, 20);

    const meta = await probeImage(buffer);

    await AssetMetadata.upsert({
      asset_id: assetId,
      width: meta.width,
      height: meta.height,
      format: meta.format,
      page_count: 1,
      raw_metadata: meta.raw_metadata,
      extracted_at: new Date(),
    });

    logger.info(
      `[ImageWorker] Metadata: ${meta.width}x${meta.height} ${meta.format} for asset="${assetId}"`
    );
    await this.updateProgress(job, 35);

    const specsToRun = IMAGE_RENDITION_SPECS.filter(
      (spec) => spec.width < meta.width
    );

    if (specsToRun.length === 0) {
      logger.info(
        `[ImageWorker] Source ${meta.width}px — all rendition sizes skipped (image too small)`
      );
      return;
    }

    const progPerSpec = Math.floor(60 / specsToRun.length);

    for (let i = 0; i < specsToRun.length; i++) {
      const spec = specsToRun[i];
      const storageKey = `${assetId}/${spec.label}.${spec.ext}`;

      logger.info(
        `[ImageWorker] Generating ${spec.label} for asset="${assetId}"`
      );

      const [rendition] = await AssetRendition.upsert({
        asset_id: assetId,
        rendition_type: "image",
        label: spec.label,
        storage_key: storageKey,
        mime_type: spec.mimeType,
        status: "processing",
      });
      const renditionId = (rendition as AssetRendition).id;

      await job.update({ rendition_id: renditionId });

      try {
        const resized = await resizeImage(buffer, spec);

        await putObject(buckets.renditions, storageKey, resized, spec.mimeType);

        const { default: sharp } = await import("sharp");
        const outMeta = await sharp(resized).metadata();

        await AssetRendition.update(
          {
            status: "ready",
            size_bytes: resized.length,
            width: outMeta.width ?? spec.width,
            height: outMeta.height ?? null,
          },
          { where: { id: renditionId } }
        );

        await this.publishResult(
          assetId,
          job.id,
          "completed",
          undefined,
          renditionId
        );

        logger.info(
          `[ImageWorker] ${spec.label} done — ${(resized.length / 1024).toFixed(0)}KB for asset="${assetId}"`
        );
      } catch (err: any) {
        await AssetRendition.update(
          { status: "failed" },
          { where: { id: renditionId } }
        );
        logger.error(
          `[ImageWorker] ${spec.label} failed for asset="${assetId}"`,
          { error: err.message }
        );
      }
      await this.updateProgress(job, 35 + (i + 1) * progPerSpec);
    }

    logger.info(`[ImageWorker] All renditions done for asset="${assetId}"`);
  }
}
