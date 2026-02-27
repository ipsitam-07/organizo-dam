import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { connectRedis } from "@repo/auth";
import { initDb } from "@repo/database";
import { swaggerSpec } from "./swagger";
import authRoutes from "./routes/auth.route";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
app.use(express.json());

//Request logging
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);

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
      logger.info(
        `[Swagger UI] Available at http://localhost:${config.ports.auth}/api-docs`
      );
    });
  } catch (error) {
    logger.error("[API Gateway] Failed to start:", { error });
    process.exit(1);
  }
};

startServer();
