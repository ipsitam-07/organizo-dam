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
  getObjectBuffer,
  putObject,
  buckets,
} from "../services/storage.service";
import { renderPdfPreview } from "../services/pdf.service";
import { isDocumentType } from "../utils/temp";

//Document worker

export class DocumentWorker extends BaseWorker {
  constructor() {
    super(
      "DocumentWorker",
      "document",
      WORKER_QUEUES.DOCUMENT,
      WORKER_ROUTING_KEYS.PROCESS_DOCUMENT
    );
  }

  async process(
    payload: UploadCompletePayload,
    job: ProcessingJob
  ): Promise<void> {
    const { assetId } = payload;

    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    if (!isDocumentType(asset.mime_type)) {
      logger.info(
        `[DocumentWorker] Skipping — not a PDF (mime="${asset.mime_type}")`
      );
      return;
    }

    await this.updateProgress(job, 10);

    const buffer = await getObjectBuffer(buckets.assets, asset.storage_key);
    await this.updateProgress(job, 25);

    const storageKey = `${assetId}/preview.jpg`;
    const [rendition] = await AssetRendition.upsert({
      asset_id: assetId,
      rendition_type: "document_preview",
      label: "preview",
      storage_key: storageKey,
      mime_type: "image/jpeg",
      status: "processing",
    });
    const renditionId = (rendition as AssetRendition).id;
    await job.update({ rendition_id: renditionId });

    try {
      const { jpeg, pageCount } = await renderPdfPreview(buffer);
      await this.updateProgress(job, 75);

      await AssetMetadata.upsert({
        asset_id: assetId,
        format: "pdf",
        page_count: pageCount,
        raw_metadata: { page_count: pageCount },
        extracted_at: new Date(),
      });

      await putObject(buckets.renditions, storageKey, jpeg, "image/jpeg");
      await this.updateProgress(job, 90);

      await AssetRendition.update(
        { status: "ready", size_bytes: jpeg.length },
        { where: { id: renditionId } }
      );

      await this.publishResult(
        assetId,
        job.id,
        "completed",
        undefined,
        renditionId
      );

      logger.info(`[DocumentWorker] Done — ${pageCount} page`);
    } catch (err: any) {
      logger.warn(
        `[DocumentWorker] Preview failed for asset="${assetId}". Error: ${err.message}. `
      );

      await AssetMetadata.upsert({
        asset_id: assetId,
        format: "pdf",
        extracted_at: new Date(),
      });

      await AssetRendition.update(
        { status: "failed" },
        { where: { id: renditionId } }
      );

      await this.publishResult(assetId, job.id, "completed");
    }
  }
}
