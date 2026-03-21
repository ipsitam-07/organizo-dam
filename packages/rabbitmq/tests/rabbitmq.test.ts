import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/config", () => ({
  config: {
    rabbitmq: {
      user: "guest",
      password: "guest",
      host: "localhost",
      port: 5672,
      vhost: "/",
    },
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockPublish = vi.fn().mockReturnValue(true);
const mockConsume = vi.fn().mockResolvedValue(undefined);
const mockAck = vi.fn();
const mockNack = vi.fn();
const mockChannelClose = vi.fn().mockResolvedValue(undefined);
const mockPrefetch = vi.fn().mockResolvedValue(undefined);
const mockConnectionClose = vi.fn().mockResolvedValue(undefined);
const mockConnectionOn = vi.fn();

let mockCreateChannel: ReturnType<typeof vi.fn>;

const makeChannel = () => ({
  publish: mockPublish,
  consume: mockConsume,
  ack: mockAck,
  nack: mockNack,
  prefetch: mockPrefetch,
  close: mockChannelClose,
});

const makeConnection = () => ({
  on: mockConnectionOn,
  createChannel: mockCreateChannel,
  close: mockConnectionClose,
});

vi.mock("amqplib", () => ({
  default: {
    connect: vi.fn(),
  },
}));

import amqp from "amqplib";
import { RabbitMQClient } from "../src/index";
import { EXCHANGES, QUEUES, ROUTING_KEYS } from "../src/index";

function makeConnectedClient(): RabbitMQClient {
  return new RabbitMQClient("test-service");
}

async function buildConnectedClient(): Promise<RabbitMQClient> {
  mockCreateChannel = vi.fn().mockResolvedValue(makeChannel());
  vi.mocked(amqp.connect).mockResolvedValue(makeConnection() as any);

  const client = makeConnectedClient();
  await client.connect();
  return client;
}

describe("EXCHANGES", () => {
  it("exposes UPLOADS exchange name", () => {
    expect(EXCHANGES.UPLOADS).toBe("dam.uploads");
  });

  it("exposes EVENTS exchange name", () => {
    expect(EXCHANGES.EVENTS).toBe("dam.events");
  });
});

describe("ROUTING_KEYS", () => {
  it("exposes ASSET_UPLOADED routing key", () => {
    expect(ROUTING_KEYS.ASSET_UPLOADED).toBe("asset.uploaded");
  });

  it("exposes all worker routing keys", () => {
    expect(ROUTING_KEYS.PROCESS_METADATA).toBe("asset.process.metadata");
    expect(ROUTING_KEYS.PROCESS_THUMBNAIL).toBe("asset.process.thumbnail");
    expect(ROUTING_KEYS.PROCESS_TRANSCODE).toBe("asset.process.transcode");
    expect(ROUTING_KEYS.PROCESS_IMAGE).toBe("asset.process.image");
    expect(ROUTING_KEYS.PROCESS_DOCUMENT).toBe("asset.process.document");
  });

  it("exposes job event routing keys", () => {
    expect(ROUTING_KEYS.JOB_COMPLETED).toBe("job.completed");
    expect(ROUTING_KEYS.JOB_DEAD_LETTERED).toBe("job.dead_lettered");
  });
});

describe("QUEUES", () => {
  it("exposes all worker queue names", () => {
    expect(QUEUES.ASSET_PROCESSING).toBe("asset-processing");
    expect(QUEUES.METADATA_PROCESSING).toBe("metadata-processing");
    expect(QUEUES.THUMBNAIL_PROCESSING).toBe("thumbnail-processing");
    expect(QUEUES.TRANSCODE_PROCESSING).toBe("transcode-processing");
    expect(QUEUES.IMAGE_PROCESSING).toBe("image-processing");
    expect(QUEUES.DOCUMENT_PROCESSING).toBe("document-processing");
  });

  it("exposes the asset-service event queue", () => {
    expect(QUEUES.ASSET_SERVICE_EVENTS).toBe("asset-service-events");
  });
});

describe("RabbitMQClient.connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateChannel = vi.fn().mockResolvedValue(makeChannel());
    vi.mocked(amqp.connect).mockResolvedValue(makeConnection() as any);
  });

  it("connects successfully and marks client as connected", async () => {
    const client = await buildConnectedClient();
    expect(client.isConnected()).toBe(true);
  });

  it("creates both publish and consume channels", async () => {
    await buildConnectedClient();
    expect(mockCreateChannel).toHaveBeenCalledTimes(2);
  });

  it("sets prefetch(2) on the consume channel", async () => {
    await buildConnectedClient();
    expect(mockPrefetch).toHaveBeenCalledWith(2);
  });

  it("registers error and close handlers on the connection", async () => {
    await buildConnectedClient();
    expect(mockConnectionOn).toHaveBeenCalledWith(
      "error",
      expect.any(Function)
    );
    expect(mockConnectionOn).toHaveBeenCalledWith(
      "close",
      expect.any(Function)
    );
  });

  it("retries and eventually throws after exhausting retries", async () => {
    vi.mocked(amqp.connect).mockRejectedValue(new Error("ECONNREFUSED"));

    const client = new RabbitMQClient("retry-service");
    await expect(client.connect(2, 0)).rejects.toThrow("ECONNREFUSED");

    expect(amqp.connect).toHaveBeenCalledTimes(2);
  });

  it("succeeds on a later retry if early attempts fail", async () => {
    mockCreateChannel = vi.fn().mockResolvedValue(makeChannel());

    vi.mocked(amqp.connect)
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValue(makeConnection() as any);

    const client = new RabbitMQClient("retry-ok-service");
    await client.connect(3, 0);

    expect(client.isConnected()).toBe(true);
    expect(amqp.connect).toHaveBeenCalledTimes(2);
  });
});

