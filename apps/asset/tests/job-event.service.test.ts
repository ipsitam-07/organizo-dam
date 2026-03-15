import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleJobEvent } from "../src/services/job-events.service";

vi.mock("@repo/database", () => ({
  Asset: {
    update: vi.fn(),
  },
  ProcessingJob: {
    update: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("sequelize", () => ({
  Op: { notIn: Symbol("notIn") },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { Asset, ProcessingJob } from "@repo/database";

const mockMsg = {} as any;

beforeEach(() => vi.clearAllMocks());

describe("handleJobEvent", () => {
  it("marks asset READY when all jobs complete", async () => {
    vi.mocked(ProcessingJob.update).mockResolvedValue([1] as any);
    vi.mocked(ProcessingJob.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await handleJobEvent(
      {
        assetId: "asset-1",
        jobId: "job-1",
        jobType: "thumbnail",
        status: "completed",
      },
      mockMsg
    );

    expect(ProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
      { where: { id: "job-1" } }
    );
    expect(Asset.update).toHaveBeenCalledWith(
      { status: "ready" },
      { where: { id: "asset-1" } }
    );
  });

  it("does NOT mark asset ready when other jobs are still pending", async () => {
    vi.mocked(ProcessingJob.update).mockResolvedValue([1] as any);
    vi.mocked(ProcessingJob.count)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await handleJobEvent(
      {
        assetId: "asset-1",
        jobId: "job-1",
        jobType: "transcode",
        status: "completed",
      },
      mockMsg
    );

    expect(Asset.update).not.toHaveBeenCalled();
  });

  it("marks asset FAILED immediately on any job failure", async () => {
    vi.mocked(ProcessingJob.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await handleJobEvent(
      {
        assetId: "asset-1",
        jobId: "job-1",
        jobType: "metadata",
        status: "failed",
        errorMessage: "FFmpeg crashed",
      },
      mockMsg
    );

    expect(Asset.update).toHaveBeenCalledWith(
      { status: "failed" },
      { where: { id: "asset-1" } }
    );
    expect(ProcessingJob.count).not.toHaveBeenCalled();
  });

  it("stores error message on the job record", async () => {
    vi.mocked(ProcessingJob.update).mockResolvedValue([1] as any);
    vi.mocked(Asset.update).mockResolvedValue([1] as any);

    await handleJobEvent(
      {
        assetId: "asset-1",
        jobId: "job-1",
        jobType: "thumbnail",
        status: "failed",
        errorMessage: "Out of memory",
      },
      mockMsg
    );

    expect(ProcessingJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ error_message: "Out of memory" }),
      { where: { id: "job-1" } }
    );
  });
});
