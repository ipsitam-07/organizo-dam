import { NextFunction, Response } from "express";
import { AppError, AuthRequest } from "@repo/auth";
import { uploadService } from "../services/upload.service";
import { logger } from "@repo/logger";

export class UploadController {
  //get seesions of an user
  async getUserSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const sessions = await uploadService.getUserSessions(userId);
      res.status(200).json({ data: sessions });
    } catch (error) {
      next(error);
    }
  }

  //get a session by an id
  async getSessionById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;
      const session = await uploadService.getSessionById(sessionId, userId);

      res.status(200).json({ data: session });
    } catch (error) {
      next(error);
    }
  }

  //cancel an ongoing upload session
  async cancelSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;

      const session = await uploadService.cancelSession(sessionId, userId);

      res
        .status(204)
        .json({ message: "Upload cancelled successfully", data: session });
    } catch (error: any) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
