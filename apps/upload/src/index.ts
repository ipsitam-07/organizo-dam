import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { initDb } from "@repo/database";
import { Server } from "@tus/server";
import { S3Store } from "@tus/s3-store";
import { rabbitMQService } from "./services/rabbitmq.service";
import { connectRedis, requireAuth, AuthRequest } from "@repo/auth";
import { uploadService } from "./services/upload.service";
import uploadRoutes from "./routes/upload.route";
import { errorHandler } from "./middleware/error.middleware";

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
app.get("/health/upload", (_req, res) => {
  res.status(200).send("OK");
});

//Routes
app.use("/api/upload", uploadRoutes);

export function createTusServer() {
  const tusServer = new Server({
    path: "/api/upload/core",
    datastore: new S3Store({
      partSize: 5 * 1024 * 1024,

      s3ClientConfig: {
        endpoint: `http://${config.minio.endpoint}`,
        region: "us-east-1",
        credentials: {
          accessKeyId: config.minio.accessKey,
          secretAccessKey: config.minio.secretKey!,
        },
        bucket: config.minio.buckets.chunks,
        forcePathStyle: true,
      },
    }),
    async onUploadCreate(req, res, upload) {
      const authReq = req as unknown as AuthRequest;
      if (!authReq.user?.id) throw { status_code: 401, body: "Unauthorized" };

      await uploadService.initializeSession(
        upload.id,
        authReq.user.id,
        upload.metadata || {},
        upload.size || 0
      );
      logger.info(`[TUS] Upload started: ${upload.id}`);
      return res;
    },

    async onUploadFinish(req, res, upload) {
      const authReq = req as unknown as AuthRequest;

      if (!authReq.user?.id) throw { status_code: 401, body: "Unauthorized" };

      const { session, asset } = await uploadService.finalizeUpload(
        upload.id,
        authReq.user.id,
        upload.metadata || {},
        upload.size || 0
      );

      if (session && asset) {
        await rabbitMQService.publishUploadComplete({
          assetId: asset.id,
          uploadSessionId: session.id,
          userId: authReq.user.id,
          storageKey: asset.storage_key,
        });
      }
      return res;
    },
  });

  //TUS Server routes
  app.all("/api/upload/core", requireAuth, tusServer.handle.bind(tusServer));
  app.all("/api/upload/core/*", requireAuth, tusServer.handle.bind(tusServer));

  return tusServer;
}

app.use(errorHandler);

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

    createTusServer();

    app.listen(config.ports.upload, () => {
      logger.info(`[Upload Service] Listening on port ${config.ports.upload}`);
    });
    await rabbitMQService.connect();
  } catch (error) {
    logger.error("[Upload Service] Failed to start:", { error });
    process.exit(1);
  }
};

startServer();
