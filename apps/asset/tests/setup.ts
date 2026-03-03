import { vi } from "vitest";

vi.mock("@repo/auth", () => ({
  connectRedis: vi.fn().mockResolvedValue(undefined),
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1", email: "test@example.com", role: "user" };
    next();
  },
  NotFoundError: class extends Error {
    statusCode = 404;
  },
  AppError: class extends Error {
    statusCode: number;
    constructor(m: string, s: number) {
      super(m);
      this.statusCode = s;
    }
  },
}));

vi.mock("@repo/database", () => ({
  initDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@repo/rabbitmq", () => ({
  RabbitMQClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    consume: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
  })),
  QUEUES: { ASSET_SERVICE_EVENTS: "asset-service-events" },
}));
