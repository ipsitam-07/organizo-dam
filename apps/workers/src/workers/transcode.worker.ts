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
import { transcodeVideo } from "../services/ffmpeg.service";
import { TranscodeProfile } from "../interfaces/interfaces";
import { TRANSCODE_PROFILES } from "../utils/constants";
import {
  writeTempFile,
  cleanTempFile,
  readFile,
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
  ): Promise<void> {
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

    // Get source height
    const meta = await AssetMetadata.findOne({ where: { asset_id: assetId } });
    const sourceHeight = meta?.height ?? 9999;

    const profilesToRun = TRANSCODE_PROFILES.filter(
      (p) => p.height <= sourceHeight
    );

    if (profilesToRun.length === 0) {
      logger.info(
        `[TranscodeWorker] Source ${sourceHeight}px. all profiles skipped (no upscaling)`
      );
      return;
    }

    logger.info(
      `[TranscodeWorker] Running ${profilesToRun.map((p) => p.label).join(", ")} for asset="${assetId}"`
    );

    // Download source video
    const ext = mimeToExtension(asset.mime_type);
    const buffer = await getObjectBuffer(buckets.assets, asset.storage_key);
    const tempInput = await writeTempFile(buffer, ext);

    await this.updateProgress(job, 10);

    const tempOutputPaths: string[] = [];

    try {
      for (let i = 0; i < profilesToRun.length; i++) {
        const profile = profilesToRun[i];
        const progStart = 10 + Math.round((i / profilesToRun.length) * 85);
        const progEnd = 10 + Math.round(((i + 1) / profilesToRun.length) * 85);

        const tempOut = await this.transcodeProfile(
          assetId,
          tempInput,
          profile,
          job,
          progStart,
          progEnd
        );
        if (tempOut) tempOutputPaths.push(tempOut);
      }

      logger.info(`[TranscodeWorker] All profiles done for asset="${assetId}"`);
    } finally {
      await cleanTempFile(tempInput);
      for (const p of tempOutputPaths) await cleanTempFile(p);
    }
  }

  // Run a transcode profile

  private async transcodeProfile(
    assetId: string,
    tempInput: string,
    profile: TranscodeProfile,
    job: ProcessingJob,
    progStart: number,
    progEnd: number
  ): Promise<string | null> {
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

      const outBuffer = await readFile(tempOutput);
      const outSize = await getFileSize(tempOutput);

      await putObject(buckets.renditions, storageKey, outBuffer, "video/mp4");

      await AssetRendition.update(
        {
          status: "ready",
          size_bytes: outSize,
          height: profile.height,
        },
        { where: { id: renditionId } }
      );

      logger.info(
        `[TranscodeWorker] ${profile.label} done — ${(outSize / 1024 / 1024).toFixed(1)}MB for asset="${assetId}"`
      );
      return tempOutput;
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
