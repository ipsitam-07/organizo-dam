import type { ConsumeMessage } from "amqplib";
import { Asset, ProcessingJob } from "@repo/database";
import { logger } from "@repo/logger";
import type { JobCompletedPayload } from "@repo/rabbitmq";
import { Op } from "sequelize";
import { totalJobsCompleted, totalJobsSubmitted } from "../metric";

const REAL_JOB_TYPES = [
  "metadata",
  "thumbnail",
  "transcode",
  "image",
  "document",
];

export async function handleJobEvent(
  payload: JobCompletedPayload,
  _msg: ConsumeMessage
): Promise<void> {
  const { assetId, jobId, status, errorMessage, renditionId } = payload;

  logger.info(
    `[JobEvent] Received status="${status}" for job="${jobId}" asset="${assetId}"` +
      (renditionId ? ` rendition="${renditionId}"` : "")
  );

  totalJobsSubmitted.inc();

  await ProcessingJob.update(
    {
      status,
      error_message: errorMessage ?? null,
      completed_at: new Date(),
      ...(renditionId ? { rendition_id: renditionId } : {}),
    },
    { where: { id: jobId } }
  );

  if (status === "failed") {
    totalJobsCompleted.inc({ status: "failed" });
    await Asset.update({ status: "failed" }, { where: { id: assetId } });
    logger.warn(
      `[JobEvent] Asset "${assetId}" marked FAILED due to job "${jobId}"`
    );
    return;
  }

  totalJobsCompleted.inc({ status: "completed" });

  const pendingRealJobs = await ProcessingJob.count({
    where: {
      asset_id: assetId,
      job_type: { [Op.in]: REAL_JOB_TYPES },
      status: { [Op.notIn]: ["completed", "failed", "dead_lettered"] },
    },
  });

  const totalRealJobs = await ProcessingJob.count({
    where: {
      asset_id: assetId,
      job_type: { [Op.in]: REAL_JOB_TYPES },
    },
  });

  if (totalRealJobs > 0 && pendingRealJobs === 0) {
    await Asset.update({ status: "ready" }, { where: { id: assetId } });
    logger.info(
      `[JobEvent] Asset "${assetId}" marked READY — all jobs complete`
    );
  } else {
    logger.info(
      `[JobEvent] Asset "${assetId}" — ${pendingRealJobs} pending / ${totalRealJobs} total real jobs`
    );
  }
}
