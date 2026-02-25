import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || "3000", 10),

  db: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    database: process.env.POSTGRES_DB,
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
    user: process.env.RABBITMQ_USER,
    password: process.env.RABBITMQ_PASSWORD,
    vhost: process.env.RABBITMQ_VHOST,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },
};
