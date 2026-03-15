import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ListAssetsInput, CreateShareLinkInput } from "../schemas/asset.schema";
import { assetRepository } from "../repo/asset.repo";
import { NotFoundError, ConflictError, AppError } from "@repo/auth";
import { config } from "@repo/config";
import { deleteObject, getPresignedUrl } from "../services/storage.service";
import { logger } from "@repo/logger";
import { attachTag, autoTagAsset } from "./tag.service";

export class AssetService {
  //list of assets
  async listAssets(userId: string, filters: ListAssetsInput) {
    return assetRepository.findAll(userId, filters);
  }

  //get asset by asset id and user id
  async getAsset(assetId: string, userId: string) {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");
    return asset;
  }

  //delete asset
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");

    const renditions = await assetRepository.findAllRenditions(assetId);
    await Promise.all(
      renditions.map((r) =>
        deleteObject(config.minio.buckets.renditions, r.storage_key).catch(
          (err) =>
            logger.warn(
              `[AssetService] Failed to delete rendition "${r.storage_key}" from MinIO: ${err.message}`
            )
        )
      )
    );

    // Delete the original file
    await deleteObject(config.minio.buckets.assets, asset.storage_key);

    // Destroy the DB row
    await asset.destroy();

    logger.info(
      `[AssetService] Deleted asset "${assetId}" (${renditions.length} rendition(s) cleaned up) for user "${userId}"`
    );
  }

  async getDownloadUrl(
    assetId: string,
    userId: string,
    renditionLabel?: string,
    request?: { ip?: string; userAgent?: string }
  ) {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");
    if (asset.status !== "ready")
      throw new ConflictError("Asset is not ready for download");

    let storageKey = asset.storage_key;
    let bucket = config.minio.buckets.assets;
    let renditionId: string | undefined;

    if (renditionLabel) {
      const renditions = (asset as any).AssetRenditions ?? [];
      const rendition = renditions.find(
        (r: any) => r.label === renditionLabel && r.status === "ready"
      );
      if (!rendition)
        throw new NotFoundError(`Rendition "${renditionLabel}" not found`);
      storageKey = rendition.storage_key;
      bucket = config.minio.buckets.renditions;
      renditionId = rendition.id;
    }

    const url = await getPresignedUrl(bucket, storageKey);

    // Log the download
    await assetRepository.logDownload({
      asset_id: assetId,
      user_id: userId,
      rendition_id: renditionId,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
    });
    await assetRepository.incrementDownloadCount(assetId);

    return { url, expiresIn: 900 };
  }

  // Thumbnail presigned URL
  async getThumbnailUrl(
    assetId: string,
    userId: string
  ): Promise<string | null> {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");

    const renditions = (asset as any).AssetRenditions ?? [];
    const thumbnail = renditions.find(
      (r: any) => r.label === "thumbnail" && r.status === "ready"
    );
    if (!thumbnail) return null;

    const url = await getPresignedUrl(
      config.minio.buckets.renditions,
      thumbnail.storage_key,
      3600
    );
    return url;
  }

  // Returns all ready renditions
  async getRenditions(assetId: string, userId: string) {
    const asset = await assetRepository.findRenditions(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");

    const renditions = (asset as any).AssetRenditions ?? [];

    const withUrls = await Promise.all(
      renditions
        .filter((r: any) => r.storage_key)
        .map(async (r: any) => {
          const url = await getPresignedUrl(
            config.minio.buckets.renditions,
            r.storage_key,
            3600
          );
          return {
            id: r.id,
            label: r.label,
            rendition_type: r.rendition_type,
            mime_type: r.mime_type,
            width: r.width,
            height: r.height,
            size_bytes: r.size_bytes,
            status: r.status,
            url,
          };
        })
    );

    return withUrls;
  }

  //Tags
  async addTag(assetId: string, userId: string, tagName: string) {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");
    return attachTag(assetId, tagName, "user", userId);
  }

  async removeTag(assetId: string, userId: string, tagId: string) {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");

    const tag = await assetRepository.findTagById(tagId);
    if (!tag) throw new NotFoundError("Tag not found");

    const deleted = await assetRepository.removeTag(assetId, tagId);
    if (deleted === 0)
      throw new NotFoundError("Tag is not attached to this asset");
  }

  //called by upload service after upload is complete
  async onAssetCreated(assetId: string, mimeType: string): Promise<void> {
    await autoTagAsset(assetId, mimeType);
  }

  //Stats for dashboard
  async getStats() {
    return assetRepository.getStats();
  }

  //Processing status
  async getStatus(assetId: string, userId: string) {
    const result = await assetRepository.getProcessingStatus(assetId, userId);
    if (!result) throw new NotFoundError("Asset not found");
    return result;
  }

  //Share links
  async createShareLink(
    assetId: string,
    userId: string,
    data: CreateShareLinkInput
  ) {
    const asset = await assetRepository.findByIdAndUser(assetId, userId);
    if (!asset) throw new NotFoundError("Asset not found");

    const token = crypto.randomBytes(32).toString("hex");
    const password_hash = data.password
      ? await bcrypt.hash(data.password, 10)
      : undefined;

    const expires_at = data.expires_in_hours
      ? new Date(Date.now() + data.expires_in_hours * 3600 * 1000)
      : undefined;

    return assetRepository.createShareLink({
      asset_id: assetId,
      created_by: userId,
      token,
      password_hash,
      max_downloads: data.max_downloads,
      expires_at,
    });
  }

  async resolveShareLink(
    token: string,
    password?: string,
    request?: { ip?: string; userAgent?: string }
  ) {
    const link = await assetRepository.findShareLinkByToken(token);
    if (!link) throw new NotFoundError("Share link not found");

    if (link.expires_at && link.expires_at < new Date()) {
      throw new AppError("Share link has expired", 410);
    }

    if (link.max_downloads && link.download_count >= link.max_downloads) {
      throw new AppError("Share link download limit reached", 410);
    }

    if (link.password_hash) {
      if (!password) throw new AppError("Password required", 401);
      const valid = await bcrypt.compare(password, link.password_hash);
      if (!valid) throw new AppError("Invalid password", 401);
    }

    const asset = await assetRepository.findById(link.asset_id);
    if (!asset) throw new NotFoundError("Asset not found");

    const url = await getPresignedUrl(
      config.minio.buckets.assets,
      asset.storage_key
    );

    await assetRepository.logDownload({
      asset_id: asset.id,
      share_link_id: link.id,
      ip_address: request?.ip,
      user_agent: request?.userAgent,
    });
    await assetRepository.incrementShareLinkDownloads(link.id);
    await assetRepository.incrementDownloadCount(asset.id);

    return { url, expiresIn: 900, filename: asset.original_filename };
  }
}

export const assetService = new AssetService();
