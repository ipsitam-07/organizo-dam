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
  uploadFileFromDisk,
  buckets,
} from "../services/storage.service";
import { transcodeVideo } from "../services/ffmpeg.service";
import { TranscodeProfile } from "../interfaces/interfaces";
import { TRANSCODE_PROFILES } from "../utils/constants";
import {
  allocateTempPath,
  cleanTempFile,
  getFileSize,
  mimeToExtension,
  isTranscodableVideo,
} from "../utils/temp";

export class TranscodeWorker extends BaseWorker {
  constructor() {
    super(
      "TranscodeWorker",
      "transcode",
      WORKER_QUEUES.TRANSCODE,
      WORKER_ROUTING_KEYS.PROCESS_TRANSCODE
    );
  }

  async process(
    payload: UploadCompletePayload,
    job: ProcessingJob
  ): Promise<string | void> {
    const { assetId } = payload;

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    if (!isTranscodableVideo(asset.mime_type)) {
      logger.info(
        `[TranscodeWorker] Skipping — not a video (mime="${asset.mime_type}")`
      );
      return;
    }

    await this.updateProgress(job, 5);

    const meta = await AssetMetadata.findOne({ where: { asset_id: assetId } });
    const sourceHeight = meta?.height ?? 9999;

    // Only run profiles that fit the source — never upscale.
    // All applicable profiles run sequentially. Sequential is faster than
    // parallel when the CPU is the bottleneck (software libx264) because
    // concurrent processes share cores and each ends up taking ~3× longer.
    const profilesToRun = TRANSCODE_PROFILES.filter(
      (p) => p.height <= sourceHeight
    );

    if (profilesToRun.length === 0) {
      logger.info(
        `[TranscodeWorker] Source ${sourceHeight}px — all profiles skipped`
      );
      return;
    }

    logger.info(
      `[TranscodeWorker] Running [${profilesToRun.map((p) => p.label).join(", ")}] sequentially for asset="${assetId}"`
    );

    // Stream from MinIO to disk — no full-file RAM allocation
    const ext = mimeToExtension(asset.mime_type);
    const tempInput = allocateTempPath(ext);
    await downloadObjectToFile(buckets.assets, asset.storage_key, tempInput);

    await this.updateProgress(job, 10);

    const tempOutputPaths: string[] = [];
    let lastRenditionId: string | undefined;

    try {
      for (let i = 0; i < profilesToRun.length; i++) {
        const profile = profilesToRun[i];
        const progStart = 10 + Math.round((i / profilesToRun.length) * 85);
        const progEnd = 10 + Math.round(((i + 1) / profilesToRun.length) * 85);

        const result = await this.transcodeProfile(
          assetId,
          tempInput,
          profile,
          job,
          progStart,
          progEnd
        );
        if (result) {
          tempOutputPaths.push(result.tempPath);
          lastRenditionId = result.renditionId;
        }
      }

      logger.info(`[TranscodeWorker] All profiles done for asset="${assetId}"`);
    } finally {
      await cleanTempFile(tempInput);
      for (const p of tempOutputPaths) await cleanTempFile(p);
    }

    return lastRenditionId;
  }

  private async transcodeProfile(
    assetId: string,
    tempInput: string,
    profile: TranscodeProfile,
    job: ProcessingJob,
    progStart: number,
    progEnd: number
  ): Promise<{ tempPath: string; renditionId: string } | null> {
    const storageKey = `${assetId}/${profile.label}.mp4`;

    logger.info(
      `[TranscodeWorker] Starting ${profile.label} for asset="${assetId}"`
    );

    const [rendition] = await AssetRendition.upsert({
      asset_id: assetId,
      rendition_type: "video",
      label: profile.label,
      storage_key: storageKey,
      mime_type: "video/mp4",
      status: "processing",
    });
    const renditionId = (rendition as AssetRendition).id;

    let tempOutput: string | null = null;

    try {
      const range = progEnd - progStart;
      const onProgress = (pct: number) => {
        job
          .update({ progress: progStart + Math.round((pct / 100) * range) })
          .catch(() => {});
      };

      tempOutput = await transcodeVideo(tempInput, profile, onProgress);

      const outSize = await getFileSize(tempOutput);

      // Stream output file to MinIO — no second full-file RAM allocation
      await uploadFileFromDisk(
        buckets.renditions,
        storageKey,
        tempOutput,
        "video/mp4"
      );

      await AssetRendition.update(
        { status: "ready", size_bytes: outSize, height: profile.height },
        { where: { id: renditionId } }
      );

      await job.update({ rendition_id: renditionId });

      logger.info(
        `[TranscodeWorker] ${profile.label} done — ${(outSize / 1024 / 1024).toFixed(1)}MB for asset="${assetId}"`
      );
      return { tempPath: tempOutput, renditionId };
    } catch (err: any) {
      await AssetRendition.update(
        { status: "failed" },
        { where: { id: renditionId } }
      );
      logger.error(
        `[TranscodeWorker] ${profile.label} failed for asset="${assetId}"`,
        { error: err.message }
      );
      throw err;
    }
  }
}
