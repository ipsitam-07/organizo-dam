import {
  Registry,
  Counter,
  Histogram,
  collectDefaultMetrics,
} from "prom-client";
import http from "http";
import { logger } from "@repo/logger";

export const registry = new Registry();

//collect default node js runtime metrics
collectDefaultMetrics({ register: registry });

//business metrics
export const jobProcessedTotal = new Counter({
  name: "job_processed_total",
  help: "Total number of jobs successfully processsed by this worker pod",
  labelNames: ["worker_type"] as const,
  registers: [registry],
});

export const jobProcessingTimeSeconds = new Histogram({
  name: "job_processing_time_seconds",
  help: "Duration of job processing in seconds, by worker type",
  labelNames: ["worker_type"] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [registry],
});

export const jobErrorsTotal = new Counter({
  name: "job_errors_total",
  help: "Total number of jobs that threw an error during processing",
  labelNames: ["worker_type"] as const,
  registers: [registry],
});

//Metrics HTTP Server

export function startMetricsServer(port = 9090): void {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/metrics") {
      try {
        res.setHeader("Content-type", registry.contentType);
        res.end(await registry.metrics());
      } catch (err) {
        res.writeHead(500);
        res.end("metrics collection error");
      }
    } else {
      res.writeHead(200);
      res.end("OK");
    }
  });

  server.listen(port, () => {
    logger.info(
      `[Metrucs] Prometheus metrics server listening on :${port}/metrics`
    );
  });
}
