import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/database", () => ({
  Asset: { create: vi.fn() },
  UploadSession: {
    create: vi.fn(),
    findOne: vi.fn(),
    findAll: vi.fn(),
  },
}));

import { UploadSession, Asset } from "@repo/database";
import { uploadRepository } from "../src/repo/upload.repo";

beforeEach(() => vi.clearAllMocks());

//getUserSessions

describe("UploadRepository.getUserSessions", () => {
  it("queries by user_id", async () => {
    vi.mocked(UploadSession.findAll).mockResolvedValue([]);
    await uploadRepository.getUserSessions("user-123");
    expect(UploadSession.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: "user-123" } })
    );
  });

  it("sorts by created_at DESC — not camelCase createdAt", async () => {
    vi.mocked(UploadSession.findAll).mockResolvedValue([]);
    await uploadRepository.getUserSessions("user-123");
    const call = vi.mocked(UploadSession.findAll).mock.calls[0]![0] as any;
    expect(call.order).toEqual([["created_at", "DESC"]]);
    expect(call.order).not.toEqual([["createdAt", "DESC"]]);
  });

  it("returns the sessions from the database", async () => {
    const sessions = [
      { id: "s1", status: "complete" },
      { id: "s2", status: "initiated" },
    ];
    vi.mocked(UploadSession.findAll).mockResolvedValue(sessions as any);
    const result = await uploadRepository.getUserSessions("user-123");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "s1" });
  });
});

//findSessionByIdAndUser

describe("UploadRepository.findSessionByIdAndUser", () => {
  it("queries by both id and user_id", async () => {
    vi.mocked(UploadSession.findOne).mockResolvedValue(null);
    await uploadRepository.findSessionByIdAndUser("sess-1", "user-123");
    expect(UploadSession.findOne).toHaveBeenCalledWith({
      where: { id: "sess-1", user_id: "user-123" },
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(UploadSession.findOne).mockResolvedValue(null);
    const result = await uploadRepository.findSessionByIdAndUser(
      "bad-id",
      "user-123"
    );
    expect(result).toBeNull();
  });
});

//findSessionByTusId

describe("UploadRepository.findSessionByTusId", () => {
  it("queries by tus_upload_id", async () => {
    vi.mocked(UploadSession.findOne).mockResolvedValue(null);
    await uploadRepository.findSessionByTusId("tus-abc");
    expect(UploadSession.findOne).toHaveBeenCalledWith({
      where: { tus_upload_id: "tus-abc" },
    });
  });
});

//createUploadSession

describe("UploadRepository.createUploadSession", () => {
  it("calls UploadSession.create with provided data", async () => {
    const data = { user_id: "u1", tus_upload_id: "tus-1", status: "initiated" };
    vi.mocked(UploadSession.create).mockResolvedValue(data as any);
    const result = await uploadRepository.createUploadSession(data);
    expect(UploadSession.create).toHaveBeenCalledWith(data);
    expect(result).toMatchObject({ tus_upload_id: "tus-1" });
  });
});

//createAsset

describe("UploadRepository.createAsset", () => {
  it("calls Asset.create with provided data", async () => {
    const data = { user_id: "u1", storage_key: "tus-1", status: "queued" };
    vi.mocked(Asset.create).mockResolvedValue(data as any);
    await uploadRepository.createAsset(data);
    expect(Asset.create).toHaveBeenCalledWith(data);
  });
});
