import express from "express";
import swaggerUi from "swagger-ui-express";
import { config } from "@repo/config";
import { logger } from "@repo/logger";
import { connectRedis } from "@repo/auth";
import { initDb } from "@repo/database";
import authRoutes from "./routes/auth.route";
import { errorHandler } from "./middleware/error.middleware";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";

export const app = express();

const swaggerPath = path.join(__dirname, "../../swagger.yml");
app.use(express.json());

//Request logging
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.path}`);
  next();
});

let swaggerDoc;
try {
  swaggerDoc = yaml.load(fs.readFileSync(swaggerPath, "utf8"));
} catch (err) {
  logger.error("Failed to load swagger.", err);
}

if (swaggerDoc) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
}

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
