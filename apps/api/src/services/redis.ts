import { createClient } from "redis";
import { config } from "@repo/config";
import { logger } from "@repo/logger";

export const redisClient = createClient({
  url: `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`,
});

redisClient.on("error", (err) =>
  logger.error("[Redis] Client Error", { error: err })
);
redisClient.on("connect", () => logger.info("[Redis] Connected successfully."));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
