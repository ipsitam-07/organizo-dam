import type { ConsumeMessage } from "amqplib";
import { Asset, ProcessingJob } from "@repo/database";
import { logger } from "@repo/logger";
import type { JobCompletedPayload } from "@repo/rabbitmq/src/utils/interfaces";
import { Op } from "sequelize";

export async function handleJobEvent(
  payload: JobCompletedPayload,
  _msg: ConsumeMessage
): Promise<void> {
  const { assetId, jobId, status, errorMessage } = payload;

  logger.info(
    `[JobEvent] Received status="${status}" for job="${jobId}" asset="${assetId}"`
  );

  await ProcessingJob.update(
    {
      status,
      error_message: errorMessage ?? null,
      completed_at: new Date(),
    },
    { where: { id: jobId } }
  );

  if (status === "failed") {
    await Asset.update({ status: "failed" }, { where: { id: assetId } });
    logger.warn(
      `[JobEvent] Asset "${assetId}" marked FAILED due to job "${jobId}"`
    );
    return;
  }

  const pendingCount = await ProcessingJob.count({
    where: {
      asset_id: assetId,
      status: { [Op.notIn]: ["completed", "dead_lettered"] },
    },
  });

  if (pendingCount === 0) {
    await Asset.update({ status: "ready" }, { where: { id: assetId } });
    logger.info(
      `[JobEvent] Asset "${assetId}" marked READY — all jobs complete`
    );
  } else {
    logger.info(
      `[JobEvent] Asset "${assetId}" still has ${pendingCount} pending job(s)`
    );
  }
}
