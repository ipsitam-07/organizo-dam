import { Response, NextFunction, Request } from "express";
import { AuthRequest } from "@repo/auth";
import { assetService } from "../services/asset.service";

export class AssetController {
  //Assets
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

  //download
  async download(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await assetService.getDownloadUrl(
        req.params.id,
        req.user!.id,
        req.query.rendition as string | undefined,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  //tags
  async addTag(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tag = await assetService.addTag(
        req.params.id,
        req.user!.id,
        req.body.name
      );
      res.status(201).json({ data: tag });
    } catch (err) {
      next(err);
    }
  }

  async removeTag(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await assetService.removeTag(
        req.params.id,
        req.user!.id,
        req.params.tagId
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  //Stats
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await assetService.getStats();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  }

  //Status
  async status(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await assetService.getStatus(req.params.id, req.user!.id);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  //Share link create
  async createShareLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await assetService.createShareLink(
        req.params.id,
        req.user!.id,
        req.body
      );
      res.status(201).json({ data: link });
    } catch (err) {
      next(err);
    }
  }
}

export const assetController = new AssetController();
