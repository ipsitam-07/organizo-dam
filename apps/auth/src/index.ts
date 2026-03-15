import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { connectRedis } from "@repo/auth";
import { initDb } from "@repo/database";
import authRoutes from "./routes/auth.route";
import { errorHandler } from "./middleware/error.middleware";
import path from "path";
import helmet from "helmet";
import { authLimiter } from "@repo/rate-limit";
import { buildSwaggerDoc, authSchemas, authPaths } from "@repo/docs";

export const app = express();

app.use(helmet());

const swaggerPath = path.join(__dirname, "../../swagger.yml");
app.use(express.json());

app.set("trust proxy", 1);

//Request logging
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

const swaggerDoc = buildSwaggerDoc({
  title: "Organizo DAM — Auth Service",
  description:
    "Authentication API: registration, login, logout, and current-user retrieval.\n\n" +
    "All protected endpoints require a Bearer JWT issued by `POST /api/auth/login`.",
  serverUrl: `http://localhost:${config.ports.auth}`,
  serverDescription: "Auth service",
  schemas: { ...authSchemas },
  paths: { ...authPaths },
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
//Routes
app.use("/api/auth", authLimiter, authRoutes);

//Health check route
app.get("/health/auth", (_req, res) => {
  res.status(200).send("OK");
});

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

    app.listen(config.ports.auth, () => {
      logger.info(`[API Gateway] Listening on port ${config.ports.auth}`);
    });
  } catch (error) {
    logger.error("[API Gateway] Failed to start:", { error });
    process.exit(1);
  }
};

startServer();
