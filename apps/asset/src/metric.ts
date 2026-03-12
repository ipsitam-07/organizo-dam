import { Registry, Counter, Gauge, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();

// collect default node js runtime metrics
collectDefaultMetrics({ register: registry });

//custom business metrics
export const totalJobsSubmitted = new Counter({
  name: "total_jobs_submitted",
  help: "Total number of upload jobs submitted to the processing pipeline",
  registers: [registry],
});

export const totalJobsCompleted = new Counter({
  name: "total_jobs_completed",
  help: "Total number of processing jobs that have finished (success or failure)",
  labelNames: ["status"] as const,
  registers: [registry],
});

export const queueLengthGauge = new Gauge({
  name: "queue_length",
  help: "Number of processing jobs currently in queued or active state",
  registers: [registry],
});
