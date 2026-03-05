import express from "express";
import helmet from "helmet";
import cors from "cors";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { errorHandler } from "./middleware/error.middleware";
import { connectRedis } from "@repo/auth";
import { initDb } from "@repo/database";
import assetRoutes from "./routes/asset.route";
import shareRoutes from "./routes/share.route";
import { RabbitMQClient, QUEUES } from "@repo/rabbitmq";
import { handleJobEvent } from "./services/job-events.service";
import { apiLimiter, shareLimiter } from "@repo/rate-limit";

export const app = express();
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());

//Request logging
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

//Health check route
app.get("/health/asset", (_req, res) => {
  res.status(200).send("OK");
});

//Routes
app.use("/api/assets", apiLimiter, assetRoutes);
app.use("/api/share", shareLimiter, shareRoutes);

app.use(errorHandler);

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error("[Global Error]", { error: err.message });

  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
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
    const rabbitClient = new RabbitMQClient("asset");
    await rabbitClient.connect();
    await rabbitClient.consume(QUEUES.ASSET_SERVICE_EVENTS, handleJobEvent);

    app.listen(config.ports.asset, () => {
      logger.info(`[Asset Service] Listening on port ${config.ports.asset}`);
    });
  } catch (error) {
    logger.error("[Asset Service] Failed to start:", { error });
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
