import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const config = {
  env: process.env.NODE_ENV || "development",

  // Microservice Ports
  ports: {
    auth: parseInt(process.env.AUTH_SERVICE_PORT || "3001", 10),
    upload: parseInt(process.env.UPLOAD_SERVICE_PORT || "3002", 10),
    asset: parseInt(process.env.ASSET_SERVICE_PORT || "3003", 10),
  },

  db: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB || "dam_platform",
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD,
  },

  rabbitmq: {
    host: process.env.RABBITMQ_HOST || "localhost",
    port: parseInt(process.env.RABBITMQ_PORT || "5672", 10),
    user: process.env.RABBITMQ_USER || "dam_rabbit",
    password: process.env.RABBITMQ_PASSWORD,
    vhost: process.env.RABBITMQ_VHOST || "dam",
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || "localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY || "dam_minio",
    secretKey: process.env.MINIO_SECRET_KEY,
    buckets: {
      assets: process.env.MINIO_BUCKET_ASSETS || "assets",
      chunks: process.env.MINIO_BUCKET_CHUNKS || "chunks",
      renditions: process.env.MINIO_BUCKET_RENDITIONS || "renditions",
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },
};
