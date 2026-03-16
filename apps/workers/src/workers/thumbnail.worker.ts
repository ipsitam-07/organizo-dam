import {
  Asset,
  AssetMetadata,
  AssetRendition,
  ProcessingJob,
} from "@repo/database";
import { UploadCompletePayload } from "@repo/rabbitmq";
import { logger } from "@repo/logger";
import { BaseWorker } from "./base.worker";
import { WORKER_QUEUES, WORKER_ROUTING_KEYS } from "../utils/constants";
import {
  downloadObjectToFile,
  getObjectBuffer,
  putObject,
  buckets,
} from "../services/storage.service";
import { extractThumbnail } from "../services/ffmpeg.service";
import { resizeImage } from "../services/sharp.service";
import {
  allocateTempPath,
  cleanTempFile,
  readFile,
  getFileSize,
  mimeToExtension,
  isTranscodableVideo,
  isImageType,
} from "../utils/temp";

//Thumbnail worker
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
  ): Promise<string | void> {
    const { assetId } = payload;

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    if (isTranscodableVideo(asset.mime_type)) {
      return await this.processVideoThumbnail(assetId, asset, job);
    } else if (isImageType(asset.mime_type)) {
      return await this.processImageThumbnail(assetId, asset, job);
    } else {
      logger.info(
        `[ThumbnailWorker] Skipping — unsupported mime="${asset.mime_type}"`
      );
    }
  }

  //Video

  private async processVideoThumbnail(
    assetId: string,
    asset: any,
    job: ProcessingJob
  ): Promise<string> {
    await this.updateProgress(job, 10);

    const meta = await AssetMetadata.findOne({ where: { asset_id: assetId } });
    const duration = meta?.duration_secs ?? 10;

    // Stream directly from MinIO to disk
    const ext = mimeToExtension(asset.mime_type);
    const tempInput = allocateTempPath(ext);
    await downloadObjectToFile(buckets.assets, asset.storage_key, tempInput);

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

      const [rendition] = await AssetRendition.upsert({
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
      const renditionId = (rendition as AssetRendition).id;

      await job.update({ rendition_id: renditionId });

      logger.info(
        `[ThumbnailWorker] Video thumbnail done — ${(thumbSize / 1024).toFixed(0)}KB for asset="${assetId}"`
      );
      return renditionId;
    } finally {
      await cleanTempFile(tempInput);
      if (tempThumb) await cleanTempFile(tempThumb);
    }
  }

  // Image

  private async processImageThumbnail(
    assetId: string,
    asset: any,
    job: ProcessingJob
  ): Promise<string> {
    await this.updateProgress(job, 20);

    const buffer = await getObjectBuffer(buckets.assets, asset.storage_key);
    const storageKey = `${assetId}/thumbnail.jpg`;

    await this.updateProgress(job, 40);

    const thumbBuffer = await resizeImage(buffer, {
      label: "thumbnail",
      width: 640,
      format: "jpeg",
      mimeType: "image/jpeg",
      ext: "jpg",
      quality: 80,
    });

    await putObject(buckets.renditions, storageKey, thumbBuffer, "image/jpeg");
    await this.updateProgress(job, 85);

    const [rendition] = await AssetRendition.upsert({
      asset_id: assetId,
      rendition_type: "thumbnail",
      label: "thumbnail",
      storage_key: storageKey,
      mime_type: "image/jpeg",
      size_bytes: thumbBuffer.length,
      width: 640,
      height: null,
      status: "ready",
    });
    const renditionId = (rendition as AssetRendition).id;

    await job.update({ rendition_id: renditionId });

    logger.info(
      `[ThumbnailWorker] Image thumbnail done — ${(thumbBuffer.length / 1024).toFixed(0)}KB for asset="${assetId}"`
    );
    return renditionId;
  }
}
