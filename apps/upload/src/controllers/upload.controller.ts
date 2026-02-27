import { Response } from "express";
import { AppError, AuthRequest } from "@repo/auth";
import { uploadService } from "../services/upload.service";
import { logger } from "@repo/logger";

export class UploadController {
  //get seesions of an user
  async getUserSessions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const sessions = await uploadService.getUserSessions(userId);
      res.json({ data: sessions });
    } catch (error) {
      logger.error("[UploadController] Failed to fetch sessions", { error });
      throw new AppError("Internal Server Error", 500);
    }
  }

  //get a session by an id
  async getSessionById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;
      const session = await uploadService.getSessionById(sessionId, userId);

      if (!session) throw new AppError("Session not found", 404);

      res.json({ data: session });
    } catch (error) {
      logger.error("[UploadController] Failed to fetch session", { error });
      throw new AppError("Internal Server Error", 500);
    }
  }

  async cancelSession(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.id;

      const session = await uploadService.cancelSession(sessionId, userId);

      if (!session) throw new AppError("Session not found", 404);

      res.json({ message: "Upload cancelled successfully", data: session });
    } catch (error: any) {
      logger.error("[UploadController] Failed to cancel session", {
        error: error.message,
      });
      throw new AppError("Bad Request", 400);
    }
  }
}

export const uploadController = new UploadController();
