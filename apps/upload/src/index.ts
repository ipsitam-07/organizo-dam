import express from "express";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { initDb } from "@repo/database";

const app = express();

//Request logging
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

//Health check route
app.get("/health/upload", (_req, res) => {
  res.status(200).send("OK");
});

const startServer = async () => {
  try {
    await initDb({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database as string,
      user: config.db.user as string,
      password: config.db.password,
      logging: config.env === "development",
    });

    app.listen(config.ports.upload, () => {
      logger.info(`[Upload Service] Listening on port ${config.ports.upload}`);
    });
  } catch (error) {
    logger.error("[Upload Service] Failed to start:", { error });
    process.exit(1);
  }
};

startServer();
