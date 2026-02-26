import express from "express";
import { config } from "@repo/config";
import { connectRedis } from "./services/redis";
import { initDb } from "@repo/database";
import { logger } from "@repo/logger";

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

// Health check route
app.get("/health/auth", (_req, res) => {
  res.status(200).send("OK");
});

const startServer = async () => {
  try {
    await connectRedis();

    await initDb({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database as string,
      user: config.db.user as string,
      password: config.db.password,
      logging: config.env === "development",
    });

    app.listen(config.ports.auth, () => {
      logger.info(`[API] Listening on port ${config.ports.auth}`);
    });
  } catch (error) {
    logger.error("[API] Failed to start:", { error });
    process.exit(1);
  }
};

startServer();
