import { logger } from "@repo/logger";

async function main() {
  logger.info("[Workers] Starting DAM Platform worker pipeline...");
}

main().catch((err) => {
  logger.error("[Workers] Fatal startup error: ", { error: err.message });
  process.exit(1);
});
