import { Op } from "sequelize";
import {
  Asset,
  AssetMetadata,
  AssetRendition,
  ProcessingJob,
  Tag,
  AssetDownload,
  AssetTag,
  ShareLink,
} from "@repo/database";
import { ListAssetsInput } from "../schemas/asset.schema";

export class AssetRepository {
  //Assets
  async findAll(userId: string, filters: ListAssetsInput) {
    const { page, limit, status, mime_type, tag, date_from, date_to } = filters;
    const offset = (page - 1) * limit;

    const where: any = { user_id: userId };
    if (status) where.status = status;
    if (mime_type) where.mime_type = { [Op.iLike]: `${mime_type}%` };
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = date_from;
      if (date_to) where.created_at[Op.lte] = date_to;
    }

    const tagInclude: any = {
      model: Tag,
      through: { attributes: [] },
      attributes: ["id", "name", "source"],
    };
    if (tag) {
      tagInclude.where = { name: tag.toLowerCase() };
      tagInclude.required = true;
    }

    const { rows, count } = await Asset.findAndCountAll({
      where,
      include: [
        tagInclude,
        {
          model: AssetRendition,
          attributes: [
            "id",
            "label",
            "rendition_type",
            "storage_key",
            "mime_type",
            "width",
            "height",
            "size_bytes",
            "status",
          ],
          where: { label: "thumbnail", status: "ready" },
          required: false,
        },
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
      distinct: true,
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async findByIdAndUser(id: string, userId: string) {
    return Asset.findOne({
      where: { id, user_id: userId },
      include: [
        { model: AssetMetadata },
        { model: AssetRendition, attributes: { exclude: [] } },
        { model: Tag, through: { attributes: [] } },
      ],
    });
  }

  async findRenditions(id: string, userId: string) {
    const asset = await Asset.findOne({
      where: { id, user_id: userId },
      attributes: ["id", "status"],
      include: [
        {
          model: AssetRendition,
          attributes: [
            "id",
            "label",
            "rendition_type",
            "mime_type",
            "width",
            "height",
            "size_bytes",
            "status",
          ],
          where: { status: "ready" },
          required: false,
        },
      ],
    });
    return asset;
  }

  async findById(id: string) {
    return Asset.findByPk(id);
  }

  async updateStatus(assetId: string, status: Asset["status"]) {
    return Asset.update({ status }, { where: { id: assetId } });
  }

  async getProcessingStatus(assetId: string, userId: string) {
    const asset = await Asset.findOne({
      where: { id: assetId, user_id: userId },
      attributes: ["id", "status"],
    });

    if (!asset) return null;

    const jobs = await ProcessingJob.findAll({
      where: { asset_id: assetId },
      attributes: ["id", "job_type", "status", "progress", "error_message"],
    });

    return { asset, jobs };
  }

  //Downloading assets
  async logDownload(data: {
    asset_id: string;
    user_id?: string;
    rendition_id?: string;
    share_link_id?: string;
    ip_address?: string;
    user_agent?: string;
  }) {
    return AssetDownload.create(data);
  }

  async incrementDownloadCount(assetId: string) {
    return Asset.increment("download_count", { where: { id: assetId } });
  }

  //Tags
  async removeTag(assetId: string, tagId: string) {
    return AssetTag.destroy({ where: { asset_id: assetId, tag_id: tagId } });
  }

  async findTagById(tagId: string) {
    return Tag.findByPk(tagId);
  }

  //Admin dashboard
  async getStats() {
    const [totalAssets, totalDownloads, storageResult, jobStats] =
      await Promise.all([
        Asset.count(),
        AssetDownload.count(),
        Asset.sum("size_bytes"),
        ProcessingJob.findAll({
          attributes: [
            "status",
            [Asset.sequelize!.fn("COUNT", Asset.sequelize!.col("id")), "count"],
          ],
          group: ["status"],
          raw: true,
        }),
      ]);

    return {
      totalAssets,
      totalDownloads,
      totalStorageBytes: storageResult ?? 0,
      jobStats,
    };
  }

  //Share links
  async createShareLink(data: {
    asset_id: string;
    created_by: string;
    token: string;
    password_hash?: string;
    max_downloads?: number;
    expires_at?: Date;
  }) {
    return ShareLink.create(data);
  }

  async findShareLinkByToken(token: string) {
    return ShareLink.findOne({ where: { token } });
  }

  async incrementShareLinkDownloads(shareLinkId: string) {
    return ShareLink.increment("download_count", {
      where: { id: shareLinkId },
    });
  }
}

export const assetRepository = new AssetRepository();
