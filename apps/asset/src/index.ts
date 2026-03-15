import express from "express";
import helmet from "helmet";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { errorHandler } from "./middleware/error.middleware";
import { connectRedis } from "@repo/auth";
import { initDb, ProcessingJob } from "@repo/database";
import assetRoutes from "./routes/asset.route";
import shareRoutes from "./routes/share.route";
import { RabbitMQClient, QUEUES } from "@repo/rabbitmq";
import { handleJobEvent } from "./services/job-events.service";
import { apiLimiter, shareLimiter } from "@repo/rate-limit";
import { Op } from "sequelize";
import { queueLengthGauge, registry } from "./metric";
import {
  buildSwaggerDoc,
  assetSchemas,
  assetPaths,
  sharePaths,
} from "@repo/docs";

export const app = express();
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());

app.set("trust proxy", 1);

//Request logging
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

const swaggerDoc = buildSwaggerDoc({
  title: "Organizo DAM — Asset Service",
  description:
    "Asset management API: list, retrieve, delete, download, tags, share links, and processing status.\n\n" +
    "All endpoints require a Bearer JWT unless otherwise noted.",
  serverUrl: `http://localhost:${config.ports.asset}`,
  serverDescription: "Asset service",
  schemas: { ...assetSchemas },
  paths: { ...assetPaths, ...sharePaths },
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

//Health check route
app.get("/health/asset", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/metrics", async (_req, res) => {
  try {
    const activeCount = await ProcessingJob.count({
      where: { status: { [Op.in]: ["queued", "active"] } },
    });
    queueLengthGauge.set(activeCount);

    res.setHeader("Content-Type", registry.contentType);
    res.end(await registry.metrics());
  } catch (err) {
    res.status(500).end("Error collecting metrics");
  }
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
