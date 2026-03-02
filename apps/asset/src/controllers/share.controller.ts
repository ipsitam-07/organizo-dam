import { Request, Response, NextFunction } from "express";
import { assetService } from "../services/asset.service";

export class ShareController {
  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assetService.resolveShareLink(
        req.params.token,
        req.body?.password,
        { ip: req.ip, userAgent: req.headers["user-agent"] }
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const shareController = new ShareController();
