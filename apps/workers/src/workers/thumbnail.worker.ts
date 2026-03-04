import {
  Asset,
  AssetMetadata,
  AssetRendition,
  ProcessingJob,
} from "@repo/database";
import { UploadCompletePayload } from "@repo/rabbitmq/src/utils/interfaces";
import { logger } from "@repo/logger";
import { BaseWorker } from "./base.worker";
import { WORKER_QUEUES, WORKER_ROUTING_KEYS } from "../utils/constants";
import {
  getObjectBuffer,
  putObject,
  buckets,
} from "../services/storage.service";
import { extractThumbnail } from "../services/ffmpeg.service";
import {
  writeTempFile,
  cleanTempFile,
  readFile,
  getFileSize,
  mimeToExtension,
  isTranscodableVideo,
} from "../utils/temp";

export class ThumbnailWorker extends BaseWorker {
  constructor() {
    super(
      "ThumbnailWorker",
      "thumbnail",
      WORKER_QUEUES.THUMBNAIL,
      WORKER_ROUTING_KEYS.PROCESS_THUMBNAIL
    );
  }

  async process(
    payload: UploadCompletePayload,
    job: ProcessingJob
  ): Promise<void> {
    const { assetId } = payload;

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    if (!isTranscodableVideo(asset.mime_type)) {
      logger.info(
        `[ThumbnailWorker] Skipping, not a video (mime="${asset.mime_type}")`
      );
      return;
    }

    await this.updateProgress(job, 10);

    // Thumbnail and Metadata run in parallel
    const meta = await AssetMetadata.findOne({ where: { asset_id: assetId } });
    const duration = meta?.duration_secs ?? 10;

    // Download source video
    const ext = mimeToExtension(asset.mime_type);
    const buffer = await getObjectBuffer(buckets.assets, asset.storage_key);
    const tempInput = await writeTempFile(buffer, ext);

    await this.updateProgress(job, 30);

    let tempThumb: string | null = null;
    try {
      tempThumb = await extractThumbnail(tempInput, duration);
      await this.updateProgress(job, 70);

      const thumbBuffer = await readFile(tempThumb);
      const thumbSize = await getFileSize(tempThumb);
      const storageKey = `${assetId}/thumbnail.jpg`;

      await putObject(
        buckets.renditions,
        storageKey,
        thumbBuffer,
        "image/jpeg"
      );
      await this.updateProgress(job, 90);

      await AssetRendition.upsert({
        asset_id: assetId,
        rendition_type: "thumbnail",
        label: "thumbnail",
        storage_key: storageKey,
        mime_type: "image/jpeg",
        size_bytes: thumbSize,
        width: 640,
        height: null,
        duration_secs: null,
        status: "ready",
      });

      logger.info(
        `[ThumbnailWorker] Done for asset="${assetId}" (${(thumbSize / 1024).toFixed(0)}KB)`
      );
    } finally {
      await cleanTempFile(tempInput);
      if (tempThumb) await cleanTempFile(tempThumb);
    }
  }
}
