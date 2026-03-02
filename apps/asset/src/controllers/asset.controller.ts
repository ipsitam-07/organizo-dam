import { Response, NextFunction, Request } from "express";
import { AuthRequest } from "@repo/auth";
import { assetService } from "../services/asset.service";

export class AssetController {
  async listOfAssets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await assetService.listAssets(
        req.user!.id,
        req.query as any
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getAssetbyID(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.getAsset(req.params.id, req.user!.id);
      res.json({ data: asset });
    } catch (err) {
      next(err);
    }
  }

  async removeAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await assetService.deleteAsset(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const assetController = new AssetController();
