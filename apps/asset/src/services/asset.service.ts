import { ListAssetsInput } from "../schemas/asset.schema";
import { assetRepository } from "../repo/asset.repo";
import { NotFoundError, ConflictError } from "@repo/auth";
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

    // Delete original
    await deleteObject(config.minio.buckets.chunks, asset.storage_key);

    // Destroy the DB row
    await asset.destroy();

    logger.info(
      `[AssetService] Deleted asset "${assetId}" for user "${userId}"`
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
    let bucket = config.minio.buckets.chunks;
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
}

export const assetService = new AssetService();
