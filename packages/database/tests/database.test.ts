import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@repo/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockAuthenticate = vi.fn();
const mockSync = vi.fn();
const mockDefine = vi.fn();

const mockSequelizeInstance = {
  authenticate: mockAuthenticate,
  sync: mockSync,
  define: mockDefine,
  queryInterface: {},
};

vi.mock("sequelize", async (importOriginal) => {
  const actual = await importOriginal<typeof import("sequelize")>();

  class MockSequelize {
    constructor() {
      Object.assign(this, mockSequelizeInstance);
    }
    authenticate = mockAuthenticate;
    sync = mockSync;
    define = mockDefine;
  }

  return {
    ...actual,
    Sequelize: MockSequelize,
  };
});

import { createDbConnection } from "../src/db";
import { initDb } from "../src/index";
import type { DatabaseConfig } from "../src/interfaces";

import { User } from "../src/models/User";
import { Asset } from "../src/models/Assets";
import { UploadSession } from "../src/models/UploadSession";
import { UploadChunk } from "../src/models/UploadChunk";
import { AssetRendition } from "../src/models/AssetRendition";
import { AssetMetadata } from "../src/models/AssetMetadata";
import { ProcessingJob } from "../src/models/ProcessingJobs";
import { Tag } from "../src/models/Tags";
import { AssetTag } from "../src/models/AssetTags";
import { AssetDownload } from "../src/models/AssetDownload";
import { ShareLink } from "../src/models/ShareLink";

const baseConfig: DatabaseConfig = {
  host: "localhost",
  port: 5432,
  database: "test_db",
  user: "test_user",
  password: "test_pass",
};

describe("createDbConnection", () => {
  it("returns a Sequelize instance", () => {
    const seq = createDbConnection(baseConfig);
    expect(seq).toBeDefined();
    expect(typeof seq.authenticate).toBe("function");
  });

  it("uses console.log as logger when logging is not explicitly false", () => {
    expect(() => createDbConnection({ ...baseConfig })).not.toThrow();
  });

  it("disables logging when logging: false is passed", () => {
    expect(() =>
      createDbConnection({ ...baseConfig, logging: false })
    ).not.toThrow();
  });

  it("uses empty string for password when none is provided", () => {
    const config: DatabaseConfig = { ...baseConfig, password: undefined };
    expect(() => createDbConnection(config)).not.toThrow();
  });
});

describe("DatabaseConfig", () => {
  it("accepts all required fields", () => {
    const cfg: DatabaseConfig = {
      host: "db.example.com",
      port: 5432,
      database: "mydb",
      user: "admin",
    };
    expect(cfg.host).toBe("db.example.com");
    expect(cfg.password).toBeUndefined();
    expect(cfg.logging).toBeUndefined();
  });

  it("accepts optional password and logging fields", () => {
    const cfg: DatabaseConfig = {
      ...baseConfig,
      password: "secret",
      logging: false,
    };
    expect(cfg.password).toBe("secret");
    expect(cfg.logging).toBe(false);
  });
});

describe("initDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.mockResolvedValue(undefined);
    mockSync.mockResolvedValue(undefined);

    const models = [
      User,
      Asset,
      UploadSession,
      UploadChunk,
      AssetRendition,
      AssetMetadata,
      ProcessingJob,
      Tag,
      AssetTag,
      AssetDownload,
      ShareLink,
    ];
    for (const M of models) {
      vi.spyOn(M, "initialize").mockImplementation(() => undefined);
      (M as any).hasMany = vi.fn();
      (M as any).belongsTo = vi.fn();
      (M as any).hasOne = vi.fn();
      (M as any).belongsToMany = vi.fn();
    }
  });

  it("returns an object containing sequelize and all model classes", async () => {
    const result = await initDb(baseConfig);

    expect(result.sequelize).toBeDefined();
    expect(result.User).toBe(User);
    expect(result.Asset).toBe(Asset);
    expect(result.UploadSession).toBe(UploadSession);
    expect(result.UploadChunk).toBe(UploadChunk);
    expect(result.AssetRendition).toBe(AssetRendition);
    expect(result.AssetMetadata).toBe(AssetMetadata);
    expect(result.ProcessingJob).toBe(ProcessingJob);
    expect(result.Tag).toBe(Tag);
    expect(result.AssetTag).toBe(AssetTag);
    expect(result.AssetDownload).toBe(AssetDownload);
    expect(result.ShareLink).toBe(ShareLink);
  });

  it("calls authenticate() on the sequelize instance", async () => {
    await initDb(baseConfig);
    expect(mockAuthenticate).toHaveBeenCalledOnce();
  });

  it("calls initialize() on every model", async () => {
    await initDb(baseConfig);

    const models = [
      User,
      Asset,
      UploadSession,
      UploadChunk,
      AssetRendition,
      AssetMetadata,
      ProcessingJob,
      Tag,
      AssetTag,
      AssetDownload,
      ShareLink,
    ];
    for (const M of models) {
      expect(M.initialize).toHaveBeenCalledOnce();
    }
  });

  it("does NOT call sync() outside development mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    await initDb(baseConfig);
    expect(mockSync).not.toHaveBeenCalled();
    process.env.NODE_ENV = originalEnv;
  });

  it("calls sync({ alter }) in development mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    await initDb(baseConfig);
    expect(mockSync).toHaveBeenCalledWith({ alter: { drop: false } });
    process.env.NODE_ENV = originalEnv;
  });

  it("throws when authenticate() rejects", async () => {
    mockAuthenticate.mockRejectedValue(new Error("cannot connect"));
    await expect(initDb(baseConfig)).rejects.toThrow("cannot connect");
  });
});

describe("Model column declarations", () => {
  it("User has an initialize static method", () => {
    expect(typeof User.initialize).toBe("function");
  });

  it("Asset has an initialize static method", () => {
    expect(typeof Asset.initialize).toBe("function");
  });

  it("UploadSession has an initialize static method", () => {
    expect(typeof UploadSession.initialize).toBe("function");
  });

  it("UploadChunk has an initialize static method", () => {
    expect(typeof UploadChunk.initialize).toBe("function");
  });

  it("AssetRendition has an initialize static method", () => {
    expect(typeof AssetRendition.initialize).toBe("function");
  });

  it("AssetMetadata has an initialize static method", () => {
    expect(typeof AssetMetadata.initialize).toBe("function");
  });

  it("ProcessingJob has an initialize static method", () => {
    expect(typeof ProcessingJob.initialize).toBe("function");
  });

  it("Tag has an initialize static method", () => {
    expect(typeof Tag.initialize).toBe("function");
  });

  it("AssetTag has an initialize static method", () => {
    expect(typeof AssetTag.initialize).toBe("function");
  });

  it("AssetDownload has an initialize static method", () => {
    expect(typeof AssetDownload.initialize).toBe("function");
  });

  it("ShareLink has an initialize static method", () => {
    expect(typeof ShareLink.initialize).toBe("function");
  });
});
