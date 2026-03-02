import { AppError, NotFoundError, UnauthorizedError } from "@repo/auth";
import { uploadRepository } from "../repo/upload.repo";
import { logger } from "@repo/logger";

export class UploadService {
  //start an upload session
  async initializeSession(
    uploadId: string,
    userId: string,
    metadata: any,
    size: number
  ) {
    logger.info(`[UploadService] Initializing session for TUS ID: ${uploadId}`);
    return await uploadRepository.createUploadSession({
      user_id: userId,
      tus_upload_id: uploadId,
      upload_url: `/api/upload/${uploadId}`,
      original_filename: metadata.filename || "unknown_file",
      mime_type: metadata.filetype || "application/octet-stream",
      total_size_bytes: size || 0,
      status: "initiated",
    });
  }

  //finalize an upload session
  async finalizeUpload(
    uploadId: string,
    userId: string,
    metadata: any,
    size: number
  ) {
    logger.info(`[UploadService] Finalizing upload for TUS ID: ${uploadId}`);
    const session = await uploadRepository.findSessionByTusId(uploadId);

    if (session) {
      await uploadRepository.updateSessionStatus(session, "complete", {
        completed_at: new Date(),
      });
    }

    const newAsset = await uploadRepository.createAsset({
      user_id: userId,
      upload_session_id: session?.id || null,
      original_filename: metadata.filename || "unknown_file",
      storage_key: uploadId,
      mime_type: metadata.filetype || "application/octet-stream",
      size_bytes: size || 0,
      status: "queued",
    });

    return { session, asset: newAsset };
  }

  //get all session of the current user
  async getUserSessions(userId: string) {
    if (!userId) throw new UnauthorizedError("Unauthorized");
    return await uploadRepository.getUserSessions(userId);
  }

  //get seesion by id
  async getSessionById(sessionId: string, userId: string) {
    if (!userId) throw new UnauthorizedError("Unauthorized");
    if (!sessionId) throw new NotFoundError("Session not found or expired");
    return await uploadRepository.findSessionByIdAndUser(sessionId, userId);
  }

  //cancel a session for an user
  async cancelSession(sessionId: string, userId: string) {
    if (!userId) throw new UnauthorizedError("Unauthorized");
    if (!sessionId) throw new NotFoundError("Session not found or expired");
    const session = await uploadRepository.findSessionByIdAndUser(
      sessionId,
      userId
    );

    if (!session) return null;
    if (session.status === "complete") {
      throw new Error("Cannot cancel a completed upload");
    }

    return await uploadRepository.updateSessionStatus(session, "failed");
  }
}

export const uploadService = new UploadService();
