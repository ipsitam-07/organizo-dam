import { logger } from "@repo/logger";
import { AssemblyWorker } from "./workers/assembly.worker";
import { MetadataWorker } from "./workers/metadata.worker";
import { ThumbnailWorker } from "./workers/thumbnail.worker";
import { TranscodeWorker } from "./workers/transcode.worker";
import { ImageWorker } from "./workers/image.worker";
import { DocumentWorker } from "./workers/document.worker";
import { startMetricsServer } from "./metric";

async function main() {
  logger.info("[Workers] Starting DAM Platform worker pipeline...");

  const metricsPort = Number(process.env.METRICS_PORT) || 9090;
  startMetricsServer(metricsPort);
  const workers = [
    new AssemblyWorker(),
    new MetadataWorker(),
    new ThumbnailWorker(),
    new TranscodeWorker(),
    new ImageWorker(),
    new DocumentWorker(),
  ];

  await Promise.all(workers.map((w) => w.start()));
  logger.info("[Worker] Workers running fine");

  const shutdown = async (signal: string) => {
    logger.info(`[Workers] ${signal} received — shutting down gracefully...`);
    for (const w of workers) {
      await (w as any).rabbit.close().catch(() => {});
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("[Workers] Fatal startup error: ", { error: err.message });
  process.exit(1);
});