describe("RabbitMQClient.publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serialises the payload as JSON and publishes to the exchange", async () => {
    const client = await buildConnectedClient();
    const payload = {
      assetId: "a1",
      storageKey: "k1",
      userId: "u1",
      uploadSessionId: "s1",
    };

    await client.publish("dam.uploads", "asset.uploaded", payload);

    expect(mockPublish).toHaveBeenCalledOnce();
    const [exchange, routingKey, buffer, options] = mockPublish.mock.calls[0];
    expect(exchange).toBe("dam.uploads");
    expect(routingKey).toBe("asset.uploaded");
    expect(JSON.parse(buffer.toString())).toEqual(payload);
    expect(options.persistent).toBe(true);
    expect(options.contentType).toBe("application/json");
  });

  it("uses a provided messageId in publish options", async () => {
    const client = await buildConnectedClient();

    await client.publish("dam.uploads", "asset.uploaded", {}, "custom-id");

    const options = mockPublish.mock.calls[0][3];
    expect(options.messageId).toBe("custom-id");
  });

  it("generates a UUID messageId when none is provided", async () => {
    const client = await buildConnectedClient();
    await client.publish("dam.uploads", "asset.uploaded", {});

    const options = mockPublish.mock.calls[0][3];
    expect(options.messageId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("throws when publish channel is not open", async () => {
    const client = new RabbitMQClient("no-connect");
    await expect(client.publish("exchange", "key", {})).rejects.toThrow(
      /Publish channel is not open/
    );
  });
});

describe("RabbitMQClient.consume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts consuming from the given queue", async () => {
    const client = await buildConnectedClient();
    const handler = vi.fn().mockResolvedValue(undefined);

    await client.consume("test-queue", handler);

    expect(mockConsume).toHaveBeenCalledOnce();
    const [queue, , options] = mockConsume.mock.calls[0];
    expect(queue).toBe("test-queue");
    expect(options.noAck).toBe(false);
  });

  it("acks the message when the handler resolves", async () => {
    const fakeMsg = {
      content: Buffer.from(JSON.stringify({ foo: "bar" })),
    };
    mockConsume.mockImplementation(
      async (_queue: string, cb: (msg: typeof fakeMsg) => Promise<void>) => {
        await cb(fakeMsg);
      }
    );

    const client = await buildConnectedClient();
    const handler = vi.fn().mockResolvedValue(undefined);

    await client.consume("test-queue", handler);

    expect(handler).toHaveBeenCalledWith({ foo: "bar" }, fakeMsg);
    expect(mockAck).toHaveBeenCalledWith(fakeMsg);
    expect(mockNack).not.toHaveBeenCalled();
  });

  it("nacks the message (no requeue) when the handler throws", async () => {
    const fakeMsg = {
      content: Buffer.from(JSON.stringify({ foo: "bar" })),
    };
    mockConsume.mockImplementation(
      async (_queue: string, cb: (msg: typeof fakeMsg) => Promise<void>) => {
        await cb(fakeMsg);
      }
    );

    const client = await buildConnectedClient();
    const handler = vi.fn().mockRejectedValue(new Error("processing failed"));

    await client.consume("test-queue", handler);

    expect(mockNack).toHaveBeenCalledWith(fakeMsg, false, false);
    expect(mockAck).not.toHaveBeenCalled();
  });

  it("skips null messages silently", async () => {
    mockConsume.mockImplementation(
      async (_queue: string, cb: (msg: null) => Promise<void>) => {
        await cb(null);
      }
    );

    const client = await buildConnectedClient();
    const handler = vi.fn();

    await client.consume("test-queue", handler);

    expect(handler).not.toHaveBeenCalled();
    expect(mockAck).not.toHaveBeenCalled();
  });

  it("throws when consume channel is not open", async () => {
    const client = new RabbitMQClient("no-connect");
    await expect(client.consume("queue", vi.fn())).rejects.toThrow(
      /Consume channel is not open/
    );
  });
});

describe("RabbitMQClient.close", () => {
  it("closes both channels and the connection", async () => {
    const client = await buildConnectedClient();
    await client.close();

    expect(mockChannelClose).toHaveBeenCalledTimes(2);
    expect(mockConnectionClose).toHaveBeenCalledOnce();
  });

  it("does not throw when already disconnected", async () => {
    const client = new RabbitMQClient("not-connected");
    await expect(client.close()).resolves.toBeUndefined();
  });
});

describe("RabbitMQClient.isConnected", () => {
  it("returns false before connect()", () => {
    const client = new RabbitMQClient("fresh");
    expect(client.isConnected()).toBe(false);
  });

  it("returns true after a successful connect()", async () => {
    const client = await buildConnectedClient();
    expect(client.isConnected()).toBe(true);
  });
});

describe("RabbitMQClient channel accessors", () => {
  it("getPublishChannel returns null before connect()", () => {
    const client = new RabbitMQClient("fresh");
    expect(client.getPublishChannel()).toBeNull();
  });

  it("getConsumeChannel returns null before connect()", () => {
    const client = new RabbitMQClient("fresh");
    expect(client.getConsumeChannel()).toBeNull();
  });

  it("getPublishChannel returns a channel after connect()", async () => {
    const client = await buildConnectedClient();
    expect(client.getPublishChannel()).not.toBeNull();
  });

  it("getConsumeChannel returns a channel after connect()", async () => {
    const client = await buildConnectedClient();
    expect(client.getConsumeChannel()).not.toBeNull();
  });
});
