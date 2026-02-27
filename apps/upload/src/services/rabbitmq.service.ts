import amqp from "amqplib";
import { config } from "@repo/config";
import { logger } from "@repo/logger";

class RabbitMQService {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private exchange = "dam.uploads";

  async connect(retries = 5, delay = 5000): Promise<void> {
    const url = `amqp://${config.rabbitmq.user}:${config.rabbitmq.password}@${config.rabbitmq.host}:${config.rabbitmq.port}/${config.rabbitmq.vhost}`;

    for (let i = 0; i < retries; i++) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        await this.channel.assertExchange(this.exchange, "direct", {
          durable: true,
        });

        logger.info("[RabbitMQ] Connected and exchange asserted.");
        return;
      } catch (error: any) {
        logger.warn(`[RabbitMQ] Connection attempt ${i + 1} failed.`);

        if (i === retries - 1) {
          logger.error("[RabbitMQ] Exhausted all connection retries.", {
            error: error.message,
          });
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async publishUploadComplete(payload: {
    assetId: string;
    uploadSessionId: string;
    userId: string;
    storageKey: string;
  }) {
    if (!this.channel) throw new Error("RabbitMQ channel is not open");

    const routingKey = "upload.completed";
    const message = Buffer.from(JSON.stringify(payload));

    this.channel.publish(this.exchange, routingKey, message, {
      persistent: true,
      messageId: payload.uploadSessionId,
    });

    logger.info(
      `[RabbitMQ] Published ${routingKey} for Asset: ${payload.assetId}`
    );
  }
}

export const rabbitMQService = new RabbitMQService();
