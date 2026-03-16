import express from "express";
import swaggerUi from "swagger-ui-express";
import {
  buildSwaggerDoc,
  authSchemas,
  authPaths,
  assetSchemas,
  assetPaths,
  sharePaths,
  uploadSchemas,
  uploadPaths,
} from "@repo/docs";
import { logger } from "@repo/logger";

const PORT = parseInt(process.env.GATEWAY_PORT || "3000", 10);

const app = express();

const mergedDoc = buildSwaggerDoc({
  title: "Organizo DAM — Full API Reference",
  description: `
Complete API reference for the Organizo Digital Asset Management platform.`,
  serverUrl: "http://localhost",
  serverDescription: "nginx reverse proxy (all services)",
  schemas: {
    ...authSchemas,
    ...assetSchemas,
    ...uploadSchemas,
  },
  paths: {
    ...authPaths,
    ...assetPaths,
    ...sharePaths,
    ...uploadPaths,
  },
});

app.use("/api-docs", swaggerUi.serve);
app.get(
  "/api-docs",
  swaggerUi.setup(mergedDoc, {
    customSiteTitle: "Organizo DAM API",
    swaggerOptions: {
      docExpansion: "none",
      defaultModelRendering: "model",
      persistAuthorization: true,
    },
  })
);

app.get("/health/gateway", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/spec.json", (_req, res) => {
  res.json(mergedDoc);
});

app.listen(PORT, () => {
  logger.info(`[Gateway] Swagger UI - http://localhost:${PORT}/api-docs`);
  logger.info(`[Gateway] Via nginx - http://localhost/api-docs/`);
});
