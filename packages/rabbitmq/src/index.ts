import amqp from "amqplib";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { MessageHandler } from "./utils/interfaces";

export class RabbitMQClient {
  private connection: amqp.ChannelModel | null = null;
  private publishChannel: amqp.Channel | null = null;
  private consumeChannel: amqp.Channel | null = null;
  private readonly serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  async connect(retries = 10, delayMs = 5000): Promise<void> {
    const { user, password, host, port, vhost } = config.rabbitmq;
    const url = `amqp://${user}:${password}@${host}:${port}/${vhost}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.connection = await amqp.connect(url);

        this.connection.on("error", (err) => {
          logger.error(`[RabbitMQ:${this.serviceName}] Connection error`, {
            error: err.message,
          });
        });

        this.connection.on("close", () => {
          logger.warn(
            `[RabbitMQ:${this.serviceName}] Connection closed unexpectedly`
          );
        });

        this.publishChannel = await this.connection.createChannel();
        this.consumeChannel = await this.connection.createChannel();

        await this.consumeChannel.prefetch(1);

        logger.info(
          `[RabbitMQ:${this.serviceName}] Connected successfully (attempt ${attempt})`
        );
        return;
      } catch (err: any) {
        logger.warn(
          `[RabbitMQ:${this.serviceName}] Connection attempt ${attempt}/${retries} failed: ${err.message}`
        );

        if (attempt === retries) {
          logger.error(
            `[RabbitMQ:${this.serviceName}] Exhausted all retries. Giving up.`
          );
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async publish(
    exchange: string,
    routingKey: string,
    payload: object,
    messageId?: string
  ): Promise<void> {
    if (!this.publishChannel) {
      throw new Error(
        `[RabbitMQ:${this.serviceName}] Publish channel is not open. Call connect() first.`
      );
    }

    const message = Buffer.from(JSON.stringify(payload));

    this.publishChannel.publish(exchange, routingKey, message, {
      persistent: true,
      contentType: "application/json",
      messageId: messageId ?? crypto.randomUUID(),
      timestamp: Math.floor(Date.now() / 1000),
    });

    logger.info(
      `[RabbitMQ:${this.serviceName}] Published to exchange="${exchange}" routingKey="${routingKey}"`
    );
  }

  async consume(
    queue: string,
    handler: MessageHandler,
    options: { noAck?: boolean } = {}
  ): Promise<void> {
    if (!this.consumeChannel) {
      throw new Error(
        `[RabbitMQ:${this.serviceName}] Consume channel is not open. Call connect() first.`
      );
    }

    const channel = this.consumeChannel;

    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const payload = JSON.parse(msg.content.toString());
          await handler(payload, msg);

          if (!options.noAck) {
            channel.ack(msg);
          }
        } catch (err: any) {
          logger.error(
            `[RabbitMQ:${this.serviceName}] Handler error on queue="${queue}"`,
            { error: err.message }
          );
          if (!options.noAck) {
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: options.noAck ?? false }
    );

    logger.info(
      `[RabbitMQ:${this.serviceName}] Consuming from queue="${queue}"`
    );
  }

  //helpers
  isConnected(): boolean {
    return this.publishChannel !== null && this.consumeChannel !== null;
  }

  getPublishChannel(): amqp.Channel | null {
    return this.publishChannel;
  }

  getConsumeChannel(): amqp.Channel | null {
    return this.consumeChannel;
  }

  async close(): Promise<void> {
    try {
      await this.publishChannel?.close();
      await this.consumeChannel?.close();
      await this.connection?.close();
    } catch (err: any) {
      logger.warn(`[RabbitMQ:${this.serviceName}] Error during close`, {
        error: err.message,
      });
    }
  }
}

export * from "./utils/constants";
export * from "./utils/interfaces";
