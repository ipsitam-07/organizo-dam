import { ConsumeMessage } from "amqplib";
import {
  RabbitMQClient,
  EXCHANGES,
  ROUTING_KEYS,
  JobCompletedPayload,
  UploadCompletePayload,
} from "@repo/rabbitmq";
import { Asset, ProcessingJob, initDb } from "@repo/database";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import {
  jobProcessedTotal,
  jobProcessingTimeSeconds,
  jobErrorsTotal,
} from "../metric";

// BaseWorker

export abstract class BaseWorker {
  protected rabbit: RabbitMQClient;
  protected readonly workerName: string;
  protected readonly jobType: string;
  protected readonly queueName: string;
  protected readonly routingKey: string;

  constructor(
    workerName: string,
    jobType: string,
    queueName: string,
    routingKey: string
  ) {
    this.workerName = workerName;
    this.jobType = jobType;
    this.queueName = queueName;
    this.routingKey = routingKey;
    this.rabbit = new RabbitMQClient(workerName);
  }

  abstract process(
    payload: UploadCompletePayload,
    job: ProcessingJob
  ): Promise<void>;

  // Startup

  async start(): Promise<void> {
    logger.info(`[${this.workerName}] Starting...`);

    await initDb({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database as string,
      user: config.db.user as string,
      password: config.db.password,
      logging: false,
    });

    await this.rabbit.connect();

    const consumeCh = this.rabbit.getConsumeChannel()!;
    const publishCh = this.rabbit.getPublishChannel()!;

    await consumeCh.assertExchange(EXCHANGES.UPLOADS, "direct", {
      durable: true,
    });
    await publishCh.assertExchange(EXCHANGES.EVENTS, "fanout", {
      durable: true,
    });
    await consumeCh.assertExchange("dam.dead-letter", "direct", {
      durable: true,
    });

    await consumeCh.assertQueue(this.queueName, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "dam.dead-letter",
        "x-dead-letter-routing-key": ROUTING_KEYS.JOB_DEAD_LETTERED,
        "x-message-ttl": 86400000,
      },
    });

    await consumeCh.bindQueue(
      this.queueName,
      EXCHANGES.UPLOADS,
      this.routingKey
    );
    await this.rabbit.consume(this.queueName, this.handleMessage.bind(this));

    logger.info(
      `[${this.workerName}] Ready — queue="${this.queueName}", key="${this.routingKey}"`
    );
  }

  // Message handler

  private async handleMessage(
    payload: UploadCompletePayload,
    msg: ConsumeMessage
  ): Promise<void> {
    const { assetId } = payload;
    logger.info(`[${this.workerName}] Job received for asset="${assetId}"`);

    const xDeathCount = (msg.properties.headers?.["x-death"] as any[])?.[0]
      ?.count;
    const attempts = typeof xDeathCount === "number" ? xDeathCount + 1 : 1;

    const job = await ProcessingJob.create({
      asset_id: assetId,
      amqp_message_id: msg.properties.messageId ?? crypto.randomUUID(),
      amqp_exchange: EXCHANGES.UPLOADS,
      amqp_routing_key: this.routingKey,
      amqp_queue: this.queueName,
      amqp_delivery_tag: msg.fields.deliveryTag,
      job_type: this.jobType,
      status: "queued",
      attempts,
      max_attempts: 3,
    });

    await job.update({ status: "active", started_at: new Date() });

    await Asset.update(
      { status: "processing" },
      { where: { id: assetId, status: "queued" } }
    );

    const stopTimer = jobProcessingTimeSeconds.startTimer({
      worker_type: this.jobType,
    });
    try {
      await this.process(payload, job);

      stopTimer();
      jobProcessedTotal.inc({
        worker_type: this.jobType,
      });

      await job.update({
        status: "completed",
        progress: 100,
        completed_at: new Date(),
      });
      await this.publishResult(assetId, job.id, "completed");
      logger.info(`[${this.workerName}] Done for asset="${assetId}"`);
    } catch (err: any) {
      stopTimer();
      jobErrorsTotal.inc({ worker_type: this.jobType });

      logger.error(`[${this.workerName}] Failed for asset="${assetId}"`, {
        error: err.message,
      });
      await job.update({
        status: "failed",
        error_message: err.message,
        completed_at: new Date(),
      });
      await this.publishResult(assetId, job.id, "failed", err.message);
    }
  }

  protected async publishResult(
    assetId: string,
    jobId: string,
    status: "completed" | "failed",
    errorMessage?: string,
    renditionId?: string
  ): Promise<void> {
    const payload: JobCompletedPayload = {
      assetId,
      jobId,
      jobType: this.jobType,
      status,
      ...(renditionId ? { renditionId } : {}),
      ...(errorMessage ? { errorMessage } : {}),
    };
    await this.rabbit.publish(
      EXCHANGES.EVENTS,
      ROUTING_KEYS.JOB_COMPLETED,
      payload
    );
  }

  protected async updateProgress(
    job: ProcessingJob,
    progress: number
  ): Promise<void> {
    await job.update({ progress });
  }
}
