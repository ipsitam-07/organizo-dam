import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inferTagsFromMimeType,
  attachTag,
  autoTagAsset,
} from "../src/services/tag.service";

vi.mock("@repo/database", () => ({
  Tag: {
    findOrCreate: vi.fn(),
  },
  AssetTag: {
    findOrCreate: vi.fn(),
  },
}));

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { Tag, AssetTag } from "@repo/database";

beforeEach(() => vi.clearAllMocks());

// inferTagsFromMimeType
describe("inferTagsFromMimeType", () => {
  it.each([
    ["video/mp4", ["video"]],
    ["video/quicktime", ["video"]],
    ["image/jpeg", ["image"]],
    ["image/png", ["image"]],
    ["audio/mpeg", ["audio"]],
    ["application/pdf", ["document"]],
    ["application/zip", ["archive"]],
    ["application/gzip", ["archive"]],
    ["text/plain", []],
    ["application/json", []],
  ])("mime type %s → tags %j", (mimeType, expected) => {
    expect(inferTagsFromMimeType(mimeType)).toEqual(expected);
  });
});

//attachTag

describe("attachTag", () => {
  it("creates tag and asset_tag join row", async () => {
    const mockTag = { id: "tag-1", name: "video", source: "auto" };
    vi.mocked(Tag.findOrCreate).mockResolvedValue([mockTag, true] as any);
    vi.mocked(AssetTag.findOrCreate).mockResolvedValue([{}, true] as any);

    const result = await attachTag("asset-1", "video", "auto");

    expect(Tag.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: "video" } })
    );
    expect(AssetTag.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { asset_id: "asset-1", tag_id: "tag-1" },
      })
    );
    expect(result.name).toBe("video");
  });

  it("lowercases and trims tag name", async () => {
    const mockTag = { id: "tag-1", name: "video", source: "user" };
    vi.mocked(Tag.findOrCreate).mockResolvedValue([mockTag, false] as any);
    vi.mocked(AssetTag.findOrCreate).mockResolvedValue([{}, false] as any);

    await attachTag("asset-1", "  VIDEO  ", "user");

    expect(Tag.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: "video" } })
    );
  });
});

// autoTagAsset
describe("autoTagAsset", () => {
  it("attaches correct auto-tags for video mime type", async () => {
    const mockTag = { id: "tag-1", name: "video", source: "auto" };
    vi.mocked(Tag.findOrCreate).mockResolvedValue([mockTag, true] as any);
    vi.mocked(AssetTag.findOrCreate).mockResolvedValue([{}, true] as any);

    await autoTagAsset("asset-1", "video/mp4");

    expect(Tag.findOrCreate).toHaveBeenCalledTimes(1);
    expect(Tag.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { name: "video" } })
    );
  });

  it("attaches no tags for unrecognised mime type", async () => {
    await autoTagAsset("asset-1", "text/plain");
    expect(Tag.findOrCreate).not.toHaveBeenCalled();
  });
});
