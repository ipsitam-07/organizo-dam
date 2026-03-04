import { Asset, AssetMetadata, ProcessingJob } from "@repo/database";
import { UploadCompletePayload } from "@repo/rabbitmq/src/utils/interfaces";
import { logger } from "@repo/logger";
import { BaseWorker } from "./base.worker";
import { WORKER_QUEUES, WORKER_ROUTING_KEYS } from "../utils/constants";
import { getObjectBuffer, buckets } from "../services/storage.service";
import { probeFile } from "../services/ffmpeg.service";
import {
  writeTempFile,
  cleanTempFile,
  mimeToExtension,
  isProbeableMedia,
} from "../utils/temp";

/**
 * Metadata Worker
 * Consumes:  dam.uploads (direct)
 * Publishes: dam.events  (fanout)
 */
export class MetadataWorker extends BaseWorker {
  constructor() {
    super(
      "MetadataWorker",
      "metadata",
      WORKER_QUEUES.METADATA,
      WORKER_ROUTING_KEYS.PROCESS_METADATA
    );
  }

  async process(
    payload: UploadCompletePayload,
    job: ProcessingJob
  ): Promise<void> {
    const { assetId } = payload;

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    await this.updateProgress(job, 10);

    if (!isProbeableMedia(asset.mime_type)) {
      logger.info(
        `[MetadataWorker] Skipping FFprobe for mime="${asset.mime_type}"`
      );
      await AssetMetadata.upsert({
        asset_id: assetId,
        format: asset.mime_type,
        extracted_at: new Date(),
      });
      return;
    }

    const ext = mimeToExtension(asset.mime_type);
    const buffer = await getObjectBuffer(buckets.assets, asset.storage_key);
    await this.updateProgress(job, 30);

    const tempPath = await writeTempFile(buffer, ext);

    try {
      const meta = await probeFile(tempPath);
      await this.updateProgress(job, 80);

      await AssetMetadata.upsert({
        asset_id: assetId,
        width: meta.width ?? null,
        height: meta.height ?? null,
        format: meta.format ?? null,
        duration_secs: meta.duration_secs ?? null,
        bitrate_kbps: meta.bitrate_kbps ?? null,
        video_codec: meta.video_codec ?? null,
        audio_codec: meta.audio_codec ?? null,
        frame_rate: meta.frame_rate ?? null,
        raw_metadata: meta.raw_metadata,
        extracted_at: new Date(),
      });

      logger.info(
        `[MetadataWorker] Done for asset="${assetId}" ` +
          `(${meta.width}x${meta.height}, ${meta.duration_secs?.toFixed(1)}s, codec=${meta.video_codec})`
      );
    } finally {
      await cleanTempFile(tempPath);
    }
  }
}
