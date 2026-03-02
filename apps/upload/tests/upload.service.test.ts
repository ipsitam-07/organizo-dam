import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadService } from "../src/services/upload.service";
import { uploadRepository } from "../src/repo/upload.repo";

vi.mock("../src/repo/upload.repo", () => ({
  uploadRepository: {
    createUploadSession: vi.fn(),
    findSessionByTusId: vi.fn(),
    findSessionByIdAndUser: vi.fn(),
    updateSessionStatus: vi.fn(),
    getUserSessions: vi.fn(),
    createAsset: vi.fn(),
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockSession = {
  id: "session-uuid-123",
  user_id: "user-uuid-123",
  tus_upload_id: "tus-abc-123",
  status: "initiated",
  update: vi.fn(),
};

const mockAsset = {
  id: "asset-uuid-123",
  storage_key: "tus-abc-123",
  status: "queued",
};

beforeEach(() => vi.clearAllMocks());

describe("UploadService.initializeSession", () => {
  it("creates an upload session with correct fields", async () => {
    vi.mocked(uploadRepository.createUploadSession).mockResolvedValue(
      mockSession as any
    );

    const result = await uploadService.initializeSession(
      "tus-abc-123",
      "user-uuid-123",
      { filename: "video.mp4", filetype: "video/mp4" },
      10_000_000
    );

    expect(uploadRepository.createUploadSession).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-uuid-123",
        tus_upload_id: "tus-abc-123",
        original_filename: "video.mp4",
        mime_type: "video/mp4",
        total_size_bytes: 10_000_000,
        status: "initiated",
      })
    );
    expect(result.id).toBe("session-uuid-123");
  });

  it("falls back to unknown_file and octet-stream when metadata is empty", async () => {
    vi.mocked(uploadRepository.createUploadSession).mockResolvedValue(
      mockSession as any
    );

    await uploadService.initializeSession(
      "tus-abc-123",
      "user-uuid-123",
      {},
      0
    );

    expect(uploadRepository.createUploadSession).toHaveBeenCalledWith(
      expect.objectContaining({
        original_filename: "unknown_file",
        mime_type: "application/octet-stream",
      })
    );
  });
});

describe("UploadService.finalizeUpload", () => {
  it("updates session to complete and creates asset", async () => {
    vi.mocked(uploadRepository.findSessionByTusId).mockResolvedValue(
      mockSession as any
    );
    vi.mocked(uploadRepository.updateSessionStatus).mockResolvedValue({
      ...mockSession,
      status: "complete",
    } as any);
    vi.mocked(uploadRepository.createAsset).mockResolvedValue(mockAsset as any);

    const result = await uploadService.finalizeUpload(
      "tus-abc-123",
      "user-uuid-123",
      { filename: "video.mp4", filetype: "video/mp4" },
      10_000_000
    );

    expect(uploadRepository.updateSessionStatus).toHaveBeenCalledWith(
      mockSession,
      "complete",
      expect.objectContaining({ completed_at: expect.any(Date) })
    );

    expect(uploadRepository.createAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-uuid-123",
        storage_key: "tus-abc-123",
        status: "queued",
      })
    );

    expect(result.asset.id).toBe("asset-uuid-123");
  });

  it("still creates asset even if session is not found", async () => {
    vi.mocked(uploadRepository.findSessionByTusId).mockResolvedValue(null);
    vi.mocked(uploadRepository.createAsset).mockResolvedValue(mockAsset as any);

    const result = await uploadService.finalizeUpload(
      "tus-abc-123",
      "user-uuid-123",
      {},
      0
    );

    expect(uploadRepository.updateSessionStatus).not.toHaveBeenCalled();
    expect(result.asset).toBeDefined();
    expect(result.session).toBeNull();
  });
});

describe("UploadService.cancelSession", () => {
  it("marks session as failed", async () => {
    const activeSession = { ...mockSession, status: "initiated" };
    vi.mocked(uploadRepository.findSessionByIdAndUser).mockResolvedValue(
      activeSession as any
    );
    vi.mocked(uploadRepository.updateSessionStatus).mockResolvedValue({
      ...activeSession,
      status: "failed",
    } as any);

    const result = await uploadService.cancelSession(
      "session-uuid-123",
      "user-uuid-123"
    );

    expect(uploadRepository.updateSessionStatus).toHaveBeenCalledWith(
      activeSession,
      "failed"
    );
    expect(result).toBeDefined();
  });

  it("returns null when session is not found", async () => {
    vi.mocked(uploadRepository.findSessionByIdAndUser).mockResolvedValue(null);

    const result = await uploadService.cancelSession("bad-id", "user-uuid-123");

    expect(result).toBeNull();
  });

  it("throws when trying to cancel a completed session", async () => {
    vi.mocked(uploadRepository.findSessionByIdAndUser).mockResolvedValue({
      ...mockSession,
      status: "complete",
    } as any);

    await expect(
      uploadService.cancelSession("session-uuid-123", "user-uuid-123")
    ).rejects.toThrow("Cannot cancel a completed upload");
  });
});

describe("UploadService.getUserSessions", () => {
  it("returns sessions for the given user", async () => {
    vi.mocked(uploadRepository.getUserSessions).mockResolvedValue([
      mockSession,
    ] as any);

    const result = await uploadService.getUserSessions("user-uuid-123");

    expect(uploadRepository.getUserSessions).toHaveBeenCalledWith(
      "user-uuid-123"
    );
    expect(result).toHaveLength(1);
  });
});
