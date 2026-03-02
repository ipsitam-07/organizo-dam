import { ListAssetsInput } from "../schemas/asset.schema";
import { assetRepository } from "../repo/asset.repo";
import { NotFoundError } from "@repo/auth";
import { config } from "@repo/config";
import { deleteObject } from "../services/storage.service";
import { logger } from "@repo/logger";

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
}

export const assetService = new AssetService();
