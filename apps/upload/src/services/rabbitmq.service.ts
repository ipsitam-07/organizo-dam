import { RabbitMQClient } from "@repo/rabbitmq";
import { UploadCompletePayload } from "@repo/rabbitmq/src/utils/interfaces";
import { EXCHANGES, ROUTING_KEYS } from "@repo/rabbitmq/src/utils/constants";

const client = new RabbitMQClient("upload");

export const rabbitMQService = {
  connect: (retries?: number, delayMs?: number) =>
    client.connect(retries, delayMs),

  async publishUploadComplete(payload: UploadCompletePayload): Promise<void> {
    await client.publish(
      EXCHANGES.UPLOADS,
      ROUTING_KEYS.ASSET_UPLOADED,
      payload,
      payload.uploadSessionId
    );
  },

  isConnected: () => client.isConnected(),
};
