import { createClient } from "redis";
import { config } from "../config";

export const redisClient = createClient({
  url: `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}`,
});

redisClient.on("error", (err) => console.error("[Redis] Client Error", err));
redisClient.on("connect", () => console.log("[Redis] Connected successfully."));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
