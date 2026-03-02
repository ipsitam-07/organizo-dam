import { createDbConnection } from "./db";
import { DatabaseConfig } from "./interfaces";
import { logger } from "@repo/logger";

import { User } from "./models/User";
import { Asset } from "./models/Assets";
import { UploadSession } from "./models/UploadSession";
import { UploadChunk } from "./models/UploadChunk";
import { AssetRendition } from "./models/AssetRendition";
import { AssetMetadata } from "./models/AssetMetadata";
import { ProcessingJob } from "./models/ProcessingJobs";
import { Tag } from "./models/Tags";
import { AssetTag } from "./models/AssetTags";
import { AssetDownload } from "./models/AssetDownload";
import { ShareLink } from "./models/ShareLink";

export const initDb = async (config: DatabaseConfig) => {
  const sequelize = createDbConnection(config);

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
  models.forEach((model) => model.initialize(sequelize));

  User.hasMany(UploadSession, { foreignKey: "user_id" });
  UploadSession.belongsTo(User, { foreignKey: "user_id" });

  UploadSession.hasMany(UploadChunk, { foreignKey: "upload_session_id" });
  UploadChunk.belongsTo(UploadSession, { foreignKey: "upload_session_id" });

  User.hasMany(Asset, { foreignKey: "user_id" });
  Asset.belongsTo(User, { foreignKey: "user_id" });

  UploadSession.hasOne(Asset, { foreignKey: "upload_session_id" });
  Asset.belongsTo(UploadSession, { foreignKey: "upload_session_id" });

  Asset.hasOne(AssetMetadata, { foreignKey: "asset_id" });
  AssetMetadata.belongsTo(Asset, { foreignKey: "asset_id" });

  Asset.hasMany(AssetRendition, { foreignKey: "asset_id" });
  AssetRendition.belongsTo(Asset, { foreignKey: "asset_id" });

  Asset.hasMany(ProcessingJob, { foreignKey: "asset_id" });
  ProcessingJob.belongsTo(Asset, { foreignKey: "asset_id" });

  AssetRendition.hasOne(ProcessingJob, { foreignKey: "rendition_id" });
  ProcessingJob.belongsTo(AssetRendition, { foreignKey: "rendition_id" });

  Asset.belongsToMany(Tag, { through: AssetTag, foreignKey: "asset_id" });
  Tag.belongsToMany(Asset, { through: AssetTag, foreignKey: "tag_id" });

  Asset.hasMany(AssetDownload, { foreignKey: "asset_id" });
  AssetDownload.belongsTo(Asset, { foreignKey: "asset_id" });

  Asset.hasMany(ShareLink, { foreignKey: "asset_id" });
  ShareLink.belongsTo(Asset, { foreignKey: "asset_id" });

  try {
    await sequelize.authenticate();
    logger.info("[Database] Connection established successfully.");

    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      logger.info("[Database] Schema synchronized.");
    }
  } catch (error) {
    logger.error("[Database] Unable to connect:", { error });
    throw error;
  }

  return {
    sequelize,
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
  };
};

export * from "./db";
export * from "./interfaces";
export * from "./models/User";
export * from "./models/Assets";
export * from "./models/UploadSession";
export * from "./models/UploadChunk";
export * from "./models/AssetRendition";
export * from "./models/AssetMetadata";
export * from "./models/ProcessingJobs";
export * from "./models/Tags";
export * from "./models/AssetTags";
export * from "./models/AssetDownload";
export * from "./models/ShareLink";
