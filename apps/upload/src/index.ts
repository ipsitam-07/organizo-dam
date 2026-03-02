import express from "express";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { initDb } from "@repo/database";
import { S3ClientConfig } from "@aws-sdk/client-s3";
import { Server } from "@tus/server";
import { S3Store } from "@tus/s3-store";

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

const credential: S3ClientConfig["credentials"] = {
  accessKeyId: config.minio.accessKey,
  secretAccessKey: config.minio.secretKey!,
};

const tusServer = new Server({
  path: "/api/upload",
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
});

app.all("/api/upload", tusServer.handle.bind(tusServer));
app.all("/api/upload/*", tusServer.handle.bind(tusServer));

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
      logger.info(`[TUS Server] Ready to accept chunked uploads`);
    });
  } catch (error) {
    logger.error("[Upload Service] Failed to start:", { error });
    process.exit(1);
  }
};

startServer();
